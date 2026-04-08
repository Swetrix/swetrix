import { type LoaderFunctionArgs } from 'react-router'

import { isSelfhosted, isDevelopment } from '~/lib/constants'

const ALLOWED_ORIGIN_RE = /^https?:\/\/([a-z0-9-]+\.)*swetrix\.com(\/|$)/i

const CACHE_TTL = 60 * 60 * 24 * 7 // 7 days
const STALE_TTL = 60 * 60 * 24 * 30 // 30 days

const FALLBACK_ICO = '/assets/icons/chain.svg'

function isOriginAllowed(request: Request): boolean {
  if (isSelfhosted || isDevelopment) return true

  const origin =
    request.headers.get('Origin') || request.headers.get('Referer') || ''

  return ALLOWED_ORIGIN_RE.test(origin.replace(/\/+$/, ''))
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (!isOriginAllowed(request)) {
    return new Response(null, { status: 403 })
  }

  const url = new URL(request.url)
  const domain = url.searchParams.get('domain')

  if (!domain || !/^[a-z0-9._-]+\.[a-z]{2,}$/i.test(domain)) {
    return Response.redirect(new URL(FALLBACK_ICO, url.origin).toString(), 302)
  }

  try {
    const upstream = await fetch(
      `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`,
      { signal: AbortSignal.timeout(4000) },
    )

    if (!upstream.ok || !upstream.body) {
      return Response.redirect(
        new URL(FALLBACK_ICO, url.origin).toString(),
        302,
      )
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'image/x-icon',
        'Cache-Control': `public, max-age=${CACHE_TTL}, stale-while-revalidate=${STALE_TTL}`,
      },
    })
  } catch {
    return Response.redirect(new URL(FALLBACK_ICO, url.origin).toString(), 302)
  }
}
