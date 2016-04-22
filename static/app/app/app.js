import 'babel-polyfill'
import 'assets/sass/styles.scss';

import React from 'react'
import { render } from 'react-dom'
import Root from './containers/Root'

render(
  <Root />,
  document.getElementById('app')
)
