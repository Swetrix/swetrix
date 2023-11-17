import type { LoaderFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import {BROWSER_CDN_LOGO_MAP} from 'redux/constants'

const CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/browser-logos/74.0.0'

export const loader: LoaderFunction = async ({ params }) => {
  const { slug } = params

  // @ts-ignore
  const browserLogo = BROWSER_CDN_LOGO_MAP[slug]

  const logoUrl = `${CDN_URL}/${browserLogo}`

  const response = await fetch(logoUrl)

  if (!response.ok) {
    return json(null, {
      status: 404,
    })
  }

  const buffer = await response.arrayBuffer()
  const contentType = response.headers.get('content-type')
  const contentLength = response.headers.get('content-length')

  return new Response(buffer, {
    // @ts-ignore
    headers: {
      'content-type': contentType,
      // 2 weeks
      'cache-control': 'public, max-age=1210000',
      'content-length': contentLength,
    },
  })
}
