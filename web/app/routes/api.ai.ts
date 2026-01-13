import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  data,
} from 'react-router'

import { streamingServerFetch } from '~/api/api.server'

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.json()
  const { pid, messages, timezone } = body

  if (!pid || !messages) {
    return data({ error: 'pid and messages are required' }, { status: 400 })
  }

  try {
    const response = await streamingServerFetch(request, `ai/${pid}/chat`, {
      method: 'POST',
      body: { messages, timezone },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return data(
        {
          error: errorData.message || `HTTP error! status: ${response.status}`,
        },
        { status: response.status },
      )
    }

    // Stream the response back to the client
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[api.ai] Proxy request failed:', error)
    return data(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

export async function loader({ request: _request }: LoaderFunctionArgs) {
  return data({ error: 'Use POST method' }, { status: 405 })
}
