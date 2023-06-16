import ProjectSettings from 'pages/Project/Settings'
import type { V2_MetaFunction } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

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
