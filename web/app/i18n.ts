import { InitOptions } from 'i18next'
import _includes from 'lodash/includes'

import {
  defaultLanguage,
  getLangFromPath,
  I18N_CACHE_BREAKER,
  localisePath,
  whitelist,
} from '~/lib/constants'
import { trackCustom } from '~/utils/analytics'
import { setCookie } from '~/utils/cookie'

const genericConfig: InitOptions = {
  supportedLngs: whitelist,
  fallbackLng: defaultLanguage,
  defaultNS: 'common',
  react: { useSuspense: false },
  backend: {
    loadPath: `/locales/{{lng}}.json?cv=${I18N_CACHE_BREAKER}`,
  },
  interpolation: {
    escapeValue: false,
  },
}

export function detectLanguage(request: Request): string {
  const url = new URL(request.url)

  // Stage 1: Getting the language from the URL path prefix (/de/page).
  const pathLang = getLangFromPath(url.pathname)
  if (pathLang) {
    return pathLang
  }

  // Stage 2: Legacy ?lng= query parameter (kept so old links keep working
  // in the rare cases we don't redirect them to the path-based URL).
  if (
    url.searchParams.has('lng') &&
    _includes(whitelist, url.searchParams.get('lng'))
  ) {
    return url.searchParams.get('lng') as string
  }

  // Stage 3: Cookie set the last time the user changed language.
  const cookie = request.headers.get('Cookie')
  const cookieLng = cookie?.match(/(?<=i18next=)[^;]*/)?.[0]
  if (_includes(whitelist, cookieLng)) {
    return cookieLng as string
  }

  // Stage 4: Accept-Language header.
  if (
    request.headers.has('accept-language') &&
    _includes(whitelist, request.headers.get('accept-language'))
  ) {
    return request.headers.get('accept-language') as string
  }

  // Stage 5: Fallback to the default language.
  return defaultLanguage
}

export const changeLanguage = (language: string) => {
  setCookie('i18next', language, 31536000, 'lax')
  trackCustom('CHANGE_LANGUAGE', { language })

  if (typeof window === 'undefined') return

  const { pathname, search, hash } = window.location
  const target = `${localisePath(pathname, language)}${search}${hash}`

  if (target === `${pathname}${search}${hash}`) {
    window.location.reload()
  } else {
    window.location.assign(target)
  }
}

export default genericConfig
