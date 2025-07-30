import type i18next from 'i18next'
import _includes from 'lodash/includes'
import _startsWith from 'lodash/startsWith'

import { TITLE_SUFFIX, SUPPORTED_THEMES, ThemeType } from '~/lib/constants'
import routes from '~/utils/routes'

/**
 * Function detects theme based on user's browser hints and cookies
 */
export function detectTheme(request: Request): ThemeType {
  // Stage 1: Check if theme is set via `theme` query param
  const queryTheme = new URL(request.url).searchParams.get('theme') as ThemeType | null

  if (queryTheme && _includes(SUPPORTED_THEMES, queryTheme)) {
    return queryTheme
  }

  // Stage 2: Check if user has set theme manually
  const cookie = request.headers.get('Cookie')
  const theme = cookie?.match(/(?<=colour-theme=)[^;]*/)?.[0] as ThemeType

  if (_includes(SUPPORTED_THEMES, theme)) {
    return theme
  }

  // Stage 3: Try to detect theme based on Sec-CH browser hints
  // Currently only Chromium-based browsers support this feature
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-Prefers-Color-Scheme
  const hintedTheme = request.headers.get('Sec-CH-Prefers-Color-Scheme') as ThemeType

  if (_includes(SUPPORTED_THEMES, hintedTheme)) {
    return hintedTheme
  }

  return 'light'
}

function getAccessToken(request: Request): string | null {
  const cookie = request.headers.get('Cookie')
  const accessToken = cookie?.match(/(?<=access_token=)[^;]*/)?.[0]

  return accessToken || null
}

export function isAuthenticated(request: Request): boolean {
  return !!getAccessToken(request)
}

export function isWWW(url: URL): boolean {
  return _startsWith(url.hostname, 'www.')
}

interface GetPageMeta {
  title: string
  prefixLessTitle: string
}

export const getPageMeta = (t: typeof i18next.t, url?: string, _pathname?: string): GetPageMeta => {
  const DEFAULT_RESULT = {
    title: t('titles.main'),
  } as Partial<GetPageMeta>

  if (!url && !_pathname) {
    return {
      title: DEFAULT_RESULT.title as string,
      prefixLessTitle: DEFAULT_RESULT.title as string,
    }
  }

  const pathname = _pathname || new URL(url as string).pathname

  let result = DEFAULT_RESULT

  switch (pathname) {
    case routes.signin:
      result = {
        title: t('titles.signin'),
      }
      break

    case routes.signup:
      result = {
        title: t('titles.signup'),
      }
      break

    case routes.reset_password:
    case routes.new_password_form:
      result = {
        title: t('titles.recovery'),
      }
      break

    case routes.confirm_share:
    case routes.confirm_subcription:
    case routes.transfer_confirm:
    case routes.transfer_reject:
      result = {
        title: t('titles.invitation'),
      }
      break

    case routes.dashboard:
      result = {
        title: t('titles.dashboard'),
      }
      break

    case routes.user_settings:
      result = {
        title: t('titles.profileSettings'),
      }
      break

    case routes.verify:
    case routes.change_email:
      result = {
        title: t('titles.verification'),
      }
      break

    case routes.new_project:
    case routes.new_captcha:
      result = {
        title: t('project.settings.create'),
      }
      break

    case routes.billing:
      result = {
        title: t('titles.billing'),
      }
      break

    case routes.performance:
      result = {
        title: t('titles.performance'),
      }
      break

    case routes.errorTracking:
      result = {
        title: t('titles.errors'),
      }
      break

    case routes.privacy:
      result = {
        title: 'Privacy Policy',
      }
      break

    case routes.cookiePolicy:
      result = {
        title: 'Cookie Policy',
      }
      break

    case routes.terms:
      result = {
        title: 'Terms and Conditions',
      }
      break

    case routes.imprint:
      result = {
        title: t('footer.imprint'),
      }
      break

    case routes.contact:
      result = {
        title: t('titles.contact'),
      }
      break

    case routes.changelog:
      result = {
        title: t('titles.changelog'),
      }
      break

    case routes.about:
      result = {
        title: 'About us',
      }
      break

    case routes.socialised:
      result = {
        title: t('titles.socialisation'),
      }
      break

    case routes.open:
      result = {
        title: t('titles.open'),
      }
      break

    case routes.forMarketers:
      result = {
        title: t('titles.forMarketers'),
      }
      break

    case routes.forStartups:
      result = {
        title: t('titles.forStartups'),
      }
      break

    case routes.forSmallBusinesses:
      result = {
        title: t('titles.forSmbs'),
      }
      break

    case routes.organisations:
      result = {
        title: t('titles.organisations'),
      }
      break

    case routes.feature_flags:
      result = {
        title: t('titles.featureFlags'),
      }
      break

    default:
      break
  }

  // organisation, project_settings, captcha_settings, project, captcha titles are set dynamically

  // todo: create_alert, alert_settings, project_protected_password

  result.prefixLessTitle = result.title
  result.title += ` ${TITLE_SUFFIX}`

  return result as GetPageMeta
}
