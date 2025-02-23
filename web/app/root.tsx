/* eslint-disable no-undef */
import { ExclamationTriangleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import BillboardCss from 'billboard.js/dist/billboard.min.css?url'
import cx from 'clsx'
import FlatpickrDarkCss from 'flatpickr/dist/themes/dark.css?url'
import FlatpickrLightCss from 'flatpickr/dist/themes/light.css?url'
import _replace from 'lodash/replace'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Provider } from 'react-redux'
import type { LinksFunction, LoaderFunctionArgs, HeadersFunction } from 'react-router'
import {
  data,
  redirect,
  Links,
  Meta,
  Scripts,
  useLoaderData,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from 'react-router'
import { useChangeLanguage } from 'remix-i18next/react'
import { ExternalScripts } from 'remix-utils/external-scripts'

import { LocaleLinks } from '~/components/LocaleLinks'
import { SEO } from '~/components/SEO'
import { CONTACT_EMAIL, LS_THEME_SETTING, isSelfhosted, I18N_CACHE_BREAKER } from '~/lib/constants'
import { store } from '~/lib/store'
import FlatpickerCss from '~/styles/Flatpicker.css?url'
import FontsCss from '~/styles/fonts.css?url'
import mainCss from '~/styles/index.css?url'
import sonnerCss from '~/styles/sonner.css?url'
import tailwindCss from '~/styles/tailwind.css?url'
import { trackViews, trackErrors } from '~/utils/analytics'
import { getCookie, generateCookieString } from '~/utils/cookie'
import { detectTheme, isAuthenticated, isWWW } from '~/utils/server'

import AppWrapper from './App'
import { detectLanguage } from './i18n'

trackViews()
trackErrors()

declare global {
  interface Window {
    REMIX_ENV: any
    // Set by Docker for self-hosted
    env: any

    Paddle: any
  }
}

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: tailwindCss },
  { rel: 'stylesheet', href: sonnerCss },
  { rel: 'stylesheet', href: mainCss },
  { rel: 'stylesheet', href: BillboardCss },
  { rel: 'stylesheet', href: FlatpickerCss },
  { rel: 'stylesheet', href: FontsCss },
]

export const headers: HeadersFunction = () => ({
  // General headers
  'access-control-allow-origin': '*',
  'Cross-Origin-Embedder-Policy': 'require-corp; report-to="default";',
  'Cross-Origin-Opener-Policy': 'same-site; report-to="default";',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Permissions-Policy': 'interest-cohort=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Powered-By': 'Mountain Dew',
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
        <div style={{ minHeight: '100vh' }} className='flex flex-col bg-gray-50 pt-16 pb-12 dark:bg-slate-900'>
          <div className='mx-auto flex w-full max-w-7xl flex-grow flex-col justify-center px-4 sm:px-6 lg:px-8'>
            <div className='flex shrink-0 justify-center'>
              <ExclamationTriangleIcon className='h-24 w-auto text-yellow-400 dark:text-yellow-600' />
            </div>
            <div className='py-8'>
              <div className='text-center'>
                <h1 className='text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl dark:text-gray-50'>
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
                        className='flex cursor-pointer items-center justify-center text-base text-gray-800 hover:underline dark:text-gray-300'
                      >
                        {crashStackShown ? (
                          <>
                            Hide crash stack
                            <ChevronUpIcon className='ml-2 h-4 w-4' />
                          </>
                        ) : (
                          <>
                            Show crash stack
                            <ChevronDownIcon className='ml-2 h-4 w-4' />
                          </>
                        )}
                      </span>
                      {crashStackShown ? (
                        <span className='text-sm whitespace-pre-line text-gray-600 dark:text-gray-400'>
                          {error.stack}
                        </span>
                      ) : null}
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
      </body>
    </html>
  )
}

// Let's keep it for a few months to fix the Google Search Console ?lng= issue due to a fucking bug I introduced before
const removeMultipleLngParams = (url: string): string => {
  return _replace(url, /%3Flng%3D[^%]*/g, '')
}

export async function loader({ request }: LoaderFunctionArgs) {
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
    API_URL: process.env.API_URL,
    API_STAGING_URL: process.env.API_STAGING_URL,
    CDN_URL: process.env.CDN_URL,
    SELFHOSTED: process.env.__SELFHOSTED,
    DISABLE_MARKETING_PAGES: process.env.DISABLE_MARKETING_PAGES,
    STAGING: process.env.STAGING,
    PADDLE_CLIENT_SIDE_TOKEN: process.env.PADDLE_CLIENT_SIDE_TOKEN,
  }

  const init = storeThemeToCookie
    ? {
        headers: {
          // 21600 seconds = 6 hours
          'Set-Cookie': generateCookieString(LS_THEME_SETTING, theme, 21600),
        },
      }
    : undefined

  return data({ locale, url, theme, REMIX_ENV, isAuthed, pathname: urlObject.pathname }, init)
}

export const handle = { i18n: 'common' }

export default function App() {
  const { locale, url, theme, REMIX_ENV, isAuthed } = useLoaderData<any>()
  const { i18n } = useTranslation('common')

  const urlObject = new URL(url)
  urlObject.searchParams.delete('lng')

  useChangeLanguage(locale)

  return (
    <html className={cx('font-sans antialiased', theme)} lang={locale} dir={i18n.dir()}>
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
        {theme === 'dark' ? <link rel='stylesheet' href={FlatpickrDarkCss} /> : null}
        {theme === 'light' ? <link rel='stylesheet' href={FlatpickrLightCss} /> : null}
        <LocaleLinks />
        <link
          rel='preload'
          href={`/locales/${locale}.json?cv=${I18N_CACHE_BREAKER}`}
          as='fetch'
          type='application/json'
          crossOrigin='anonymous'
        />
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: `window.REMIX_ENV = ${JSON.stringify(REMIX_ENV)}` }}
        />
      </head>
      <body className={cx({ 'bg-white': theme === 'light', 'bg-slate-900': theme === 'dark' })}>
        <Provider store={store}>
          <AppWrapper ssrTheme={theme} ssrAuthenticated={isAuthed} />
        </Provider>
        <ScrollRestoration />
        <ExternalScripts />
        <Scripts />
      </body>
    </html>
  )
}
