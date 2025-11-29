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

/**
 * Handle chunk loading errors after deployments
 * When a new version is deployed, old cached chunks may no longer exist
 * This detects such errors and forces a page reload to get fresh assets
 */
const handleChunkError = (error: unknown): boolean => {
  const chunkFailedMessage = /Loading chunk [\d]+ failed/
  const cssChunkFailedMessage = /Loading CSS chunk [\d]+ failed/
  const dynamicImportMessage = /Failed to fetch dynamically imported module/
  const syntaxErrorMessage = /Unexpected token '<'/

  const errorMessage = error instanceof Error ? error.message : String(error)

  if (
    chunkFailedMessage.test(errorMessage) ||
    cssChunkFailedMessage.test(errorMessage) ||
    dynamicImportMessage.test(errorMessage) ||
    syntaxErrorMessage.test(errorMessage)
  ) {
    // Only reload if we haven't already tried (prevent infinite reload loops)
    const reloadKey = 'swetrix-chunk-reload'
    const lastReload = sessionStorage.getItem(reloadKey)
    const now = Date.now()

    // Allow reload if never reloaded or last reload was more than 30 seconds ago
    if (!lastReload || now - parseInt(lastReload, 10) > 30000) {
      sessionStorage.setItem(reloadKey, now.toString())
      window.location.reload()
      return true
    }
  }
  return false
}

// Global error handler for uncaught chunk loading errors
window.addEventListener('error', (event) => {
  handleChunkError(event.error)
})

// Handle unhandled promise rejections (dynamic imports)
window.addEventListener('unhandledrejection', (event) => {
  if (handleChunkError(event.reason)) {
    event.preventDefault()
  }
})

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
