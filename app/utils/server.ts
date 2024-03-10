import routes from 'routesPath'
import _includes from 'lodash/includes'
import _split from 'lodash/split'
import _startsWith from 'lodash/startsWith'
import { TITLE_SUFFIX, SUPPORTED_THEMES, ThemeType } from 'redux/constants'

export const hasAuthCookies = (request: Request) => {
  const cookie = request.headers.get('Cookie')
  const accessToken = cookie?.match(/(?<=access_token=)[^;]*/)?.[0]
  const refreshToken = cookie?.match(/(?<=refresh_token=)[^;]*/)?.[0]

  return accessToken && refreshToken
}

/**
 * Function detects theme based on user's browser hints and cookies
 *
 * @param request
 * @returns [theme, storeToCookie]
 */
export function detectTheme(request: Request): [ThemeType, boolean] {
  // Stage 1: Check if theme is set via `theme` query param
  const queryTheme = new URL(request.url).searchParams.get('theme') as ThemeType | null

  if (queryTheme && _includes(SUPPORTED_THEMES, queryTheme)) {
    return [queryTheme, false]
  }

  // Stage 2: Check if user has set theme manually
  const cookie = request.headers.get('Cookie')
  const theme = cookie?.match(/(?<=colour-theme=)[^;]*/)?.[0] as ThemeType

  if (_includes(SUPPORTED_THEMES, theme)) {
    return [theme, false]
  }

  // Stage 3: Try to detect theme based on Sec-CH browser hints
  // Currently only Chromium-based browsers support this feature
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-Prefers-Color-Scheme
  const hintedTheme = request.headers.get('Sec-CH-Prefers-Color-Scheme') as ThemeType

  if (_includes(SUPPORTED_THEMES, hintedTheme)) {
    return [hintedTheme, true]
  }

  return ['light', false]
}

/**
 * Function detects theme based on the query
 *
 * @param request
 * @returns boolean
 */
export function isEmbedded(request: Request): boolean {
  return new URL(request.url).searchParams.get('embedded') === 'true'
}

/**
 * Function returns project tabs from query
 *
 * @param request
 * @returns string[]
 */
export function getProjectTabs(request: Request): string[] {
  const tabs = new URL(request.url).searchParams.get('tabs')

  if (!tabs) {
    return []
  }

  return _split(tabs, ',')
}

/**
 * Function returns password from query
 *
 * @param request
 * @returns boolean
 */
export function getProjectPassword(request: Request): string | null {
  return new URL(request.url).searchParams.get('password')
}

export function getAccessToken(request: Request): string | null {
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

interface IPageMeta {
  title: string
  prefixLessTitle: string
}

export const getPageMeta = (t: (key: string) => string, url?: string, _pathname?: string): IPageMeta => {
  const DEFAULT_RESULT = {
    title: t('titles.main'),
  } as Partial<IPageMeta>

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

    case routes.confirm_email:
      result = {
        title: t('titles.confirm'),
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

    case routes.press:
      result = {
        title: t('titles.press'),
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

    default:
      break
  }

  // project_settings, captcha_settings, project, captcha titles are set dynamically

  // todo: create_alert, alert_settings, project_protected_password,

  result.prefixLessTitle = result.title
  result.title += ` ${TITLE_SUFFIX}`

  return result as IPageMeta
}
