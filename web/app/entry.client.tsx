import i18next from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import HTTPBackend from 'i18next-http-backend'
import { startTransition, StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { HydratedRouter } from 'react-router/dom'
import { getInitialNamespaces } from 'remix-i18next/client'

import { I18N_CACHE_BREAKER } from '~/lib/constants'

import i18n from './i18n'

async function hydrate() {
  // eslint-disable-next-line import/no-named-as-default-member
  await i18next
    .use(initReactI18next)
    .use(LanguageDetector)
    .use(HTTPBackend)
    .init({
      ...i18n,
      ns: getInitialNamespaces(),
      backend: { loadPath: `/locales/{{lng}}.json?cv=${I18N_CACHE_BREAKER}` },
      detection: {
        order: ['htmlTag'],
        caches: ['cookie'],
      },
    })

  startTransition(() => {
    hydrateRoot(
      document,
      <I18nextProvider i18n={i18next}>
        <StrictMode>
          <HydratedRouter />
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
