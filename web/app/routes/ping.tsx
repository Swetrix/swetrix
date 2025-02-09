import type { LoaderFunction } from 'react-router'

export const loader: LoaderFunction = async () => {
  return new Response('pong', {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}
