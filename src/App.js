import React, { useEffect } from 'react'
import { Switch, Route, Redirect } from 'react-router-dom'
import routes from 'routes'
import { useDispatch, useSelector } from 'react-redux'
import { useAlert } from 'react-alert'

import Header from 'components/Header'
import MainPage from 'pages/MainPage'
import SignUp from 'pages/Auth/Signup'
import SignIn from 'pages/Auth/Signin'
import ForgotPassword from 'pages/Auth/ForgotPassword'
import CreateNewPassword from 'pages/Auth/CreateNewPassword'
import Dashboard from 'pages/Dashboard'
import UserSettings from 'pages/UserSettings'
import VerifyEmail from 'pages/Auth/VerifyEmail'
import NewProject from 'pages/Project/Create'
import ViewProject from 'pages/Project/View'

import { isAuthenticated, notAuthenticated } from './hoc/protected'
import { getAccessToken } from 'utils/accessToken'
import { authMe } from './api'
import { authActions } from 'actions/auth'
import { errorsActions } from 'actions/errors'
import { alertsActions } from 'actions/alerts'

const ProtectedSignIn = notAuthenticated(SignIn)
const ProtectedSignUp = notAuthenticated(SignUp)
const ProtectedForgotPassword = notAuthenticated(ForgotPassword)
const ProtectedNewPasswordForm = notAuthenticated(CreateNewPassword)
const ProtectedDashboard = isAuthenticated(Dashboard)
const ProtectedUserSettings = isAuthenticated(UserSettings)
const ProtectedNewProject = isAuthenticated(NewProject)
const ProtectedViewProject = isAuthenticated(ViewProject)

const App = () => {
  const dispatch = useDispatch()
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
  }, [error])

  useEffect(() => {
    if (message && type) {
      alert.show(message.toString(), {
        type,
        onClose: () => {
          dispatch(alertsActions.clearAlerts())
        }
      })
    }
  }, [message, type])

  return (
    (!accessToken || !loading) && (
      <>
        <Header authenticated={authenticated} />
        <Switch>
          <Route path={routes.main} component={MainPage} exact />
          <Route path={routes.signin} component={ProtectedSignIn} exact />
          <Route path={routes.signup} component={ProtectedSignUp} exact />
          <Route path={routes.dashboard} component={ProtectedDashboard} exact />
          <Route path={routes.user_settings} component={ProtectedUserSettings} exact />
          <Route path={routes.verify} component={VerifyEmail} exact />
          <Route path={routes.change_email} component={VerifyEmail} exact />
          <Route path={routes.reset_password} component={ProtectedForgotPassword} exact />
          <Route path={routes.new_password_form} component={ProtectedNewPasswordForm} exact />
          <Route path={routes.new_project} component={ProtectedNewProject} exact />
          <Route path={routes.project_settings} component={ProtectedNewProject} exact />
          <Route path={routes.project} component={ProtectedViewProject} exact />
          <Redirect to={routes.main} />
        </Switch>
      </>
    )
  )
}

export default App