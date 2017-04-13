/* @flow */

import React, { Component } from 'react';
import { View, Text, TextInput } from 'react-native';

import { store, observable } from '../lib/index';
import { Provider, inject, observer } from '../lib/react';

@store
class Xyz {

  @observable abc = 'default';
  @observable cba = 'default2';

  get sum() {
    return `SUM = ${this.cba}`;
  }
}

const aStore = new Xyz;
const stores = {
  a: aStore,
};

setTimeout(() => aStore.abc = 'timeout1', 1000);
setTimeout(() => aStore.cba = 'timeout2', 2000);
setTimeout(() => aStore.abc = 'timeout3', 5000);

export default class Test extends Component {

  render() {
    return (
      <Provider {...stores}>
        <TestChild />
      </Provider>
    );
  }
}

type TProps = {
  a: Xyz;
}

@inject('a')
@observer
class TestChild extends Component {

  props: TProps;

  render() {
    return (
      <View>
        <Text>{this.props.a.abc}</Text>
        <Text>{this.props.a.sum}</Text>
        <TestInput />
      </View>
    );
  }
}

@inject('a')
class TestInput extends Component {

  props: TProps;

  render() {
    return (
      <TextInput
        onChangeText={(value) => this.props.a.abc = value}
        style={{ height: 40 }}
        placeholder="Test"
      />
    );
  }
}

