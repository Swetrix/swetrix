import ProjectProtectedPassword from 'pages/Project/ProjectProtectedPassword'
import type { V2_MetaFunction } from '@remix-run/node'

export const meta: V2_MetaFunction = () => {
  return [
    {
      title: 'Project Password',
      description: 'Project Password',
    },
  ]
}

export default function Index() {
  return <ProjectProtectedPassword />
}
