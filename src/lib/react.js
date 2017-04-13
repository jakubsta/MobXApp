// ToDo observer

import React, { PureComponent, Children, PropTypes } from 'react';

import { notify } from './index';

export function observer(target) {
  function observerTarget(...args) {
    const instance = target.apply(this, args) || this;

    notify(
      instance.render.bind(instance),
      () => {
        instance.forceUpdate();
      },
    );

    return instance;
  }

  observerTarget.prototype = target.prototype;
  return observerTarget;
}

type TProps = {
  children: any;
}

export class Provider extends PureComponent {

  static childContextTypes = {
    stores: PropTypes.object.isRequired,
  };

  props: TProps;

  constructor(props) {
    super(props);
    this._context = { ...props, children: undefined };
  }

  getChildContext() {
    return { stores: this._context };
  }

  render() {
    return Children.only(this.props.children);
  }
}

export function inject(...storesNames) {
  return function (Target) {
    return class extends PureComponent {
      static displayName = `${storesNames.join(', ')}->(${Target.name})`;
      static contextTypes = {
        stores: PropTypes.object.isRequired,
      };

      constructor(props, context) {
        super(props, context);
        this._stores = storesNames.reduce((memo, key) => ({
          ...memo,
          [key]: context.stores[key],
        }), {});
      }

      render() {
        return <Target {...this._stores} />;
      }
    };
  };
}

