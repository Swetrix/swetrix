import About from 'pages/About'
import type { V2_MetaFunction } from '@remix-run/node'

export const meta: V2_MetaFunction = () => {
  return [
    { title: 'About' },
    {
      name: 'description',
      content: 'About page',
    },
    {
      name: 'keywords',
      content: 'about',
    },
  ]
}

export default function Index() {
  return <About />
}
