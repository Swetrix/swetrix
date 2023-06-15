import ProjectAlertsSettings from 'pages/Project/Alerts/Settings'
import type { V2_MetaFunction } from '@remix-run/node'

export const meta: V2_MetaFunction = () => {
  return [
    {
      title: 'Project Alerts Settings',
      description: 'Project Alerts Settings',
    },
  ]
}

export default function Index() {
  return <ProjectAlertsSettings />
}
