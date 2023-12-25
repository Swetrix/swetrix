import ProjectProtectedPassword from 'pages/Project/ProjectProtectedPassword'
import type { LoaderArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { json } from '@remix-run/node'

import { detectTheme, isEmbedded, getProjectPassword, isAuthenticated } from 'utils/server'

export async function loader({ request }: LoaderArgs) {
  const embedded = isEmbedded(request)
  const queryPassword = getProjectPassword(request)
  const [theme] = detectTheme(request)
  const isAuth = isAuthenticated(request)

  return json({
    theme,
    embedded,
    queryPassword,
    isAuth,
  })
}

export default function Index() {
  const { theme, embedded, isAuth } = useLoaderData<typeof loader>()

  return <ProjectProtectedPassword ssrTheme={theme} embedded={embedded} isAuth={isAuth} />
}
