import { combineReducers } from 'redux'
import { routerReducer as routing } from 'react-router-redux'
import {reducer as formReducer} from 'redux-form';
import moves from './moves';
import recentMove from './recentMove';
import spots from './spots';


const rootReducer = combineReducers({
  moves,
  spots,
  recentMove,
  routing,
  form: formReducer
})

export default rootReducer
