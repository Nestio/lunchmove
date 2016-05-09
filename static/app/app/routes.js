import React from 'react'
import { Route, IndexRoute } from 'react-router'
import App from './containers/Root'
import ListPage from './containers/List'
import EditPage from './containers/Edit'
import JoinPage from './containers/JoinMove'

export default (
  <Route path="/" component={App}>
    <IndexRoute component={ListPage}/>
    <Route path="/edit" component={EditPage} />
    <Route path="/move/:id/join" component={JoinPage} />
  </Route>
)
