import React, { useEffect, lazy, Suspense, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import routes from 'routes'
import { useDispatch, useSelector } from 'react-redux'
import { useAlert } from 'react-alert'
import cx from 'clsx'
import _some from 'lodash/some'
import _includes from 'lodash/includes'
import 'dayjs/locale/ru'
import 'dayjs/locale/uk'
import Header from 'components/Header'
import Footer from 'components/Footer'
import Loader from 'ui/Loader'
import ScrollToTop from 'hoc/ScrollToTop'
import Selfhosted from 'hoc/Selfhosted'
import { getAccessToken } from 'utils/accessToken'
import { authMe } from './api'
import { authActions } from 'redux/actions/auth'
import { errorsActions } from 'redux/actions/errors'
import { alertsActions } from 'redux/actions/alerts'

const MainPage = lazy(() => import('pages/MainPage'))
const SignUp = lazy(() => import('pages/Auth/Signup'))
const SignIn = lazy(() => import('pages/Auth/Signin'))
const ForgotPassword = lazy(() => import('pages/Auth/ForgotPassword'))
const CreateNewPassword = lazy(() => import('pages/Auth/CreateNewPassword'))
const Dashboard = lazy(() => import('pages/Dashboard'))
const Contact = lazy(() => import('pages/Contact'))
const Docs = lazy(() => import('pages/Docs'))
const Features = lazy(() => import('pages/Features'))
const UserSettings = lazy(() => import('pages/UserSettings'))
const VerifyEmail = lazy(() => import('pages/Auth/VerifyEmail'))
const ProjectSettings = lazy(() => import('pages/Project/Settings'))
const ViewProject = lazy(() => import('pages/Project/View'))
const Billing = lazy(() => import('pages/Billing'))
const Privacy = lazy(() => import('pages/Privacy'))
const Terms = lazy(() => import('pages/Terms'))

const minimalFooterPages = [
  '/projects', '/dashboard', '/settings', '/contact',
]

const Fallback = ({ isMinimalFooter }) => {
  const [showLoader, setShowLoader] = useState(false)

  useEffect(() => {
    setTimeout(() => setShowLoader(true), 1000)
  }, [])

  return (
    <div className={cx('bg-gray-50 dark:bg-gray-800', { 'min-h-page': !isMinimalFooter, 'min-h-min-footer': isMinimalFooter })}>
      {showLoader && (
        <Loader />
      )}
    </div>
  )
}

const App = () => {
  const dispatch = useDispatch()
  const location = useLocation()
  const alert = useAlert()
  const { loading, authenticated } = useSelector(state => state.auth)
  const { theme } = useSelector(state => state.ui.theme)
  const { error } = useSelector(state => state.errors)
  const { message, type } = useSelector(state => state.alerts)
  const accessToken = getAccessToken()

  useEffect(() => {
    (async () => {
      if (accessToken && !authenticated) {
        try {
          const me = await authMe()

          dispatch(authActions.loginSuccess(me))
          dispatch(authActions.finishLoading())
        } catch (e) {
          dispatch(authActions.logout())
        }
      }
    })()
  }, [dispatch, accessToken, authenticated])

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
        <Suspense fallback={<></>}>
          <Header authenticated={authenticated} theme={theme} />
          <ScrollToTop>
            <Selfhosted>
              <Suspense fallback={<Fallback theme={theme} isMinimalFooter={isMinimalFooter} />}>
                <Routes>
                  <Route path={routes.main} element={<MainPage/>} />
                  <Route path={routes.signin} element={<SignIn/>} />
                  <Route path={routes.signup} element={<SignUp/>} />
                  <Route path={routes.dashboard} element={<Dashboard/>} />
                  <Route path={routes.user_settings} element={<UserSettings/>} />
                  <Route path={routes.verify} element={<VerifyEmail/>} />
                  <Route path={routes.change_email} element={<VerifyEmail/>} />
                  <Route path={routes.reset_password} element={<ForgotPassword/>} />
                  <Route path={routes.new_password_form} element={<CreateNewPassword/>} />
                  <Route path={routes.new_project} element={<ProjectSettings/>} />
                  <Route path={routes.project_settings} element={<ProjectSettings/>} />
                  <Route path={routes.project} element={<ViewProject/>} />
                  <Route path={routes.billing} element={<Billing/>} />
                  <Route path={routes.docs} element={<Docs/>} />
                  <Route path={routes.contact} element={<Contact/>} />
                  <Route path={routes.features} element={<Features/>} />
                  <Route path={routes.privacy} element={<Privacy/>} />
                  <Route path={routes.terms} element={<Terms/>} />
                </Routes>
              </Suspense>
            </Selfhosted>
          </ScrollToTop>
          <Footer minimal={isMinimalFooter} authenticated={authenticated} />
        </Suspense>
    )
  )
}

export default App
