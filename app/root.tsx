import type { LinksFunction } from '@remix-run/node'
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
import AlertTemplate from 'ui/Alert'
import { trackViews } from 'utils/analytics'
import { getAccessToken, removeAccessToken } from 'utils/accessToken'
import { getRefreshToken } from 'utils/refreshToken'

import AppWrapper from 'App'

import tailwindCss from './css/tailwind.css'

trackViews()

console.log('%cWelcome, hacker, glad you opened your console, you seem serious about your craft and will go a long way!\nP.S. All the bugs, feature requests are welcome to be sent to security@swetrix.com', 'color: #818cf8;background: #1f2937;font-size: 20px;text-shadow: 2px 2px black')

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
]

const removeObsoleteAuthTokens = () => {
  const accessToken = getAccessToken()
  const refreshToken = getRefreshToken()

  if (accessToken && !refreshToken) {
    removeAccessToken()
  }
}

removeObsoleteAuthTokens()

export default function App() {
  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width,initial-scale=1' />
        <Meta />
        <Links />
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
