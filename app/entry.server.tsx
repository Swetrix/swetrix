import type { EntryContext } from '@remix-run/node'
import { PassThrough } from 'node:stream'
import { resolve } from 'node:path'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import FSBackend from 'i18next-fs-backend'
import { Response } from '@remix-run/node'
import { RemixServer } from '@remix-run/react'
import isbot from 'isbot'
import { renderToPipeableStream } from 'react-dom/server'
import { createSitemapGenerator } from 'remix-sitemap'

import i18next from './i18next.server'
import i18n, { detectLanguage } from './i18n'

const ABORT_DELAY = 5_000

// TODO: Exclude /project/* endpoints from sitemap
const { isSitemapUrl, sitemap } = createSitemapGenerator({
  siteUrl: 'https://swetrix.com',
  autoLastmod: false,
  priority: 0.8
})

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  if (isSitemapUrl(request)) {
    return await sitemap(request, remixContext)
  }

  const instance = createInstance()
  const lng = detectLanguage(request)
  const ns = i18next.getRouteNamespaces(remixContext)

  await instance
    .use(initReactI18next)
    .use(FSBackend)
    .init({
      ...i18n,
      lng,
      ns,
      backend: {
        loadPath: resolve('./public/locales/{{lng}}.json')
      },
    })

  const callbackName = isbot(request.headers.get('user-agent'))
    ? 'onAllReady'
    : 'onShellReady'

  return new Promise((resolve, reject) => {
    let didError = false

    const { pipe, abort } = renderToPipeableStream(
      <I18nextProvider i18n={instance}>
        <RemixServer
          context={remixContext}
          url={request.url}
          abortDelay={ABORT_DELAY}
        />
      </I18nextProvider>,
      {
        [callbackName]: () => {
          const body = new PassThrough()
          responseHeaders.set('Content-Type', 'text/html')
          resolve(
            new Response(body, {
              headers: responseHeaders,
              status: didError ? 500 : responseStatusCode,
            }),
          )
          pipe(body)
        },
        onShellError(error: unknown) {
          reject(error)
        },
        onError(error: unknown) {
          console.error(error)
          didError = true
        },
      },
    )

    setTimeout(abort, ABORT_DELAY)
  })
}
