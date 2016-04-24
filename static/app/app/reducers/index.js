import { combineReducers } from 'redux'
import {REQUEST_MOVES, RECEIVE_MOVES} from './actions'

function moves(state = {
  isFetching: false,
  items: null
}, action) {
  switch (action.type) {
    case REQUEST_MOVES:
      return Object.assign({}, state, {
        isFetching: true
      })
    case RECEIVE_POSTS:
      return Object.assign({}, state, {
        isFetching: false,
        items: action.moves
      })
    default:
      return state
  }
}

const rootReducer = combineReducers({
  moves
})

export default rootReducer
