import ViewProject from 'pages/Project/View'
import type { LinksFunction } from '@remix-run/node'
import ProjectViewStyle from 'styles/ProjectViewStyle.css'


export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: ProjectViewStyle },
]

export default function Index() {
  return <ViewProject />
}
