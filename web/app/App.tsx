import React, { useEffect } from 'react'
import { useLocation, Outlet } from '@remix-run/react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import _some from 'lodash/some'
import _includes from 'lodash/includes'
import _startsWith from 'lodash/startsWith'
import _endsWith from 'lodash/endsWith'
import 'dayjs/locale/uk'

import Header from '~/components/Header'
import Footer from '~/components/Footer'

import { Toaster } from 'sonner'
import { getAccessToken } from '~/utils/accessToken'
import { authActions } from '~/lib/reducers/auth'
import { StateType, useAppDispatch } from '~/lib/store'
import { isBrowser, isSelfhosted } from '~/lib/constants'
import routesPath from '~/utils/routes'
import { getPageMeta } from '~/utils/server'
import { authMe, getGeneralStats, getInstalledExtensions, getLastPost, getPaymentMetainfo } from './api'
import UIActions from '~/lib/reducers/ui'
import { logout, shouldShowLowEventsBanner } from '~/utils/auth'

interface AppProps {
  ssrTheme: 'dark' | 'light'
  ssrAuthenticated: boolean
}

const TITLE_BLACKLIST = ['/projects/', '/captchas/', '/blog']

const App = ({ ssrTheme, ssrAuthenticated }: AppProps) => {
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
          const { user, totalMonthlyEvents } = await authMe()
          dispatch(authActions.authSuccessful(user))

          if (shouldShowLowEventsBanner(totalMonthlyEvents, user.maxEventsCount)) {
            dispatch(UIActions.setShowNoEventsLeftBanner(true))
          }

          if (!isSelfhosted) {
            const extensions = await getInstalledExtensions()
            dispatch(UIActions.setExtensions(extensions))
          }
        } catch (reason) {
          dispatch(authActions.logout())
          logout()
          console.error(`[ERROR] Error while getting user: ${reason}`)
        }
      }

      if (!isSelfhosted) {
        const [metainfo, lastBlogPost, generalStats] = await Promise.all([
          getPaymentMetainfo(),
          getLastPost(),
          getGeneralStats(),
        ])
        dispatch(UIActions.setMetainfo(metainfo))
        dispatch(UIActions.setLastBlogPost(lastBlogPost))
        dispatch(UIActions.setGeneralStats(generalStats))
      }

      // yield put(sagaActions.loadMetainfo())

      // const lastBlogPost: {
      //   title: string
      //   handle: string
      // } = yield call(getLastPost)
      // yield put(UIActions.setLastBlogPost(lastBlogPost))

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
      {!isReferralPage && !isProjectViewPage && <Footer authenticated={authenticated} />}
    </>
  )
}

export default App
