import { REQUEST_SPOTS, RECEIVE_SPOTS } from '../actions'

let initialState = {
  isFetching: false,
  items: []
};

export default function spots(state = initialState, action) {
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
