import type { LinksFunction, LoaderArgs, HeadersFunction } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import { useState } from 'react'
import {
  Links,
  LiveReload,
  Meta,
  Scripts,
  useLoaderData,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from '@remix-run/react'
import { store } from 'redux/store'
import { isBrowser, CONTACT_EMAIL, LS_THEME_SETTING, isSelfhosted } from 'redux/constants'
import { getCookie, generateCookieString } from 'utils/cookie'
import { ExclamationTriangleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { Provider } from 'react-redux'
import clsx from 'clsx'
import _replace from 'lodash/replace'
// @ts-ignore
import { transitions, positions, Provider as AlertProvider } from '@blaumaus/react-alert'
import BillboardCss from 'billboard.js/dist/billboard.min.css'

import AlertTemplate from 'ui/Alert'
import { trackViews, trackErrors } from 'utils/analytics'
import { useChangeLanguage } from 'remix-i18next/react'
import { useTranslation } from 'react-i18next'
import AppWrapper from 'App'
import { detectLanguage } from 'i18n'
import { detectTheme, isAuthenticated, isWWW } from 'utils/server'
import { LocaleLinks } from 'components/LocaleLinks'
import { SEO } from 'components/SEO'

import mainCss from 'styles/index.css'
import tailwindCss from 'styles/tailwind.css'
import FlatpickerCss from 'styles/Flatpicker.css'
import FlatpickrLightCss from 'flatpickr/dist/themes/light.css'
import FlatpickrDarkCss from 'flatpickr/dist/themes/dark.css'
import FontsCss from 'styles/fonts.css'

trackViews()
trackErrors()

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

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: tailwindCss },
  { rel: 'stylesheet', href: mainCss },
  { rel: 'stylesheet', href: BillboardCss },
  { rel: 'stylesheet', href: FlatpickerCss },
  { rel: 'stylesheet', href: FontsCss },
]

export const headers: HeadersFunction = (stuff) => ({
  // General headers
  'access-control-allow-origin': '*',
  'Cross-Origin-Embedder-Policy': 'require-corp; report-to="default";',
  'Cross-Origin-Opener-Policy': 'same-site; report-to="default";',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Permissions-Policy': 'interest-cohort=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Powered-By': 'Mountain Dew',
  'X-XSS-Protection': '1; mode=block',
  // Theme detection headers (browser hints)
  'Accept-CH': 'Sec-CH-Prefers-Color-Scheme',
  Vary: 'Sec-CH-Prefers-Color-Scheme',
  'Critical-CH': 'Sec-CH-Prefers-Color-Scheme',
})

export function ErrorBoundary() {
  const error = useRouteError()
  const [crashStackShown, setCrashStackShown] = useState(false)

  return (
    <html lang='en' className={getCookie(LS_THEME_SETTING) || 'light'}>
      <head>
        <meta charSet='utf-8' />
        <title>The app has crashed..</title>
        <Links />
      </head>
      <body>
        {/* Using style because for some reason min-h-screen doesn't work */}
        <div style={{ minHeight: '100vh' }} className='pt-16 pb-12 flex flex-col bg-gray-50 dark:bg-slate-900'>
          <div className='flex-grow flex flex-col justify-center max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='flex-shrink-0 flex justify-center'>
              <ExclamationTriangleIcon className='h-24 w-auto text-yellow-400 dark:text-yellow-600' />
            </div>
            <div className='py-8'>
              <div className='text-center'>
                <h1 className='text-4xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight sm:text-5xl'>
                  Uh-oh..
                </h1>
                <p className='mt-2 text-base font-medium text-gray-800 dark:text-gray-300'>
                  The app has crashed. We are sorry about that :(
                  <br />
                  Please, tell us about it at {CONTACT_EMAIL}
                </p>
                <p className='mt-6 text-base font-medium text-gray-800 dark:text-gray-300'>
                  {isRouteErrorResponse(error) ? (
                    <>
                      <span>
                        {error.status} {error.statusText}
                      </span>
                      <span>{error.data}</span>
                    </>
                  ) : error instanceof Error ? (
                    <>
                      {error.message}
                      <br />
                      <span
                        onClick={() => setCrashStackShown((prev) => !prev)}
                        className='flex justify-center items-center text-base text-gray-800 dark:text-gray-300 cursor-pointer hover:underline'
                      >
                        {crashStackShown ? (
                          <>
                            Hide crash stack
                            <ChevronUpIcon className='w-4 h-4 ml-2' />
                          </>
                        ) : (
                          <>
                            Show crash stack
                            <ChevronDownIcon className='w-4 h-4 ml-2' />
                          </>
                        )}
                      </span>
                      {crashStackShown && (
                        <span className='text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line'>
                          {error.stack}
                        </span>
                      )}
                    </>
                  ) : (
                    <>Unknown error</>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  )
}

// Let's keep it for a few months to fix the Google Search Console ?lng= issue due to a fucking bug I introduced before
const removeMultipleLngParams = (url: string): string => {
  return _replace(url, /%3Flng%3D[^%]*/g, '')
}

export async function loader({ request }: LoaderArgs) {
  const { url } = request
  const removedLng = removeMultipleLngParams(url)

  if (removedLng !== url) {
    return redirect(removedLng, 301)
  }

  const urlObject = new URL(url)

  if (!isSelfhosted && isWWW(urlObject)) {
    const nonWWWLink = _replace(url, 'www.', '')
    const httpToHttps = _replace(nonWWWLink, 'http://', 'https://')
    return redirect(httpToHttps, 301)
  }

  const locale = detectLanguage(request)
  const [theme, storeThemeToCookie] = detectTheme(request)
  const isAuthed = isAuthenticated(request)

  const REMIX_ENV = {
    NODE_ENV: process.env.NODE_ENV,
    AIAPI_URL: process.env.AIAPI_URL,
    API_URL: process.env.API_URL,
    API_STAGING_URL: process.env.API_STAGING_URL,
    CDN_URL: process.env.CDN_URL,
    SELFHOSTED: process.env.SELFHOSTED,
    STAGING: process.env.STAGING,
  }

  const init = storeThemeToCookie
    ? {
        headers: {
          // 21600 seconds = 6 hours
          'Set-Cookie': generateCookieString(LS_THEME_SETTING, theme, 21600),
        },
      }
    : undefined

  return json(
    {
      locale,
      url,
      theme,
      REMIX_ENV,
      isAuthed,
      pathname: urlObject.pathname,
    },
    init,
  )
}

export const handle = {
  i18n: 'common',
}

export default function App() {
  const { locale, url, theme, REMIX_ENV, isAuthed } = useLoaderData<typeof loader>()
  const { i18n } = useTranslation('common')

  const urlObject = new URL(url)
  urlObject.searchParams.delete('lng')

  useChangeLanguage(locale)

  return (
    <html className={theme} lang={locale} dir={i18n.dir()}>
      <head>
        <meta charSet='utf-8' />
        <SEO />
        <meta name='google' content='notranslate' />
        <link rel='icon' type='image/x-icon' href='/favicon.ico' />
        {/* <meta name='apple-mobile-web-app-title' content='Swetrix' /> */}
        {/* <meta name='application-name' content='Swetrix' /> */}
        <Meta />
        <meta name='viewport' content='width=device-width,initial-scale=1' />
        <Links />
        {theme === 'dark' && <link rel='stylesheet' href={FlatpickrDarkCss} />}
        {theme === 'light' && <link rel='stylesheet' href={FlatpickrLightCss} />}
        <LocaleLinks />
        <link
          rel='preload'
          href={`/locales/${locale}.json`}
          as='fetch'
          type='application/json'
          crossOrigin='anonymous'
        />
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `window.REMIX_ENV = ${JSON.stringify(REMIX_ENV)}`,
          }}
        />
      </head>
      <body
        className={clsx({
          'bg-white': theme === 'light',
          'bg-slate-900': theme === 'dark',
        })}
      >
        <Provider store={store}>
          <AlertProvider template={AlertTemplate} {...options}>
            <AppWrapper ssrTheme={theme} ssrAuthenticated={isAuthed} />
          </AlertProvider>
        </Provider>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  )
}
