import React, { useEffect } from 'react'
import { Switch, Route, Redirect, useLocation } from 'react-router-dom'
import routes from 'routes'
import { useDispatch, useSelector } from 'react-redux'
import { useAlert } from 'react-alert'
import _some from 'lodash/some'
import _includes from 'lodash/includes'

import Header from 'components/Header'
import Footer from 'components/Footer'
import MainPage from 'pages/MainPage'
import SignUp from 'pages/Auth/Signup'
import SignIn from 'pages/Auth/Signin'
import ForgotPassword from 'pages/Auth/ForgotPassword'
import CreateNewPassword from 'pages/Auth/CreateNewPassword'
import Dashboard from 'pages/Dashboard'
import Docs from 'pages/Docs'
import Features from 'pages/Features'
import UserSettings from 'pages/UserSettings'
import VerifyEmail from 'pages/Auth/VerifyEmail'
import ProjectSettings from 'pages/Project/Settings'
import ViewProject from 'pages/Project/View'
import Billing from 'pages/Billing'
import Privacy from 'pages/Privacy'
import Terms from 'pages/Terms'

import ScrollToTop from 'hoc/ScrollToTop'
import { isAuthenticated, notAuthenticated } from './hoc/protected'
import { getAccessToken } from 'utils/accessToken'
import { authMe } from './api'
import { authActions } from 'redux/actions/auth'
import { errorsActions } from 'redux/actions/errors'
import { alertsActions } from 'redux/actions/alerts'

const ProtectedMain = notAuthenticated(MainPage)
const ProtectedBilling = isAuthenticated(Billing)
const ProtectedSignIn = notAuthenticated(SignIn)
const ProtectedSignUp = notAuthenticated(SignUp)
const ProtectedForgotPassword = notAuthenticated(ForgotPassword)
const ProtectedNewPasswordForm = notAuthenticated(CreateNewPassword)
const ProtectedDashboard = isAuthenticated(Dashboard)
const ProtectedUserSettings = isAuthenticated(UserSettings)
const ProtectedProjectSettings = isAuthenticated(ProjectSettings)
const ProtectedViewProject = isAuthenticated(ViewProject)

const minimalFooterPages = [
  '/projects', '/dashboard', '/settings',
]

const App = () => {
  const dispatch = useDispatch()
  const location = useLocation()
  const alert = useAlert()
  const { loading, authenticated } = useSelector(state => state.auth)
  const { error } = useSelector(state => state.errors)
  const { message, type } = useSelector(state => state.alerts)
  const accessToken = getAccessToken()

  useEffect(() => {
    (async () => {
      if (accessToken) {
        try {
          const me = await authMe()

          dispatch(authActions.loginSuccess(me))
          dispatch(authActions.finishLoading())
        } catch (e) {
          dispatch(authActions.logout())
        }
      }
    })()
  }, [dispatch, accessToken])

  useEffect(() => {
    if (error) {
      alert.error(error.toString(), {
        onClose: () => {
          dispatch(errorsActions.clearErrors())
        }
      })
    }
  }, [error]) // eslint-disable-line

  useEffect(() => {
    if (message && type) {
      alert.show(message.toString(), {
        type,
        onClose: () => {
          dispatch(alertsActions.clearAlerts())
        }
      })
    }
  }, [message, type]) // eslint-disable-line

  const isMinimalFooter = _some(minimalFooterPages, (page) => _includes(location.pathname, page))

  return (
    (!accessToken || !loading) && (
      <>
        <Header authenticated={authenticated} />
        <ScrollToTop>
          <Switch>
            <Route path={routes.main} component={ProtectedMain} exact />
            <Route path={routes.signin} component={ProtectedSignIn} exact />
            <Route path={routes.signup} component={ProtectedSignUp} exact />
            <Route path={routes.dashboard} component={ProtectedDashboard} exact />
            <Route path={routes.user_settings} component={ProtectedUserSettings} exact />
            <Route path={routes.verify} component={VerifyEmail} exact />
            <Route path={routes.change_email} component={VerifyEmail} exact />
            <Route path={routes.reset_password} component={ProtectedForgotPassword} exact />
            <Route path={routes.new_password_form} component={ProtectedNewPasswordForm} exact />
            <Route path={routes.new_project} component={ProtectedProjectSettings} exact />
            <Route path={routes.project_settings} component={ProtectedProjectSettings} exact />
            <Route path={routes.project} component={ProtectedViewProject} exact />
            <Route path={routes.billing} component={ProtectedBilling} exact />
            <Route path={routes.docs} component={Docs} exact />
            <Route path={routes.features} component={Features} exact />
            <Route path={routes.privacy} component={Privacy} exact />
            <Route path={routes.terms} component={Terms} exact />
            <Redirect to={routes.main} />
          </Switch>
        </ScrollToTop>
        <Footer minimal={isMinimalFooter} />
      </>
    )
  )
}

export default App
