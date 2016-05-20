import { REQUEST_SPOTS, RECEIVE_SPOTS } from '../actions'

let initialState = {
  haveFetched: false,
  items: []
};

export default function spots(state = initialState, action) {
  switch (action.type) {
    case REQUEST_SPOTS:
      return Object.assign({}, state, {
        haveFetched: false
      })
    case RECEIVE_SPOTS:
      return Object.assign({}, state, {
        haveFetched: true,
        items: action.spots
      })
    default:
      return state
  }
}
