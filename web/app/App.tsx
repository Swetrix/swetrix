import _endsWith from 'lodash/endsWith'
import _includes from 'lodash/includes'
import _startsWith from 'lodash/startsWith'
import { useEffect } from 'react'
import { useLocation, Outlet } from 'react-router'
import 'dayjs/locale/uk'
import { Toaster } from 'sonner'

import Footer from '~/components/Footer'
import Header from '~/components/Header'
import { stripLangFromPath } from '~/lib/constants'
import { trackSessionReplay } from '~/utils/analytics'
import routesPath from '~/utils/routes'

import { useTheme } from './providers/ThemeProvider'

const App = () => {
  const { pathname: rawPathname } = useLocation()
  const pathname = stripLangFromPath(rawPathname)
  const { theme } = useTheme()

  useEffect(() => {
    trackSessionReplay()
  }, [])

  const isOnboardingPage = pathname === routesPath.onboarding
  const isProjectViewPage =
    _startsWith(pathname, '/projects/') &&
    !_endsWith(pathname, '/new') &&
    !_endsWith(pathname, '/subscribers/invite') &&
    !_endsWith(pathname, '/subscribers/invite') &&
    !_includes(pathname, '/alerts/') &&
    !_includes(pathname, '/settings/')

  const routesWithOutHeader = [
    routesPath.main,
    routesPath.demo,
    routesPath.performance,
    routesPath.errorTracking,
    routesPath.forMarketers,
    routesPath.forStartups,
    routesPath.forSmallBusinesses,
    routesPath.captchaLanding,
    routesPath.gaAlternative,
  ]

  return (
    <>
      {!_includes(routesWithOutHeader, pathname) &&
      !isProjectViewPage &&
      !isOnboardingPage ? (
        <Header />
      ) : null}
      <Outlet />
      <Toaster
        theme={theme}
        toastOptions={{
          duration: 5000,
        }}
      />
      {!isProjectViewPage &&
      !isOnboardingPage &&
      pathname !== routesPath.demo ? (
        <Footer />
      ) : null}
    </>
  )
}

export default App
