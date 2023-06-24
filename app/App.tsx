import React, {
  useEffect, Suspense, useState,
} from 'react'
import { useLocation, Outlet } from '@remix-run/react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
// @ts-ignore
import { useAlert } from '@blaumaus/react-alert'
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
import { authActions } from 'redux/reducers/auth'
import sagaActions from 'redux/sagas/actions'
import { errorsActions } from 'redux/reducers/errors'
import { alertsActions } from 'redux/reducers/alerts'
import { StateType, useAppDispatch } from 'redux/store'
import { isBrowser } from 'redux/constants'
import routesPath from 'routesPath'
import { getPageMeta } from 'utils/server'

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

  return (
    <div className={cx('bg-gray-50 dark:bg-slate-900', { 'min-h-page': !isMinimalFooter, 'min-h-min-footer': isMinimalFooter })}>
      {showLoader && (
        <Loader />
      )}
    </div>
  )
}

interface IApp {
  ssrTheme: 'dark' | 'light'
  ssrAuthenticated: boolean
}

const TITLE_BLACKLIST = [
  '/projects/', '/captchas/',
]

const App: React.FC<IApp> = ({ ssrTheme, ssrAuthenticated }) => {
  const dispatch = useAppDispatch()
  const { pathname } = useLocation()
  const { t } = useTranslation('common')
  const alert = useAlert()
  const {
    loading,
  } = useSelector((state: StateType) => state.auth)
  const reduxAuthenticated = useSelector((state: StateType) => state.auth.authenticated)
  const { error } = useSelector((state: StateType) => state.errors)
  const { message, type } = useSelector((state: StateType) => state.alerts)
  const accessToken = getAccessToken()
  const refreshToken = getRefreshToken()
  const authenticated = isBrowser ? reduxAuthenticated : ssrAuthenticated

  useEffect(() => {
    (async () => {
      if ((accessToken && refreshToken) && !authenticated) {
        try {
          const me = await authMe()
          dispatch(authActions.loginSuccessful(me))
          dispatch(authActions.finishLoading())
        } catch (e) {
          dispatch(authActions.logout())
          dispatch(sagaActions.logout(false, false))
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

  useEffect(() => {
    if (_some(TITLE_BLACKLIST, (page) => _includes(pathname, page))) {
      return
    }

    const { title } = getPageMeta(t, undefined, pathname)
    document.title = title
  }, [t, pathname])

  const isMinimalFooter = _some(minimalFooterPages, (page) => _includes(pathname, page))

  if (!accessToken || !loading) {
    return (
      // eslint-disable-next-line react/jsx-no-useless-fragment
      <Suspense fallback={<></>}>
        {pathname !== routesPath.main && (
          <Header ssrTheme={ssrTheme} ssrAuthenticated={ssrAuthenticated} />
        )}
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
    )
  }

  return null
}

export default App
