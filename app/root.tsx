import type { LinksFunction, LoaderArgs, V2_MetaFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import {
  Links,
  LiveReload,
  Meta,
  Scripts,
  useLoaderData,
  ScrollRestoration,
} from '@remix-run/react'
import { store } from 'redux/store'
import { isDevelopment, whitelist, isBrowser } from 'redux/constants'
import { Provider } from 'react-redux'
import _map from 'lodash/map'
// @ts-ignore
import { transitions, positions, Provider as AlertProvider } from '@blaumaus/react-alert'
import BillboardCss from 'billboard.js/dist/billboard.min.css'
// import { getCookie } from 'utils/cookie'

import AlertTemplate from 'ui/Alert'
import { trackViews } from 'utils/analytics'
import { useChangeLanguage } from 'remix-i18next'
import { useTranslation } from 'react-i18next'
import AppWrapper from 'App'
import { detectLanguage } from 'i18n'
import { detectTheme, getPageMeta } from 'utils/server'

import mainCss from 'styles/index.css'
import tailwindCss from 'styles/tailwind.css'
import FlatpickerCss from 'styles/Flatpicker.css'
import FlatpickrLightCss from 'flatpickr/dist/themes/light.css'
import FlatpickrDarkCss from 'flatpickr/dist/themes/dark.css'

trackViews()

declare global {
  interface Window {
    REMIX_ENV: any
    // Set by Docker for self-hosted
    env: any
  }
}

const options = {
  position: positions.BOTTOM_RIGHT,
  timeout: 8000,
  offset: '30px',
  transition: transitions.SCALE,
}

if (isBrowser && process.env.NODE_ENV !== 'production') {
  localStorage.debug = 'swetrix:*'
}

const FONTS_PROVIDER = 'https://fonts.bunny.net'
const FONTS_URL = 'https://fonts.bunny.net/css?family=inter:300,400,500,600,700,800'

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: tailwindCss },
  { rel: 'stylesheet', href: mainCss },
  { rel: 'stylesheet', href: BillboardCss },
  { rel: 'stylesheet', href: FlatpickerCss },
  { rel: 'preconnect', href: FONTS_PROVIDER },
  { rel: 'stylesheet', href: FONTS_URL },
]

export const meta: V2_MetaFunction = () => [
  { charSet: 'utf-8' },
  { name: 'theme-color', content: '#818cf8' },
  { name: 'description', content: 'Ultimate open-source analytics to satisfy all your needs' },
  { name: 'twitter:title', content: 'Swetrix | Ultimate open-source analytics to satisfy all your needs' },
  { name: 'twitter:site', content: '@swetrix' },
  { name: 'twitter:description', content: 'Swetrix is a cookie-less, fully opensource and privacy-first web analytics service which provides a huge variety of services' },
  { name: 'twitter:card', content: 'summary_large_image' },
  { property: 'og:title', content: 'Swetrix' },
  { property: 'og:description', content: 'Ultimate open-source analytics to satisfy all your needs' },
  { property: 'og:image', content: 'https://swetrix.com/assets/og_image.png' },
  { property: 'og:site_name', content: 'Swetrix' },
  { property: 'og:url', content: 'https://swetrix.com' },
  { property: 'og:type', content: 'website' },
  { name: 'google', content: 'notranslate' },
  // { name: 'apple-mobile-web-app-title', content: 'Swetrix' },
  // { name: 'application-name', content: 'Swetrix' },
]


// const removeObsoleteAuthTokens = () => {
//   const accessToken = getAccessToken()
//   const refreshToken = getRefreshToken()

//   if (accessToken && !refreshToken) {
//     removeAccessToken()
//   }
// }

// removeObsoleteAuthTokens()

export async function loader({ request }: LoaderArgs) {
  const { url } = request
  const locale = detectLanguage(request)
  const theme = detectTheme(request)

  const REMIX_ENV = {
    NODE_ENV: process.env.NODE_ENV,
    AIAPI_URL: process.env.AIAPI_URL,
    API_URL: process.env.API_URL,
    API_STAGING_URL: process.env.API_STAGING_URL,
    CDN_URL: process.env.CDN_URL,
    BLOG_URL: process.env.BLOG_URL,
    SELFHOSTED: process.env.REACT_APP_SELFHOSTED,
    STAGING: process.env.STAGING,
  }

  return json({
    locale, url, theme, REMIX_ENV,
  })
}

export const handle = {
  i18n: 'common',
}

export default function App() {
  const {
    locale, url, theme, REMIX_ENV,
  } = useLoaderData<typeof loader>()
  const { i18n, t } = useTranslation('common')
  const { title } = getPageMeta(t, url)

  const alternateLinks = _map(whitelist, (lc) => ({
    rel: 'alternate',
    hrefLang: lc,
    href: `${url}?lng=${lc}`,
  }))

  useChangeLanguage(locale)

  return (
    <html className={theme} lang={locale} dir={i18n.dir()}>
      <head>
        <Meta />
        <title>{title}</title>
        <meta name='viewport' content='width=device-width,initial-scale=1' />
        <Links />
        {theme === 'dark' && <link rel='stylesheet' href={FlatpickrDarkCss} />}
        {theme === 'light' && <link rel='stylesheet' href={FlatpickrLightCss} />}
        {_map(alternateLinks, (link) => (
          <link key={link.hrefLang} {...link} />
        ))}
        <link rel='preload' href={`/locales/${locale}.json`} as='fetch' type='application/json' crossOrigin='anonymous' />
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `window.REMIX_ENV = ${JSON.stringify(
              REMIX_ENV,
            )}`,
          }}
        />
      </head>
      <body>
        <div className='loader' id='loader'>
          <div className='loader-head'>
            <div className='first' />
            <div className='second' />
          </div>
          <div className='logo-frame'>
            <img className='logo-frame-img' width='361' height='80' src='/assets/logo_blue.png' alt='Swetrix' />
          </div>
        </div>
        <Provider store={store}>
          <AlertProvider template={AlertTemplate} {...options}>
            <AppWrapper ssrTheme={theme} />
            <ScrollRestoration />
            <Scripts />
            {isDevelopment && <LiveReload />}
          </AlertProvider>
        </Provider>
      </body>
    </html>
  )
}
