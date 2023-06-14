import type { LinksFunction, LoaderArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import {
  Links,
  LiveReload,
  Meta,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react'
import { store } from 'redux/store'
import { Provider } from 'react-redux'
// @ts-ignore
import { transitions, positions, Provider as AlertProvider } from '@blaumaus/react-alert'
import BillboardCss from 'billboard.js/dist/billboard.min.css'

import AlertTemplate from 'ui/Alert'
import { trackViews } from 'utils/analytics'
import { getAccessToken, removeAccessToken } from 'utils/accessToken'
import { getRefreshToken } from 'utils/refreshToken'
import { useChangeLanguage } from 'remix-i18next'
import { useTranslation } from 'react-i18next'
import AppWrapper from 'App'
import { detectLanguage } from 'i18n'

import mainCss from 'styles/index.css'
import tailwindCss from 'styles/tailwind.css'

trackViews()

console.log('%cWelcome, hacker, glad you opened your console, you seem serious about your craft and will go a long way!\nP.S. All the bugs, feature requests are welcome to be sent to security@swetrix.com', 'color: #818cf8background: #1f2937font-size: 20pxtext-shadow: 2px 2px black')

const options = {
  position: positions.BOTTOM_RIGHT,
  timeout: 8000,
  offset: '30px',
  transition: transitions.SCALE,
}

if (process.env.NODE_ENV !== 'production') {
  // localStorage.debug = 'swetrix:*'
}

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: tailwindCss },
  { rel: 'stylesheet', href: mainCss },
  { rel: 'stylesheet', href: BillboardCss },
]

const removeObsoleteAuthTokens = () => {
  const accessToken = getAccessToken()
  const refreshToken = getRefreshToken()

  if (accessToken && !refreshToken) {
    removeAccessToken()
  }
}

removeObsoleteAuthTokens()

export async function loader({ request }: LoaderArgs) {
  const locale = detectLanguage(request)

  return json({ locale })
}

export const handle = {
  i18n: 'common',
}

export default function App() {
  const { locale } = useLoaderData<typeof loader>()
  const { i18n } = useTranslation()

  useChangeLanguage(locale)

  return (
    <html lang={locale} dir={i18n.dir()}>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width,initial-scale=1' />
        <Meta />
        <Links />
        <link rel='preload' href={`/locales/${locale}.json`} as='fetch' type='application/json' crossOrigin='anonymous' />
      </head>
      <body>
        <Provider store={store}>
          <AlertProvider template={AlertTemplate} {...options}>
            <AppWrapper />
            <ScrollRestoration />
            <Scripts />
            {process.env.NODE_ENV === 'development' && <LiveReload />}
          </AlertProvider>
        </Provider>
      </body>
    </html>
  )
}
