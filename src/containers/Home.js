/* @flow */

import React, { Component } from 'react';
import { FlatList } from 'react-native';
import { observer, inject } from 'mobx-react';
import styled from 'styled-components/native';
import debounce from 'lodash.debounce';

import Test from '../components/Test';
import SearchInput from '../components/SearchInput';
import ListItem from '../components/ListItem';

import type { SearchStore } from '../types';

type Props = {
  searchStore: SearchStore;
};

const Container = styled.View`
  margin: 15;
`;

@inject('searchStore')
@observer
export default class Home extends Component {
  props: Props;

  static navigationOptions = {
    title: 'Spotify songs',
  }

  _debouncedInput = debounce((query) => {
    this.props.searchStore.getTrackList(query);
  }, 500);

  render() {
    return (
      <Container>
        <Test />
        <SearchInput
          onChangeText={this._debouncedInput}
          placeholder="Search..."
        />
        {this.props.searchStore.tracks && (
          <FlatList
            data={this.props.searchStore.tracks}
            keyExtractor={(_, i) => i}
            renderItem={({ item }) => (
              <ListItem
                imageUrl={item.album.images[0].url && item.album.images[0].url}
                songName={item.name}
              />
            )}
          />
        )}
      </Container>
    );
  }
}
