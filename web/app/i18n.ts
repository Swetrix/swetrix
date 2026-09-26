import { InitOptions } from 'i18next'

import {
  defaultLanguage,
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
  ns: ['common'],
  react: { useSuspense: false },
  backend: {
    loadPath: `/locales/{{lng}}.json?cv=${I18N_CACHE_BREAKER}`,
  },
  interpolation: {
    escapeValue: false,
  },
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
