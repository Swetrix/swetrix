import ViewProject from 'pages/Project/View'
import type { LinksFunction, LoaderArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { json } from '@remix-run/node'
import { detectTheme } from 'utils/server'
import ProjectViewStyle from 'styles/ProjectViewStyle.css'

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: ProjectViewStyle },
]

export async function loader({ request }: LoaderArgs) {
  const theme = detectTheme(request)

  return json({ theme })
}

export default function Index() {
  const {
    theme,
  } = useLoaderData<typeof loader>()

  return <ViewProject ssrTheme={theme} />
}
