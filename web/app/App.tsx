import _endsWith from 'lodash/endsWith'
import _includes from 'lodash/includes'
import _some from 'lodash/some'
import _startsWith from 'lodash/startsWith'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, Outlet } from 'react-router'
import 'dayjs/locale/uk'
import { Toaster } from 'sonner'

import Footer from '~/components/Footer'
import Header from '~/components/Header'
import routesPath from '~/utils/routes'
import { getPageMeta } from '~/utils/server'

import { useTheme } from './providers/ThemeProvider'

const TITLE_BLACKLIST = ['/projects/', '/captchas/', '/blog']

const App = () => {
  const { pathname } = useLocation()
  const { t } = useTranslation('common')
  const { theme } = useTheme()

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
      {!_includes(routesWithOutHeader, pathname) && !isReferralPage && !isProjectViewPage ? <Header /> : null}
      <Outlet />
      <Toaster
        theme={theme}
        toastOptions={{
          duration: 5000,
        }}
      />
      {!isReferralPage && !isProjectViewPage ? <Footer /> : null}
    </>
  )
}

export default App
