import type { LoaderFunctionArgs } from 'react-router'
import { useLoaderData } from 'react-router'

import ProjectProtectedPassword from '~/pages/Project/ProjectProtectedPassword'
import { isEmbedded } from '~/utils/server'

export async function loader({ request }: LoaderFunctionArgs) {
  const embedded = isEmbedded(request)

  return {
    embedded,
  }
}

export default function ProjectProtectedPasswordRoute() {
  const { embedded } = useLoaderData<typeof loader>()

  return <ProjectProtectedPassword embedded={embedded} />
}
