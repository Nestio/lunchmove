import React, { Component } from 'react'
import { Provider } from 'react-redux'
import configureStore from '../configureStore'
import ListContainer from './List'
import {spots, moves} from '../fake-data'

let initialState = {
  spots: spots,
  moves: {
    isFetching: false,
    items: moves
  }
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
