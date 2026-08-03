import { PassThrough } from 'node:stream'

import { createReadableStreamFromReadable } from '@react-router/node'
import { isbot } from 'isbot'
import { renderToPipeableStream } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { ServerRouter } from 'react-router'
import type { EntryContext, RouterContextProvider } from 'react-router'
import { createSitemapGenerator } from 'remix-sitemap'

import { getInstance } from './i18next.server'
import { isSelfhosted, MAIN_URL } from './lib/constants'

// Reject/cancel all pending promises after 5 seconds
const streamTimeout = 5000

const { sitemap } = createSitemapGenerator({
  siteUrl: MAIN_URL,
  autoLastmod: false,
  priority: 0.8,
})

function getSitemapIndexResponse() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${MAIN_URL}/sitemap-pages.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${MAIN_URL}/docs/sitemap.xml</loc>
  </sitemap>
</sitemapindex>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  routerContext: RouterContextProvider,
) {
  const url = new URL(request.url)

  if (!isSelfhosted && url.pathname === '/sitemap.xml') {
    return getSitemapIndexResponse()
  }

  if (url.pathname === '/sitemap-pages.xml') {
    const sitemapRequest = new Request(
      request.url.replace('/sitemap-pages.xml', '/sitemap.xml'),
      { headers: request.headers },
    )
    // @ts-expect-error
    return await sitemap(sitemapRequest, reactRouterContext)
  }

  const callbackName = isbot(request.headers.get('user-agent'))
    ? 'onAllReady'
    : 'onShellReady'

  return new Promise((resolve, reject) => {
    let didError = false

    const { pipe, abort } = renderToPipeableStream(
      <I18nextProvider i18n={getInstance(routerContext)}>
        <ServerRouter context={reactRouterContext} url={request.url} />
      </I18nextProvider>,
      {
        [callbackName]: () => {
          const body = new PassThrough()
          const stream = createReadableStreamFromReadable(body)

          responseHeaders.set('Content-Type', 'text/html')
          // Prevent HTML from being cached so users always get fresh chunk references after deployments
          responseHeaders.set(
            'Cache-Control',
            'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          )
          responseHeaders.set('Pragma', 'no-cache')
          responseHeaders.set('Expires', '0')
          responseHeaders.append('Vary', 'Cookie')

          // Remove headers that might trigger 304 Not Modified
          responseHeaders.delete('ETag')
          responseHeaders.delete('Last-Modified')

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
