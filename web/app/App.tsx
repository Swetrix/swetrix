import _endsWith from 'lodash/endsWith'
import _includes from 'lodash/includes'
import _startsWith from 'lodash/startsWith'
import { useLocation, Outlet } from 'react-router'
import 'dayjs/locale/uk'
import { Toaster } from 'sonner'

import Footer from '~/components/Footer'
import Header from '~/components/Header'
import routesPath from '~/utils/routes'

import { useTheme } from './providers/ThemeProvider'

const App = () => {
  const { pathname } = useLocation()
  const { theme } = useTheme()

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
    routesPath.captchaLanding,
    routesPath.gaAlternative,
  ]

  return (
    <>
      {!_includes(routesWithOutHeader, pathname) &&
      !isReferralPage &&
      !isProjectViewPage ? (
        <Header />
      ) : null}
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
