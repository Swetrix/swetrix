import type { LoaderFunctionArgs } from 'react-router'

import { API_URL } from '~/lib/constants'
import { getCachedManagedScript } from '~/utils/managed-script-cache.server'
import {
  PUBLIC_TRACKER_LOG_URL,
  TRACKER_SCRIPT_ORIGIN,
} from '~/utils/managed-tracker'
import {
  managedTrackerVersion,
  readManagedRecorder,
  renderManagedTracker,
} from '~/utils/managed-tracker.server'

const recorderFile = `recorder-${managedTrackerVersion}.js`
const projectFile = /^((?!.*--)[a-zA-Z0-9-]{12})\.js$/
const scriptHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Content-Type': 'application/javascript; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
}

async function loadScript(pid: string) {
  const response = await fetch(`${API_URL}v1/project/${pid}/tracker-config`, {
    signal: AbortSignal.timeout(4000),
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error('Tracker settings unavailable')

  const settings = await response.json()
  if (
    typeof settings?.pageviews !== 'boolean' ||
    typeof settings.outboundLinks !== 'boolean' ||
    typeof settings.errors !== 'boolean' ||
    typeof settings.sessionReplay !== 'boolean'
  )
    throw new Error('Invalid tracker settings')

  return renderManagedTracker({
    pid,
    settings,
    apiURL: PUBLIC_TRACKER_LOG_URL,
    recorderURL: `${TRACKER_SCRIPT_ORIGIN}/p/${recorderFile}`,
  })
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const file = params.file ?? ''
  if (file === recorderFile) {
    return new Response(readManagedRecorder(), {
      headers: {
        ...scriptHeaders,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  }

  const pid = projectFile.exec(file)?.[1]
  if (!pid)
    return new Response(null, {
      status: 404,
      headers: { ...scriptHeaders, 'Cache-Control': 'no-store' },
    })

  try {
    const { body, etag, maxAge } = await getCachedManagedScript(pid, () =>
      loadScript(pid),
    )
    const headers = new Headers(scriptHeaders)
    headers.set(
      'Cache-Control',
      `public, max-age=0, s-maxage=${maxAge}, must-revalidate`,
    )
    if (body === null || !etag)
      return new Response(null, { status: 404, headers })
    headers.set('ETag', etag)
    const validators = request.headers.get('If-None-Match')?.split(/,\s*/)
    if (validators?.includes(etag) || validators?.includes('*')) {
      return new Response(null, { status: 304, headers })
    }
    return new Response(body, { headers })
  } catch {
    return new Response(null, {
      status: 503,
      headers: { ...scriptHeaders, 'Cache-Control': 'no-store' },
    })
  }
}
