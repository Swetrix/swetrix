import { resolve } from 'node:path'

import Backend from 'i18next-fs-backend'
import { initReactI18next } from 'react-i18next'
import { createCookie } from 'react-router'
import { createI18nextMiddleware } from 'remix-i18next'

import { defaultLanguage, getLangFromPath, whitelist } from '~/lib/constants'

import i18n from './i18n'

const localeCookie = createCookie('i18next')

export const [i18nextMiddleware, getLocale, getInstance] =
  createI18nextMiddleware({
    detection: {
      supportedLanguages: whitelist,
      fallbackLanguage: defaultLanguage,
      cookie: localeCookie,
      async findLocale({ request }) {
        return getLangFromPath(new URL(request.url).pathname)
      },
    },
    i18next: {
      ...i18n,
      backend: {
        loadPath: resolve('./public/locales/{{lng}}.json'),
      },
    },
    plugins: [initReactI18next, Backend],
  })
