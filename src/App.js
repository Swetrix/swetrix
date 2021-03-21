import React from 'react'
import { Switch, Route, Redirect } from 'react-router-dom'
import routes from 'routes'

import MainPage from 'pages/MainPage'

export default () => {
  return (
    <Switch>
      <Route path={routes.signin} component={<></>} exact />
      <Route path={routes.signup} component={<></>} exact />
      <Route path={routes.main} component={MainPage} exact />
      <Redirect to={routes.main} />
    </Switch>
  )
}