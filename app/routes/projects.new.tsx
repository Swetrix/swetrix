import ProjectSettings from 'pages/Project/Settings'
import type { V2_MetaFunction } from '@remix-run/node'

export const meta: V2_MetaFunction = () => {
  return [
    {
      title: 'Project Settings',
    },
    {
      name: 'description',
      content: 'Project Settings',
    },
  ]
}

export default function Index() {
  return <ProjectSettings />
}
