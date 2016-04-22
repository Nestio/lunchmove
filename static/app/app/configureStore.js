import { createStore, applyMiddleware } from 'redux'
import thunkMiddleware from 'redux-thunk'

var reducer = function(state){
    return state
};

export default function configureStore(initialState) {
  return createStore(
    reducer,
    initialState,
    applyMiddleware(
      thunkMiddleware
    )
  )
}
