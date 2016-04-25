import fetch from 'isomorphic-fetch'
import {moves as fakeMoves} from '../fake-data';

export const REQUEST_MOVES = 'REQUEST_MOVES'
export const RECEIVE_MOVES = 'RECEIVE_MOVES'
export const REQUEST_SPOTS = 'REQUEST_SPOTS'
export const RECEIVE_SPOTS = 'RECEIVE_SPOTS'

function requestSpots(){
  return {
    type: REQUEST_SPOTS
  }
}

function receiveSpots(json){
  return {
    type: RECEIVE_SPOTS,
    spots: json
  }
}

function fetchSpots() {
  return dispatch => {
    dispatch(requestSpots())
    return fetch('/json/spots/')
      .then(response => response.json())
      .then(json => {
        dispatch(receiveSpots(json.results))
      })
  }
}

function shouldFetchSpots(state) {
  return !state.spots.items && !state.spots.isFetching;
}

export function fetchSpotsIfNeeded() {
  return (dispatch, getState) => {
    if (shouldFetchSpots(getState())) {
      return dispatch(fetchSpots())
    }
  }
}


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
    return fetch('/json/moves/')
      .then(response => response.json())
      .then(json => dispatch(receiveMoves(fakeMoves)))
  }
}

function shouldFetchMoves(state) {
  return !state.moves.items && !state.moves.isFetching;
}

export function fetchMovesIfNeeded() {
  return (dispatch, getState) => {
    if (shouldFetchMoves(getState())) {
      return dispatch(fetchMoves())
    }
  }
}
