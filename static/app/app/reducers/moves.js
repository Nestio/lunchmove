import {
  REQUEST_MOVES, RECEIVE_MOVES
} from '../actions'

let initialState = {
  isFetching: false,
  items: []
};

export default function moves(state = initialState, action) {
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
