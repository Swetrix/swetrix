import { resolve } from 'node:path'

import Backend from 'i18next-fs-backend'
import { RemixI18Next } from 'remix-i18next/server'

import { defaultLanguage, whitelist } from '~/lib/constants'

import i18n from './i18n'

const i18next = new RemixI18Next({
  detection: {
    supportedLanguages: whitelist,
    fallbackLanguage: defaultLanguage,
  },
  i18next: {
    ...i18n,
    backend: {
      loadPath: resolve('./public/locales/{{lng}}.json'),
    },
  },
  backend: Backend,
})

export default i18next
