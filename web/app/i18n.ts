import { InitOptions, changeLanguage as changeLanguageI18n } from 'i18next'
import _includes from 'lodash/includes'

import { defaultLanguage, I18N_CACHE_BREAKER, whitelist } from '~/lib/constants'
import { trackCustom } from '~/utils/analytics'

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
  // Stage 1: Getting the language from the query ?lng= parameter
  const url = new URL(request.url)

  if (url.searchParams.has('lng') && _includes(whitelist, url.searchParams.get('lng'))) {
    return url.searchParams.get('lng') as string
  }

  // Stage 2: Getting the language from the cookie
  const cookie = request.headers.get('Cookie')
  const cookieLng = cookie?.match(/(?<=i18next=)[^;]*/)?.[0]

  if (_includes(whitelist, cookieLng)) {
    return cookieLng as string
  }

  // Stage 3: Getting the language from the Accept-Language header or fallback to default
  if (request.headers.has('accept-language') && _includes(whitelist, request.headers.get('accept-language'))) {
    return request.headers.get('accept-language') as string
  }

  // Stage 4: Fallback to default
  return defaultLanguage
}

export const changeLanguage = (language: string) => {
  changeLanguageI18n(language)
  trackCustom('CHANGE_LANGUAGE', { language })
}

export default genericConfig
