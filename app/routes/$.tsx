import type { LoaderFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import NotFound from 'pages/NotFound'

export const loader: LoaderFunction = () => {
  return json(null, { status: 404 });
};

export default function Index() {
  return <NotFound />
}
