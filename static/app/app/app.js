import 'babel-polyfill'
import 'assets/sass/styles.scss';

import { browserHistory } from 'react-router'
import { syncHistoryWithStore } from 'react-router-redux'
import React from 'react'
import { render } from 'react-dom'
import Root from './containers/Root'
import configureStore from './configureStore'

const store = configureStore()
const history = syncHistoryWithStore(browserHistory, store)

render(
  <Root store={store} history={history} />,
  document.getElementById('app')
)
