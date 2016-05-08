import {
  REQUEST_MOVES, RECEIVE_MOVES, UPDATE_MOVE
} from '../actions'

let initialState = {
  isFetching: false,
  items: null
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
    case UPDATE_MOVE:
      return updateMove(state, action);
    default:
      return state
  }
}
