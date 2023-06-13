import React, {
  useEffect, Suspense, useState,
} from 'react'
import { useLocation, Outlet } from '@remix-run/react'
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
  isSelfhosted, PADDLE_JS_URL, PADDLE_VENDOR_ID, // THEME_TYPE,
} from 'redux/constants'
import { getAccessToken } from 'utils/accessToken'
import { loadScript } from 'utils/generic'
import { authActions } from 'redux/reducers/auth'
import sagaActions from 'redux/sagas/actions'
import { errorsActions } from 'redux/reducers/errors'
import { alertsActions } from 'redux/reducers/alerts'
import { StateType, useAppDispatch } from 'redux/store'
import UIActions from 'redux/reducers/ui'

import { getRefreshToken } from 'utils/refreshToken'
import { authMe } from './api'

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

  console.log('showLoader', showLoader)

  return (
    <div className={cx('bg-gray-50 dark:bg-slate-900', { 'min-h-page': !isMinimalFooter, 'min-h-min-footer': isMinimalFooter })}>
      {showLoader && (
        <Loader />
      )}
    </div>
  )
}

let isHydrating = true

const HocThrowErrorWhenWindowIsUndefined = ({ children }: { children: React.ReactNode }) => {
  const [isHydrated, setIsHydrated] = React.useState(
    !isHydrating,
  )

  React.useEffect(() => {
    isHydrating = false
    setIsHydrated(true)
  }, [])

  if (isHydrated) {
    return children
  }

  return (
    <div className='loader' id='loader'>
      <div className='loader-head'>
        <div className='first' />
        <div className='second' />
      </div>
      <div className='logo-frame'>
        <img className='logo-frame-img' width='361' height='80' src='assets/logo_blue.png' alt='Swetrix' />
      </div>
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
  const paddleLoaded = useSelector((state: StateType) => state.ui.misc.paddleLoaded)
  const { theme } = useSelector((state: StateType) => state.ui.theme)
  const { error } = useSelector((state: StateType) => state.errors)
  const { message, type } = useSelector((state: StateType) => state.alerts)
  // const themeType = useSelector(state => state.ui.theme.type)
  const accessToken = getAccessToken()
  const refreshToken = getRefreshToken()

  // Paddle (payment processor) set-up
  useEffect(() => {
    if (paddleLoaded || !authenticated) {
      return
    }

    loadScript(PADDLE_JS_URL)

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
          vendor: PADDLE_VENDOR_ID,
          eventCallback,
        })
        clearInterval(interval)
      }
    }
  }, [paddleLoaded, authenticated]) // eslint-disable-line

  useEffect(() => {
    let loaderEl: HTMLElement | null = null

    if (document) {
      loaderEl = document.getElementById('loader')
    }

    if (loaderEl) {
      loaderEl.classList.add('available')
      setTimeout(() => {
        if (loaderEl) {
          loaderEl.outerHTML = ''
        }
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
          dispatch(sagaActions.logout(false))
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
    <HocThrowErrorWhenWindowIsUndefined>
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
              <Outlet />
            </Suspense>
          </Selfhosted>
        </ScrollToTop>
        <Footer minimal={isMinimalFooter} authenticated={authenticated} />
      </Suspense>
      )}
      <div className='hidden' />
    </HocThrowErrorWhenWindowIsUndefined>
  )
}

export default App
