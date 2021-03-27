import React from 'react'
import { Switch, Route, Redirect } from 'react-router-dom'
import routes from 'routes'

import Header from 'components/Header'
import MainPage from 'pages/MainPage'
import SignUp from 'pages/Auth/Signup'
import SignIn from 'pages/Auth/Signin'

export default () => {
  return (
    <>
      <Header />
      <Switch>
        <Route path={routes.signin} component={SignIn} exact />
        <Route path={routes.signup} component={SignUp} exact />
        <Route path={routes.main} component={MainPage} exact />
        <Redirect to={routes.main} />
      </Switch>
    </>
  )
}