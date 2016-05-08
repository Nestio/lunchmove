import { UPDATE_MOVE } from '../actions'

let initialState = lunchmove.recent_move || {};

export default function recentMove(state = initialState, action){
  switch (action.type) {
    case UPDATE_MOVE:
      return Object.assign({}, state, action.move);
    default:
      return state;
  }
}
