import { ExclamationTriangleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import BillboardCss from 'billboard.js/dist/billboard.min.css?url'
import cx from 'clsx'
import _replace from 'lodash/replace'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { LinksFunction, LoaderFunctionArgs, HeadersFunction } from 'react-router'
import {
  redirect,
  Links,
  Meta,
  Scripts,
  useLoaderData,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
  useSearchParams,
} from 'react-router'
import { useChangeLanguage } from 'remix-i18next/react'
import { ExternalScripts } from 'remix-utils/external-scripts'

import { LocaleLinks } from '~/components/LocaleLinks'
import SelfhostedApiUrlBanner from '~/components/SelfhostedApiUrlBanner'
import { SEO } from '~/components/SEO'
import { CONTACT_EMAIL, LS_THEME_SETTING, isSelfhosted, I18N_CACHE_BREAKER } from '~/lib/constants'
import mainCss from '~/styles/index.css?url'
import tailwindCss from '~/styles/tailwind.css?url'
import { trackViews, trackErrors, trackError } from '~/utils/analytics'
import { getCookie } from '~/utils/cookie'
import { detectTheme, isAuthenticated, isWWW } from '~/utils/server'

import AppWrapper from './App'
import { detectLanguage } from './i18n'
import { AuthProvider } from './providers/AuthProvider'
import { ThemeProvider, useTheme } from './providers/ThemeProvider'

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
  { rel: 'stylesheet', href: mainCss },
  { rel: 'stylesheet', href: BillboardCss },
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

  useEffect(() => {
    if (isRouteErrorResponse(error)) {
      trackError({
        name: `ErrorBoundary: ${error.status} ${error.statusText}`,
        message: error.data,
        lineno: 0,
        colno: 0,
      })
    } else if (error instanceof Error) {
      trackError({
        name: `ErrorBoundary: ${error.message}`,
        message: error.message,
        lineno: 0,
        colno: 0,
        stackTrace: error.stack || '',
      })
    }
  }, [error])

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
                <h1 className='text-4xl font-extrabold text-gray-900 sm:text-5xl dark:text-gray-50'>Uh-oh..</h1>
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
  const theme = detectTheme(request)
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
    LOCALE: locale,
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
  }

  return { locale, url, theme, REMIX_ENV, isAuthed, pathname: urlObject.pathname }
}

export const handle = { i18n: 'common' }

const Body = () => {
  const { isAuthed } = useLoaderData<typeof loader>()
  const { theme } = useTheme()

  return (
    <body className={cx(theme, { 'bg-gray-50': theme === 'light', 'bg-slate-900': theme === 'dark' })}>
      <SelfhostedApiUrlBanner />
      <AuthProvider initialIsAuthenticated={isAuthed}>
        <AppWrapper />
      </AuthProvider>
      <ScrollRestoration />
      <ExternalScripts />
      <Scripts />
    </body>
  )
}

export default function App() {
  const { locale, url, theme, REMIX_ENV } = useLoaderData<typeof loader>()
  const { i18n } = useTranslation('common')
  const [searchParams] = useSearchParams()

  const urlObject = new URL(url)
  urlObject.searchParams.delete('lng')

  useChangeLanguage(locale)

  const isEmbedded = searchParams.get('embedded') === 'true'

  return (
    <html className={cx('font-sans antialiased', { 'scrollbar-thin': isEmbedded })} lang={locale} dir={i18n.dir()}>
      <head>
        <meta charSet='utf-8' />
        <SEO />
        <meta name='google' content='notranslate' />
        <link rel='icon' type='image/x-icon' href={isSelfhosted ? '/favicon-ce.ico' : '/favicon.ico'} />
        <Meta />
        <meta name='viewport' content='width=device-width,initial-scale=1' />
        <Links />
        <LocaleLinks />
        <link
          rel='preload'
          href={`/locales/${locale}.json?cv=${I18N_CACHE_BREAKER}`}
          as='fetch'
          type='application/json'
          crossOrigin='anonymous'
        />
        <script dangerouslySetInnerHTML={{ __html: `window.REMIX_ENV = ${JSON.stringify(REMIX_ENV)}` }} />
      </head>
      <ThemeProvider initialTheme={theme}>
        <Body />
      </ThemeProvider>
    </html>
  )
}
