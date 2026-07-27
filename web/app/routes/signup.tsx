import { useTranslation } from 'react-i18next'
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from 'react-router'
import { redirect, data, useLoaderData } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { getAuthenticatedUser, registerUser } from '~/api/api.server'
import {
  getOgImageUrl,
  isSelfhosted,
  localisedLanguages,
} from '~/lib/constants'
import Signup from '~/pages/Auth/Signup'
import {
  createOnboardingSiteCookie,
  onboardingDomainFrom,
  readOnboardingSite,
} from '~/utils/onboardingSite.server'
import routes from '~/utils/routes'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'
import {
  createHeadersWithCookies,
  createLastAuthMethodCookie,
} from '~/utils/session.server'
import { MAX_PASSWORD_CHARS } from '~/utils/validator'

export const meta: MetaFunction = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation('common')

  return [
    ...getTitle(t('titles.signup')),
    ...getDescription(t('description.signup')),
    ...getPreviewImage(
      getOgImageUrl(t('titles.signup'), t('description.signup')),
    ),
  ]
}

export const headers: HeadersFunction = ({ parentHeaders }) => {
  parentHeaders.set('X-Frame-Options', 'DENY')
  return parentHeaders
}

export const sitemap: SitemapFunction = () => ({
  priority: 0.9,
  exclude: isSelfhosted,
})

/**
 * `/signup` when the visitor is already here, keeping the language prefix.
 * Rebuilt rather than taken from `request.url` - during a client navigation
 * that's the single-fetch `.data` URL, not something we can redirect to.
 */
const selfPath = (url: URL) => {
  const [, maybeLang] = url.pathname.split('/')
  const prefix = localisedLanguages.includes(maybeLang) ? `/${maybeLang}` : ''

  const params = new URLSearchParams(url.searchParams)
  params.delete('site')
  const query = params.toString()

  return `${prefix}${routes.signup}${query ? `?${query}` : ''}`
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  // Landing-hero handoff: the domain typed in the hero arrives as `?site=`.
  // Move it into a cookie so it survives the SSO popup and the signup POST,
  // and strip it from the URL so the address bar stays clean.
  const site = onboardingDomainFrom(url.searchParams.get('site'))
  const headers = site
    ? { headers: createHeadersWithCookies([createOnboardingSiteCookie(site)]) }
    : undefined

  const authResult = await getAuthenticatedUser(request)

  if (authResult) {
    const user = authResult.user.user

    if (!user.hasCompletedOnboarding) {
      return redirect('/onboarding', headers)
    }
    return redirect('/dashboard', headers)
  }

  if (url.searchParams.has('site')) {
    return redirect(selfPath(url), headers)
  }

  return { site: readOnboardingSite(request) }
}

export interface SignupActionData {
  error?: string | string[]
  fieldErrors?: {
    email?: string
    password?: string
    tos?: string
  }
  timestamp?: number
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()

  const email = formData.get('email')?.toString() || ''
  const password = formData.get('password')?.toString() || ''
  const tos = formData.get('tos') === 'true'
  const checkIfLeaked = formData.get('checkIfLeaked') === 'true'

  const fieldErrors: SignupActionData['fieldErrors'] = {}

  if (!email || !email.includes('@')) {
    fieldErrors.email = 'Please enter a valid email address'
  }

  if (!password || password.length < 8) {
    fieldErrors.password = 'Password must be at least 8 characters'
  }

  if (password.length > MAX_PASSWORD_CHARS) {
    fieldErrors.password = `Password must be at most ${MAX_PASSWORD_CHARS} characters`
  }

  if (!tos && !isSelfhosted) {
    fieldErrors.tos = 'You must accept the Terms of Service'
  }

  if (fieldErrors.email || fieldErrors.password || fieldErrors.tos) {
    return data({ fieldErrors, timestamp: Date.now() }, { status: 400 })
  }

  const result = await registerUser(
    request,
    { email, password, checkIfLeaked },
    true,
  )

  if (!result.success) {
    return data({ error: result.error, timestamp: Date.now() }, { status: 400 })
  }

  return redirect('/onboarding', {
    headers: createHeadersWithCookies([
      ...result.cookies,
      createLastAuthMethodCookie('email'),
    ]),
  })
}

export default function SignupPage() {
  const loaderData = useLoaderData<typeof loader>()

  return <Signup site={loaderData?.site ?? null} />
}
