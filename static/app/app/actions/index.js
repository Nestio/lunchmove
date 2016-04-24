import fetch from 'isomorphic-fetch'

export const REQUEST_MOVES = 'REQUEST_MOVES'
export const RECEIVE_MOVES = 'RECEIVE_MOVES'

function requestMoves() {
  return {
    type: REQUEST_MOVES
  }
}

function receiveMoves(json) {
  return {
    type: RECEIVE_MOVES,
    moves: json
  }
}

function fetchMoves() {
  return dispatch => {
    dispatch(requestMoves())
    return fetch('/moves')
      .then(response => response.json())
      .then(json => dispatch(receiveMoves(json)))
  }
}

function shouldFetchMoves(state) {
  if (!state.moves.items) {
    return true
  } else if (state.moves.isFetching) {
    return false
  }
}

export function fetchMovesIfNeeded() {
  return (dispatch, getState) => {
    if (shouldFetchMoves(getState())) {
      return dispatch(fetchMoves())
    }
  }
}
