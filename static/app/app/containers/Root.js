import React, { Component } from 'react'
import { Provider } from 'react-redux'
import configureStore from '../configureStore'
import ListContainer from './List'
import {spots, moves} from '../fake-data'

let initialState = {
  spots: {
    isFetching: false,
    items: null
  },
  moves: {
    isFetching: false,
    items: null
  },
  recentMove: lunchmove.recent_move
}

const store = configureStore(initialState)

export default class Root extends Component {
  render() {
    return (
      <Provider store={store}>
        <ListContainer />
      </Provider>
    )
  }
}
