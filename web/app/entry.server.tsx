import { resolve as feResolve } from 'node:path'
import { PassThrough } from 'node:stream'

import { createReadableStreamFromReadable } from '@react-router/node'
import { createInstance } from 'i18next'
import FSBackend from 'i18next-fs-backend'
import { isbot } from 'isbot'
import { renderToPipeableStream } from 'react-dom/server'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { ServerRouter } from 'react-router'
import type { EntryContext } from 'react-router'
import { createSitemapGenerator } from 'remix-sitemap'

import i18n, { detectLanguage } from './i18n'
import i18next from './i18next.server'
import { MAIN_URL } from './lib/constants'

// Reject/cancel all pending promises after 5 seconds
const streamTimeout = 5000

const { isSitemapUrl, sitemap } = createSitemapGenerator({
  siteUrl: MAIN_URL,
  autoLastmod: false,
  priority: 0.8,
})

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
) {
  if (isSitemapUrl(request)) {
    // @ts-expect-error
    const stm = await sitemap(request, reactRouterContext)
    return stm
  }

  const instance = createInstance()
  const lng = detectLanguage(request)
  const ns = i18next.getRouteNamespaces(reactRouterContext)

  await instance
    .use(initReactI18next)
    .use(FSBackend)
    .init({
      ...i18n,
      lng,
      ns,
      backend: {
        loadPath: feResolve('./public/locales/{{lng}}.json'),
      },
    })

  const callbackName = isbot(request.headers.get('user-agent')) ? 'onAllReady' : 'onShellReady'

  return new Promise((resolve, reject) => {
    let didError = false

    const { pipe, abort } = renderToPipeableStream(
      <I18nextProvider i18n={instance}>
        <ServerRouter context={reactRouterContext} url={request.url} />
      </I18nextProvider>,
      {
        [callbackName]: () => {
          const body = new PassThrough()
          const stream = createReadableStreamFromReadable(body)

          responseHeaders.set('Content-Type', 'text/html')
          // Prevent HTML from being cached so users always get fresh chunk references after deployments
          responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate')

          resolve(
            new Response(stream, {
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

    // Automatically timeout the React renderer after 6 seconds, which ensures
    // React has enough time to flush down the rejected boundary contents
    setTimeout(abort, streamTimeout + 1000)
  })
}
