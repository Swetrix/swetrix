import {
  WarningOctagonIcon,
  CaretDownIcon,
  CaretUpIcon,
  WifiSlashIcon,
} from '@phosphor-icons/react'
import BillboardCss from 'billboard.js/dist/billboard.min.css?url'
import cx from 'clsx'
import _replace from 'lodash/replace'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  LinksFunction,
  LoaderFunctionArgs,
  HeadersFunction,
} from 'react-router'
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
  useSearchParams,
  useLocation,
} from 'react-router'
import { ExternalScripts } from 'remix-utils/external-scripts'

import { getAuthenticatedUser } from '~/api/api.server'
import { LocaleLinks } from '~/components/LocaleLinks'
import {
  CONTACT_EMAIL,
  LS_THEME_SETTING,
  isSelfhosted,
  I18N_CACHE_BREAKER,
  isDevelopment,
  MAIN_URL,
  defaultLanguage,
  localisePath,
  isUnlocalisedPath,
  whitelist,
  stripLangFromPath,
  getLangFromPath,
} from '~/lib/constants'
import mainCss from '~/styles/index.css?url'
import tailwindCss from '~/styles/tailwind.css?url'
import { Text } from '~/ui/Text'
import { trackViews, trackErrors, trackError } from '~/utils/analytics'
import { getCookie } from '~/utils/cookie'
import { detectTheme, isWWW } from '~/utils/server'
import { createHeadersWithCookies, hasAuthTokens } from '~/utils/session.server'

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

    // Swetrix CAPTCHA loader function
    swetrixCaptchaForceLoad?: () => void
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
  Vary: 'Sec-CH-Prefers-Color-Scheme, Cookie',
  'Critical-CH': 'Sec-CH-Prefers-Color-Scheme',
  'Cache-Control':
    'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
})

// Fix for "You made a POST request to ... but did not provide an `action`" error
// caused by bots probing endpoints that don't support POST requests.
export async function action() {
  return data(null, {
    status: 405,
    statusText: 'Method Not Allowed - non existent endpoint',
  })
}

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message.toLowerCase()
  return (
    msg.includes('networkerror') ||
    msg.includes('failed to fetch') ||
    msg.includes('load failed') ||
    msg.includes('network request failed') ||
    (error instanceof TypeError && msg.includes('fetch'))
  )
}

export function ErrorBoundary() {
  const error = useRouteError()
  const { t } = useTranslation('common')
  const [crashStackShown, setCrashStackShown] = useState(false)
  const networkError =
    !isRouteErrorResponse(error) &&
    error instanceof Error &&
    isNetworkError(error)

  useEffect(() => {
    if (networkError) return

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
  }, [error, networkError])

  if (networkError) {
    return (
      <html lang='en' className={getCookie(LS_THEME_SETTING) || 'light'}>
        <head>
          <meta charSet='utf-8' />
          <title>{t('errorBoundary.connectionLost')}</title>
          <Links />
        </head>
        <body>
          <div
            style={{ minHeight: '100vh' }}
            className='flex flex-col bg-gray-50 pt-16 pb-12 dark:bg-slate-950'
          >
            <div className='mx-auto flex w-full max-w-7xl grow flex-col justify-center px-4 sm:px-6 lg:px-8'>
              <div className='flex shrink-0 justify-center'>
                <WifiSlashIcon
                  weight='duotone'
                  className='h-20 w-auto text-amber-500 dark:text-amber-400'
                />
              </div>
              <div className='py-8'>
                <div className='text-center'>
                  <Text
                    as='h1'
                    size='3xl'
                    weight='bold'
                    className='sm:text-4xl'
                  >
                    {t('errorBoundary.connectionLost')}
                  </Text>
                  <Text as='p' size='base' colour='muted' className='mt-3'>
                    {t('errorBoundary.connectionLostDesc')}
                    <br />
                    {t('errorBoundary.connectionLostHint')}
                  </Text>
                  <button
                    type='button'
                    onClick={() => window.location.reload()}
                    className='mt-6 inline-flex cursor-pointer items-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200'
                  >
                    {t('dashboard.reloadPage')}
                  </button>
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

  return (
    <html lang='en' className={getCookie(LS_THEME_SETTING) || 'light'}>
      <head>
        <meta charSet='utf-8' />
        <title>{t('errorBoundary.crashTitle')}</title>
        <Links />
      </head>
      <body>
        {/* Using style because for some reason min-h-screen doesn't work */}
        <div
          style={{ minHeight: '100vh' }}
          className='flex flex-col bg-gray-50 pt-16 pb-12 dark:bg-slate-950'
        >
          <div className='mx-auto flex w-full max-w-7xl flex-grow flex-col justify-center px-4 sm:px-6 lg:px-8'>
            <div className='flex shrink-0 justify-center'>
              <WarningOctagonIcon className='h-24 w-auto text-yellow-400 dark:text-yellow-600' />
            </div>
            <div className='py-8'>
              <div className='text-center'>
                <Text as='h1' size='4xl' weight='bold' className='sm:text-5xl'>
                  {t('errorBoundary.crashTitle')}
                </Text>
                <Text
                  as='p'
                  size='base'
                  weight='medium'
                  className='mt-2 text-gray-800 dark:text-gray-300'
                >
                  {t('errorBoundary.crashDesc')}
                  <br />
                  {t('errorBoundary.crashContact', { email: CONTACT_EMAIL })}
                </Text>
                <Text
                  as='p'
                  size='base'
                  weight='medium'
                  className='mt-6 flex flex-col justify-center text-gray-800 dark:text-gray-300'
                >
                  {isRouteErrorResponse(error) ? (
                    <>
                      <span>
                        {error.status} {error.statusText}
                      </span>
                      <span>{error.data}</span>
                    </>
                  ) : error instanceof Error ? (
                    <>
                      <span>{error.message}</span>
                      <br />
                      <button
                        type='button'
                        onClick={() => setCrashStackShown((prev) => !prev)}
                        className='flex cursor-pointer items-center justify-center text-base text-gray-800 hover:underline dark:text-gray-300'
                      >
                        {crashStackShown ? (
                          <>
                            {t('errorBoundary.hideCrashStack')}
                            <CaretUpIcon className='ml-2 h-4 w-4' />
                          </>
                        ) : (
                          <>
                            {t('errorBoundary.showCrashStack')}
                            <CaretDownIcon className='ml-2 h-4 w-4' />
                          </>
                        )}
                      </button>
                      {crashStackShown ? (
                        <span className='text-sm whitespace-pre-line text-gray-600 dark:text-gray-400'>
                          {error.stack}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <>{t('errorBoundary.unknownError')}</>
                  )}
                </Text>
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

const readCookieLang = (request: Request): string | null => {
  const cookie = request.headers.get('Cookie')
  if (!cookie) return null

  for (const segment of cookie.split(';')) {
    const trimmed = segment.trim()
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const name = trimmed.slice(0, eqIdx)
    if (name !== 'i18next') continue

    const rawValue = trimmed.slice(eqIdx + 1)
    let value: string
    try {
      value = decodeURIComponent(rawValue)
    } catch {
      value = rawValue
    }
    return whitelist.includes(value) ? value : null
  }

  return null
}

// Decides whether to redirect an unprefixed URL to its localised counterpart
// so the URL is always the source of truth for the rendered language.
//
// Priority of "preferred language" signals:
//   1. Legacy `?lng=xx` query (301 — canonical migration of old links)
//   2. `i18next` cookie set by the language switcher (302 — per-user pref)
//
// We deliberately ignore `Accept-Language` here to avoid surprise redirects
// for bots, link previews, and shared screenshots.
const buildLocaliseRedirect = (
  request: Request,
  urlObject: URL,
): { url: string; status: 301 | 302 } | null => {
  const { searchParams, pathname } = urlObject

  // Already on a localised URL, or a path that should never be prefixed.
  if (getLangFromPath(pathname)) return null
  if (isUnlocalisedPath(pathname)) return null

  // /en/dashboard → /dashboard (default lang should never be prefixed).
  const firstSegment = pathname.match(/^\/([^/]+)(\/.*)?$/)
  if (firstSegment && firstSegment[1] === defaultLanguage) {
    const next = new URL(urlObject.toString())
    next.pathname = firstSegment[2] || '/'
    return { url: next.toString(), status: 301 }
  }

  const lngQuery = searchParams.get('lng')
  if (lngQuery && whitelist.includes(lngQuery)) {
    const next = new URL(urlObject.toString())
    next.searchParams.delete('lng')
    next.pathname = localisePath(pathname, lngQuery)
    return { url: next.toString(), status: 301 }
  }

  const cookieLng = readCookieLang(request)
  if (cookieLng && cookieLng !== defaultLanguage) {
    const next = new URL(urlObject.toString())
    next.pathname = localisePath(pathname, cookieLng)
    return { url: next.toString(), status: 302 }
  }

  return null
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

  const localiseRedirect = buildLocaliseRedirect(request, urlObject)
  if (localiseRedirect) {
    return redirect(localiseRedirect.url, localiseRedirect.status)
  }

  const locale = detectLanguage(request)
  const theme = detectTheme(request)
  const hasTokens = hasAuthTokens(request)

  let user = null
  let totalMonthlyEvents = 0
  let cookies: string[] = []

  if (hasTokens) {
    const authResult = await getAuthenticatedUser(request)
    if (authResult) {
      user = authResult.user.user
      totalMonthlyEvents = authResult.user.totalMonthlyEvents
      cookies = authResult.cookies
    }
  }

  const REMIX_ENV = {
    NODE_ENV: process.env.NODE_ENV,
    API_URL: process.env.API_URL,
    API_STAGING_URL: process.env.API_STAGING_URL,
    BASE_URL: process.env.BASE_URL,
    SELFHOSTED: process.env.__SELFHOSTED,
    DISABLE_MARKETING_PAGES: process.env.DISABLE_MARKETING_PAGES,
    STAGING: process.env.STAGING,
    PADDLE_CLIENT_SIDE_TOKEN: process.env.PADDLE_CLIENT_SIDE_TOKEN,
    LOCALE: locale,
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
  }

  const loaderData = {
    locale,
    theme,
    REMIX_ENV,
    isAuthed: !!user,
    user,
    totalMonthlyEvents,
    pathname: urlObject.pathname,
  }

  if (cookies.length > 0) {
    return data(loaderData, {
      headers: createHeadersWithCookies(cookies),
    })
  }

  return loaderData
}

export const handle = { i18n: 'common' }

const Body = () => {
  const { isAuthed, user, totalMonthlyEvents } = useLoaderData<typeof loader>()
  const { theme } = useTheme()

  return (
    <body
      className={cx(theme, {
        'bg-gray-50': theme === 'light',
        'bg-slate-950': theme === 'dark',
      })}
    >
      <AuthProvider
        initialIsAuthenticated={isAuthed}
        initialUser={user}
        initialTotalMonthlyEvents={totalMonthlyEvents}
      >
        <AppWrapper />
      </AuthProvider>
      <ScrollRestoration />
      <ExternalScripts />
      <Scripts />
    </body>
  )
}

export default function App() {
  const { locale, theme, REMIX_ENV } = useLoaderData<typeof loader>()
  const { pathname, search } = useLocation()
  const { i18n } = useTranslation('common')
  const [searchParams] = useSearchParams()

  const isEmbedded = searchParams.get('embedded') === 'true'

  const canonicalUrl = (() => {
    const localisedPathname = localisePath(
      stripLangFromPath(pathname),
      i18n.language || defaultLanguage,
    )
    const next = new URL(`${MAIN_URL}${localisedPathname}${search}`)
    next.searchParams.delete('lng')
    return next.toString()
  })()

  return (
    <html
      className={cx('font-sans antialiased', { 'scrollbar-thin': isEmbedded })}
      lang={locale}
      dir={i18n.dir()}
    >
      <head>
        <meta charSet='utf-8' />

        <link rel='canonical' href={canonicalUrl} />
        <meta name='theme-color' content='#4f46e5' />
        <meta
          name='theme-color'
          content='#6366f1'
          media='(prefers-color-scheme: dark)'
        />
        <meta name='twitter:site' content='@swetrix' />
        <meta name='twitter:card' content='summary_large_image' />
        <meta property='og:site_name' content='Swetrix' />
        <meta property='og:url' content={canonicalUrl} />
        <meta property='og:type' content='website' />
        <meta name='language' content={i18n.language.toUpperCase()} />
        <meta
          httpEquiv='content-language'
          content={i18n.language.toUpperCase()}
        />
        <meta name='google' content='notranslate' />
        <link
          rel='icon'
          type='image/x-icon'
          href={isSelfhosted ? '/favicon-ce.ico' : '/favicon.ico'}
        />
        {isDevelopment ? (
          <script src='https://unpkg.com/react-scan@0.4.3/dist/auto.global.js' />
        ) : null}
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
        <script
          dangerouslySetInnerHTML={{
            __html: `window.REMIX_ENV = ${JSON.stringify(REMIX_ENV)
              .replace(/</g, '\\u003c')
              .replace(/\u2028|\u2029/g, '')}`,
          }}
        />
      </head>
      <ThemeProvider initialTheme={theme}>
        <Body />
      </ThemeProvider>
    </html>
  )
}
