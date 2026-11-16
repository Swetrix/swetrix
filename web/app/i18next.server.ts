import { resolve } from 'node:path'

import Backend from 'i18next-fs-backend'
import { initReactI18next } from 'react-i18next'
import { createCookie } from 'react-router'
import { createI18nextMiddleware } from 'remix-i18next'

import { defaultLanguage, getLangFromPath, whitelist } from '~/lib/constants'

import i18n from './i18n'

const localeCookie = createCookie('i18next')

/**
 * Returns the first supported language cookie in header order, skipping invalid
 * entries and accepting both plain and React Router-encoded preferences.
 */
export const readCookieLang = async (
  request: Request,
): Promise<string | null> => {
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
    if (whitelist.includes(value)) return value

    const parsedValue = await localeCookie.parse(trimmed)
    if (whitelist.includes(parsedValue)) return parsedValue
  }

  return null
}

export const [i18nextMiddleware, getLocale, getInstance] =
  createI18nextMiddleware({
    detection: {
      supportedLanguages: whitelist,
      fallbackLanguage: defaultLanguage,
      cookie: localeCookie,
      /**
       * Resolves URL language prefixes before stored cookie preferences.
       * Returning null allows the remaining detectors to use browser language.
       */
      async findLocale({ request }) {
        return (
          getLangFromPath(new URL(request.url).pathname) ||
          (await readCookieLang(request))
        )
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
