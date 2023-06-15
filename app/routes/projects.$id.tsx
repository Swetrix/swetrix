import ViewProject from 'pages/Project/View'
import type { V2_MetaFunction, LinksFunction } from '@remix-run/node'
import ProjectViewStyle from 'styles/ProjectViewStyle.css'

export const meta: V2_MetaFunction = () => {
  return [
    {
      title: 'View Project',
      description: 'View Project',
    },
  ]
}

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: ProjectViewStyle },
]

export default function Index() {
  return <ViewProject />
}
