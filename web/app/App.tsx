import _endsWith from 'lodash/endsWith'
import _includes from 'lodash/includes'
import _some from 'lodash/some'
import _startsWith from 'lodash/startsWith'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { useLocation, Outlet } from 'react-router'
import 'dayjs/locale/uk'
import { Toaster } from 'sonner'

import Footer from '~/components/Footer'
import Header from '~/components/Header'
import { isBrowser, isSelfhosted } from '~/lib/constants'
import { authActions } from '~/lib/reducers/auth'
import UIActions from '~/lib/reducers/ui'
import { StateType, useAppDispatch } from '~/lib/store'
import { getAccessToken } from '~/utils/accessToken'
import { logout, shouldShowLowEventsBanner } from '~/utils/auth'
import routesPath from '~/utils/routes'
import { getPageMeta } from '~/utils/server'

import { authMe, getGeneralStats, getInstalledExtensions, getLastPost, getPaymentMetainfo } from './api'

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

  useEffect(() => {
    void (async () => {
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
      {!_includes(routesWithOutHeader, pathname) && !isReferralPage && !isProjectViewPage ? (
        <Header ssrTheme={ssrTheme} authenticated={authenticated} />
      ) : null}
      <Outlet />
      <Toaster
        theme={theme}
        toastOptions={{
          duration: 5000,
        }}
      />
      {!isReferralPage && !isProjectViewPage ? <Footer authenticated={authenticated} /> : null}
    </>
  )
}

export default App
