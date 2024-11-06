import type { LoaderFunction } from '@remix-run/node'

export const loader: LoaderFunction = async () => {
  return new Response('pong', {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}
