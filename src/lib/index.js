
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
    storedListeners[property] = storedListeners[property]
      .filter((f) => f !== listener);
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

function getFunctionDepsAndReturnValue(f) {
  const prevDeps = deps;
  const prevDepsDetecting = depsDetecting;
  deps = [];
  depsDetecting = true;
  const value = f();

  const newDeps = deps;

  deps = prevDeps;
  depsDetecting = prevDepsDetecting;

  return {
    deps: newDeps,
    returnValue: value,
  };
}

function getFunctionDeps(f) {
  return getFunctionDepsAndReturnValue(f).deps;
}

function isGetter(target, key) {
  return !!getGetter(target, key);
}

function getGetter(target, key) {
  const descriptor = Object.getOwnPropertyDescriptor(target, key);

  if (descriptor) {
    return descriptor.get;
  }

  const targetPrototype = Object.getPrototypeOf(target);
  if (targetPrototype === null) {
    return undefined;
  }

  return getGetter(targetPrototype, key);
}

function areTheSameDeps(deps0, deps1) {
  return deps0 === deps1;
}

function smartNotify(f, callback) {
  const { deps, returnValue } = getFunctionDepsAndReturnValue(f);

  const resubscriber = () => {
    const { deps: newDeps, returnValue } = getFunctionDepsAndReturnValue(f);
    if (!areTheSameDeps(deps, newDeps)) {
      unsubscribeMultiple(deps, resubscriber);
      subscribeMultiple(newDeps, resubscriber);
    }

    callback(returnValue);
  };

  subscribeMultiple(deps, resubscriber);

  return returnValue;
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
  return class extends target {
    constructor(...args) {
      super(...args);

      const proxyToInstance = new Proxy(this, {
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
          const getter = getGetter(target, key).bind(proxyToInstance);
          if (depsDetecting) {
            const returnValue = smartNotify(
              getter,
              (value) => {
                target[Symbol.for(key)] = value;
                emit(target, key);
              },
            );
            target[Symbol.for(key)] = returnValue;
          }

          return target[Symbol.for(key)];
        },
      });

      return proxyToInstance;
    }
  };
}

