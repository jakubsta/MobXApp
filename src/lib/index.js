
const listeners = new WeakMap();

let depsDetecting = false;
let deps = [];

function subscribe(store, property, listener) {
  if (!listeners.has(store)) {
    listeners.set(store, {});
  }

  const storedListeners = listeners.get(store);
  if (storedListeners[property]) {
    storedListeners[property].push(listener);
  } else {
    storedListeners[property] = [listener];
  }
}

function subscribeMultiple(deps, listener) {
  deps.forEach(({ store, key }) => {
    subscribe(store, key, listener);
  });
}

function unsubscribe(store, property, listener) {
  if (!listeners.has(store)) {
    return;
  }

  const storedListeners = listeners.get(store);
  if (storedListeners[property]) {
    storedListeners[property] = storedListeners.filter((f) => f !== listener);
  }
}

function unsubscribeMultiple(deps, listener) {
  deps.forEach(({ store, key }) => {
    unsubscribe(store, key, listener);
  });
}

function emit(store, property) {
  if (listeners.has(store)) {
    const storeListeners = listeners.get(store);
    if (storeListeners[property]) {
      storeListeners[property].forEach(Reflect.apply);
    }
  }
}

function getFunctionDeps(f) {
  const prevDeps = deps;
  const prevDepsDetecting = depsDetecting;
  deps = [];
  depsDetecting = true;
  f();

  const newDeps = deps;

  deps = prevDeps;
  depsDetecting = prevDepsDetecting;

  return newDeps;
}

function isGetter(target, key) {
  const descriptor = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(target),
    key,
  );
  return descriptor && !!descriptor.get;
}

function getGetter(target, key) {
  const descriptor = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(target),
    key,
  );
  return descriptor.get.bind(target);
}

export function notify(f, callback) {
  const deps = getFunctionDeps(f);
  subscribeMultiple(deps, callback);

  return () => {
    unsubscribeMultiple(deps, callback);
  };
}

export function autorun(f) {
  const deps = getFunctionDeps(f);
  subscribeMultiple(deps, f);

  return () => {
    unsubscribeMultiple(deps, f);
  };
}

export function store(target) {
  function reactiveStore(...args) {
    const instance = target.apply(this, args);

    const proxyToInstance = new Proxy(instance || this, {
      set(target, key, value) {
        target[key] = value;
        emit(target, key);
      },
      get(target, key) {
        if (depsDetecting) {
          deps.push({ store: target, key });
        }

        if (!isGetter(target, key)) {
          return target[key];
        }

        // Important pass proxy to spy!
        const getter = getGetter(proxyToInstance, key);
        if (depsDetecting) {
          notify(
            getter,
            () => {
              console.log('UPDATE CACHE');
              target[Symbol.for(key)] = getter();
              emit(target, key);
            },
          );

          const prevDepsDetecting = depsDetecting;
          depsDetecting = false;
          const returnValue = getter();
          depsDetecting = prevDepsDetecting;
          target[Symbol.for(key)] = returnValue;

          return returnValue;
        }

        return target[Symbol.for(key)];
      },
    });

    return proxyToInstance;
  }

  reactiveStore.prototype = target.prototype;

  return reactiveStore;
}

