import React, { useEffect } from 'react'
import { useLocation, Outlet } from '@remix-run/react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import _some from 'lodash/some'
import _includes from 'lodash/includes'
import _startsWith from 'lodash/startsWith'
import _endsWith from 'lodash/endsWith'
import 'dayjs/locale/uk'

import Header from 'components/Header'
import Footer from 'components/Footer'

import { Toaster } from 'sonner'
import { getAccessToken } from 'utils/accessToken'
import { authActions } from 'redux/reducers/auth'
import sagaActions from 'redux/sagas/actions'
import { StateType, useAppDispatch } from 'redux/store'
import { isBrowser } from 'redux/constants'
import routesPath from 'utils/routes'
import { getPageMeta } from 'utils/server'
import { authMe } from './api'

const minimalFooterPages = ['/projects', '/dashboard', '/contact', '/captchas']

interface IApp {
  ssrTheme: 'dark' | 'light'
  ssrAuthenticated: boolean
}

const TITLE_BLACKLIST = ['/projects/', '/captchas/', '/blog']

const App: React.FC<IApp> = ({ ssrTheme, ssrAuthenticated }) => {
  const dispatch = useAppDispatch()
  const { pathname } = useLocation()
  const { t } = useTranslation('common')
  const { loading } = useSelector((state: StateType) => state.auth)
  const reduxAuthenticated = useSelector((state: StateType) => state.auth.authenticated)
  const reduxTheme = useSelector((state: StateType) => state.ui.theme.theme)
  const accessToken = getAccessToken()
  const authenticated = isBrowser ? (loading ? !!accessToken : reduxAuthenticated) : ssrAuthenticated
  const theme = isBrowser ? reduxTheme : ssrTheme

  // prettier-ignore
  useEffect(() => {
    (async () => {
      if (accessToken && !reduxAuthenticated) {
        try {
          const me = await authMe()
          dispatch(authActions.loginSuccessful(me))
        } catch (e) {
          dispatch(authActions.logout())
          dispatch(sagaActions.logout(false, false))
        }
      }

      dispatch(authActions.finishLoading())
    })()
  }, [reduxAuthenticated]) // eslint-disable-line

  useEffect(() => {
    if (_some(TITLE_BLACKLIST, (page) => _startsWith(pathname, page))) {
      return
    }

    const { title } = getPageMeta(t, undefined, pathname)
    document.title = title
  }, [t, pathname])

  const isMinimalFooter = _some(minimalFooterPages, (page) => _includes(pathname, page))

  const isReferralPage = _startsWith(pathname, '/ref/')
  const isProjectViewPage =
    _startsWith(pathname, '/projects/') &&
    !_endsWith(pathname, '/new') &&
    !_endsWith(pathname, '/subscribers/invite') &&
    !_endsWith(pathname, '/subscribers/invite') &&
    !_includes(pathname, '/alerts/') &&
    !_includes(pathname, '/uptime/') &&
    !_includes(pathname, '/settings/')

  const routesWithOutHeader = [
    routesPath.main,
    routesPath.performance,
    routesPath.errorTracking,
    routesPath.forMarketers,
    routesPath.forStartups,
    routesPath.forSmallBusinesses,
    routesPath.marketplace,
  ]

  return (
    <>
      {!_includes(routesWithOutHeader, pathname) && !isReferralPage && !isProjectViewPage && (
        <Header ssrTheme={ssrTheme} authenticated={authenticated} />
      )}
      <Outlet />
      <Toaster
        theme={theme}
        toastOptions={{
          duration: 5000,
        }}
      />
      {!isReferralPage && !isProjectViewPage && <Footer minimal={isMinimalFooter} authenticated={authenticated} />}
    </>
  )
}

export default App
