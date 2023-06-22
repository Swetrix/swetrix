import ProjectSettings from 'pages/Project/Settings'
import type { LinksFunction } from '@remix-run/node'
import ProjectSettingsStyle from 'styles/ProjectSettings.css'

export const links: LinksFunction = () => {
  return [
    // { rel: 'stylesheet', href: ProjectSettingsStyle },
  ]
}

export default function Index() {
  return <ProjectSettings />
}
