import routes from 'routesPath'
import { TITLE_SUFFIX } from 'redux/constants'

export const hasAuthCookies = (request: Request) => {
  const cookie = request.headers.get('Cookie')
  const accessToken = cookie?.match(/(?<=access_token=)[^;]*/)?.[0]
  const refreshToken = cookie?.match(/(?<=refresh_token=)[^;]*/)?.[0]

  return accessToken && refreshToken
}

export function detectTheme(request: Request): 'dark' | 'light' {
  const cookie = request.headers.get('Cookie')
  const theme = cookie?.match(/(?<=colour-theme=)[^;]*/)?.[0]

  if (theme === 'dark') {
    return 'dark'
  }

  return 'light'
}

export function isAuthenticated(request: Request): boolean {
  const cookie = request.headers.get('Cookie')
  const accessToken = cookie?.match(/(?<=access_token=)[^;]*/)?.[0]

  return !!accessToken
}

interface IPageMeta {
  title: string
}

export const getPageMeta = (
  t: (key: string) => string,
  url?: string,
  _pathname?: string,
): IPageMeta => {
  const DEFAULT_RESULT = {
    title: t('titles.main'),
  }

  if (!url && !_pathname) {
    return DEFAULT_RESULT
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

    case routes.features:
      result = {
        title: t('titles.features'),
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

  result.title += ` ${TITLE_SUFFIX}`

  return result
}
