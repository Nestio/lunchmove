import React, { Component } from 'react'
import { Provider } from 'react-redux'
import configureStore from '../configureStore'
import List from '../components/LunchMoves'

let initialState = [
    {
        name: 'Dos Toros',
        hasOwnMove: false,
        moves: [
            {
                user: 'John',
                time: "2016-03-17T01:34:27+00:00",
                isOwnMove: false
            },
            {
                user: 'Peter',
                time: "2016-03-17T01:44:27+00:00",
                isOwnMove: false
            }
        ]

    },
    {
        name: 'Halal',
        hasOwnMove: false,
        moves: [
        {
            user: 'John',
            time: "2016-03-17T01:34:27+00:00",
            isOwnMove: false
        },
        {
            user: 'Peter',
            time: "2016-03-17T01:44:27+00:00",
            isOwnMove: false
        }
        ]
    },
    {
        name: 'Dil-e Punjab',
        hasOwnMove: true,
        moves: [
            {
                user: 'John',
                time: "2016-03-17T01:34:27+00:00",
                isOwnMove: false
            },
            {
                user: 'Peter',
                time: "2016-03-17T01:44:27+00:00",
                isOwnMove: true
            }
        ]
    }
];

const store = configureStore(initialState)

export default class Root extends Component {
  render() {
    return (
      <Provider store={store}>
        <List spots={initialState} />
      </Provider>
    )
  }
}
