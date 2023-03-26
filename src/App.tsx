import React, {
  useEffect, lazy, Suspense, useState,
} from 'react'
import { Switch, Route, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
// @ts-ignore
import { useAlert } from '@blaumaus/react-alert'
// import Snowfall from 'react-snowfall'
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
import {
  isSelfhosted, // THEME_TYPE,
} from 'redux/constants'
import { getAccessToken } from 'utils/accessToken'
import { authActions } from 'redux/reducers/auth'
import { errorsActions } from 'redux/reducers/errors'
import { alertsActions } from 'redux/reducers/alerts'
import { StateType, useAppDispatch } from 'redux/store'
import UIActions from 'redux/reducers/ui'

import routes from 'routes'
import { getRefreshToken } from 'utils/refreshToken'
import { authMe } from './api'

const MainPage = lazy(() => import('pages/MainPage'))
const SignUp = lazy(() => import('pages/Auth/Signup'))
const SignIn = lazy(() => import('pages/Auth/Signin'))
const ForgotPassword = lazy(() => import('pages/Auth/ForgotPassword'))
const CreateNewPassword = lazy(() => import('pages/Auth/CreateNewPassword'))
const Dashboard = lazy(() => import('pages/Dashboard'))
const Contact = lazy(() => import('pages/Contact'))
const Features = lazy(() => import('pages/Features'))
const UserSettings = lazy(() => import('pages/UserSettings'))
const VerifyEmail = lazy(() => import('pages/Auth/VerifyEmail'))
const ProjectSettings = lazy(() => import('pages/Project/Settings'))
const ViewProject = lazy(() => import('pages/Project/View'))
const Billing = lazy(() => import('pages/Billing'))
const Privacy = lazy(() => import('pages/Privacy'))
const ConfirmShare = lazy(() => import('pages/Project/ConfirmShare'))
const Terms = lazy(() => import('pages/Terms'))
const NotFound = lazy(() => import('pages/NotFound'))
const Changelog = lazy(() => import('pages/Changelog'))
const About = lazy(() => import('pages/About'))
const ProjectAlertsSettings = lazy(() => import('pages/Project/Alerts/Settings'))
const CookiePolicy = lazy(() => import('pages/CookiePolicy'))
const CaptchaSettings = lazy(() => import('pages/Captcha/Settings'))
const CaptchaView = lazy(() => import('pages/Captcha/View'))
const ConfirmReportsShare = lazy(() => import('pages/Project/Settings/Emails/ConfirmReportsShare'))
const MediaAndPress = lazy(() => import('pages/Press'))

const minimalFooterPages = [
  '/projects', '/dashboard', '/settings', '/contact',
]

type FallbackProps = {
  isMinimalFooter: boolean
}

const Fallback = ({ isMinimalFooter }: FallbackProps): JSX.Element => {
  const [showLoader, setShowLoader] = useState(false)

  useEffect(() => {
    let isMounted = true

    setTimeout(() => {
      if (isMounted) {
        setShowLoader(true)
      }
    }, 1000)

    return () => {
      isMounted = false
    }
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
  const dispatch = useAppDispatch()
  const location = useLocation()
  const alert = useAlert()
  const {
    loading, authenticated, user,
  } = useSelector((state: StateType) => state.auth)
  const { theme } = useSelector((state: StateType) => state.ui.theme)
  const { error } = useSelector((state: StateType) => state.errors)
  const { message, type } = useSelector((state: StateType) => state.alerts)
  // const themeType = useSelector(state => state.ui.theme.type)
  const accessToken = getAccessToken()
  const refreshToken = getRefreshToken()

  useEffect(() => {
    const eventCallback = (data: any) => {
      dispatch(UIActions.setPaddleLastEvent(data))
    }
    // eslint-disable-next-line no-use-before-define
    const interval = setInterval(paddleSetup, 200)

    function paddleSetup() {
      if (isSelfhosted) {
        clearInterval(interval)
      } else if ((window as any)?.Paddle) {
        (window as any).Paddle.Setup({
          vendor: 139393,
          eventCallback,
        })
        clearInterval(interval)
      }
    }
  }, []) // eslint-disable-line

  useEffect(() => {
    const loaderEl = document.getElementById('loader')

    if (loaderEl) {
      loaderEl.classList.add('available')
      setTimeout(() => {
        loaderEl.outerHTML = ''
      }, 1000)
    }
  }, [])

  useEffect(() => {
    (async () => {
      if ((accessToken && refreshToken) && !authenticated) {
        try {
          const me = await authMe()
          // dispatch(UIActions.setThemeType(me.theme))
          dispatch(authActions.loginSuccessful(me))
          dispatch(authActions.finishLoading())
        } catch (e) {
          dispatch(authActions.logout())
        }
      }
    })()
  }, [authenticated]) // eslint-disable-line

  useEffect(() => {
    if (error) {
      alert.error(error.toString(), {
        onClose: () => {
          dispatch(errorsActions.clearErrors())
        },
      })
    }
  }, [error]) // eslint-disable-line

  useEffect(() => {
    if (message && type) {
      alert.show(message.toString(), {
        type,
        onClose: () => {
          dispatch(alertsActions.clearAlerts())
        },
      })
    }
  }, [message, type]) // eslint-disable-line

  const isMinimalFooter = _some(minimalFooterPages, (page) => _includes(location.pathname, page))

  return (
    <>
      {(!accessToken || !loading) && (
      // eslint-disable-next-line react/jsx-no-useless-fragment
      <Suspense fallback={<></>}>
        <Header
          authenticated={authenticated}
          theme={theme}
          // themeType={themeType}
          user={user}
        />
        {/* {location.pathname === routes.main && (
          <Snowfall />
        )} */}
        {/* {location.pathname !== routes.main && themeType === THEME_TYPE.christmas && (
          <Snowfall snowflakeCount={10} />
        )} */}
        {/* @ts-ignore */}
        <ScrollToTop>
          <Selfhosted>
            <Suspense fallback={<Fallback isMinimalFooter={isMinimalFooter} />}>
              <Switch>
                <Route path={routes.main} component={MainPage} exact />
                <Route path={routes.signin} component={SignIn} exact />
                <Route path={routes.signup} component={SignUp} exact />
                <Route path={routes.dashboard} component={Dashboard} exact />
                <Route path={routes.user_settings} component={UserSettings} exact />
                <Route path={routes.verify} component={VerifyEmail} exact />
                <Route path={routes.change_email} component={VerifyEmail} exact />
                <Route path={routes.reset_password} component={ForgotPassword} exact />
                <Route path={routes.new_password_form} component={CreateNewPassword} exact />
                <Route path={routes.new_project} component={ProjectSettings} exact />
                <Route path={routes.project_settings} component={ProjectSettings} exact />
                <Route path={routes.project} component={ViewProject} exact />
                <Route path={routes.billing} component={Billing} exact />
                <Route path={routes.contact} component={Contact} exact />
                <Route path={routes.features} component={Features} exact />
                <Route path={routes.privacy} component={Privacy} exact />
                <Route path={routes.terms} component={Terms} exact />
                <Route path={routes.confirm_share} component={ConfirmShare} exact />
                <Route path={routes.changelog} component={Changelog} exact />
                <Route path={routes.about} component={About} exact />
                <Route path={routes.alert_settings} component={ProjectAlertsSettings} exact />
                <Route path={routes.create_alert} component={ProjectAlertsSettings} exact />
                <Route path={routes.cookiePolicy} component={CookiePolicy} exact />
                <Route path={routes.captcha_settings} component={CaptchaSettings} exact />
                <Route path={routes.new_captcha} component={CaptchaSettings} exact />
                <Route path={routes.captcha} component={CaptchaView} exact />
                <Route path={routes.confirm_subcription} component={ConfirmReportsShare} exact />
                <Route path={routes.press} component={MediaAndPress} exact />
                <Route path='*' component={NotFound} />
              </Switch>
            </Suspense>
          </Selfhosted>
        </ScrollToTop>
        <Footer minimal={isMinimalFooter} authenticated={authenticated} />
      </Suspense>
      )}
      <div className='hidden' />
    </>
  )
}

export default App
