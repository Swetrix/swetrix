import type { LoaderFunctionArgs } from 'react-router'
import { useLoaderData } from 'react-router'

import ProjectProtectedPassword from '~/pages/Project/ProjectProtectedPassword'
import { detectTheme, isEmbedded, isAuthenticated } from '~/utils/server'

export async function loader({ request }: LoaderFunctionArgs) {
  const embedded = isEmbedded(request)
  const [theme] = detectTheme(request)
  const isAuth = isAuthenticated(request)

  return {
    theme,
    embedded,
    isAuth,
  }
}

export default function Index() {
  const { theme, embedded, isAuth } = useLoaderData<typeof loader>()

  return <ProjectProtectedPassword ssrTheme={theme} embedded={embedded} isAuth={isAuth} />
}
