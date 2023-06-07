/**
 * By default, Remix will handle hydrating your app on the client for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.client
 */

import { RemixBrowser } from '@remix-run/react'
import { startTransition, StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'

import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'
import { getInitialNamespaces } from 'remix-i18next'
import _isString from 'lodash/isString'
import _includes from 'lodash/includes'
import { store } from 'redux/store'
import { Provider } from 'react-redux'
import i18n from './i18n'

import { whitelist, defaultLanguage } from './constants'
import { setItem, getItem } from './utils/localstorage'

async function hydrate() {
  const lngDetector = new LanguageDetector()
  lngDetector.addDetector({
    name: 'customDetector',
    lookup() {
      if (window.localStorage) {
        const lsLang = getItem('language')

        if (_includes(whitelist, lsLang)) {
          return lsLang
        }

        setItem('language', defaultLanguage)
        setItem('i18nextLng', defaultLanguage)
      }

      // @ts-ignore
      const language = navigator.language || navigator?.userLanguage

      if (_isString(language)) {
        const subLanguage = language.substring(0, 2)

        if (_includes(whitelist, subLanguage)) {
          return subLanguage
        }
      }

      return defaultLanguage
    },
  })

  // @ts-ignore
  await i18next
    .use(initReactI18next)
    .use(lngDetector)
    .use(Backend)
    .init({
      ...i18n,
      backend: {
        loadPath: '/locales/{{lng}}.json',
      },
      detection: {
        order: ['querystring', 'customDetector', 'htmlTag'],
      },
      interpolation: {
        escapeValue: false,
      },
      fallbackLng: defaultLanguage,
      parseMissingKeyHandler: (key) => {
        if (i18next.isInitialized) {
          console.warn(`Missing translation for ${key}`)
        }
        return key
      },
      whitelist,
      ns: getInitialNamespaces(),
      defaultNS: 'common',
    })

  i18next.on('languageChanged', (lng) => {
    document.documentElement.setAttribute('lang', lng)
    setItem('language', lng)
  })

  startTransition(() => {
    hydrateRoot(
      document,
      <I18nextProvider i18n={i18next}>
        <StrictMode>
          <Provider store={store}>
            <RemixBrowser />
          </Provider>
        </StrictMode>
      </I18nextProvider>,
    )
  })
}

if (window.requestIdleCallback) {
  window.requestIdleCallback(hydrate)
} else {
  // Safari doesn't support requestIdleCallback
  // https://caniuse.com/requestidlecallback
  window.setTimeout(hydrate, 1)
}
