import type { LoaderFunctionArgs } from 'react-router'
import { useLoaderData } from 'react-router'

import ProjectProtectedPassword from '~/pages/Project/ProjectProtectedPassword'
import { isEmbedded, isAuthenticated } from '~/utils/server'

export async function loader({ request }: LoaderFunctionArgs) {
  const embedded = isEmbedded(request)
  const isAuth = isAuthenticated(request)

  return {
    embedded,
    isAuth,
  }
}

export default function ProjectProtectedPasswordRoute() {
  const { embedded, isAuth } = useLoaderData<typeof loader>()

  return <ProjectProtectedPassword embedded={embedded} isAuth={isAuth} />
}
