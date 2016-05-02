import { combineReducers } from 'redux'
import { routerReducer as routing } from 'react-router-redux'
import {
  REQUEST_MOVES, RECEIVE_MOVES,
  REQUEST_SPOTS, RECEIVE_SPOTS,
  UPDATE_MOVE
} from '../actions'

function recentMove(state = {}, action){
  switch (action.type) {
    case UPDATE_MOVE:
      return Object.assign({}, state, action.move);
    default:
      return state;
  }
}

function moves(state = {
  isFetching: false,
  items: null
}, action) {
  switch (action.type) {
    case REQUEST_MOVES:
      return Object.assign({}, state, {
        isFetching: true
      })
    case RECEIVE_MOVES:
      return Object.assign({}, state, {
        isFetching: false,
        items: action.moves
      })
    default:
      return state
  }
}

function spots(state = {
  isFetching: false,
  items: null
}, action) {
  switch (action.type) {
    case REQUEST_SPOTS:
      return Object.assign({}, state, {
        isFetching: true
      })
    case RECEIVE_SPOTS:
      return Object.assign({}, state, {
        isFetching: false,
        items: action.spots
      })
    default:
      return state
  }
}

const rootReducer = combineReducers({
  moves,
  spots,
  recentMove,
  routing
})

export default rootReducer
