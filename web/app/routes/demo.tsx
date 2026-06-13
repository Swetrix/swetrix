import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { SitemapFunction } from 'remix-sitemap'

import { DEMO_PROJECT_ID, LIVE_DEMO_URL } from '~/lib/constants'
import ViewProject from '~/pages/Project/View'
import { CurrentProjectProvider } from '~/providers/CurrentProjectProvider'

import {
  action as projectAction,
  links as projectLinks,
  loader as projectLoader,
  meta as projectMeta,
} from './projects.$id'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

const withDemoProject = <T extends LoaderFunctionArgs | ActionFunctionArgs>(
  args: T,
): T => ({
  ...args,
  params: {
    ...args.params,
    id: DEMO_PROJECT_ID,
  },
})

export const links = projectLinks
export const meta = projectMeta

export const loader = async (args: LoaderFunctionArgs) => {
  return projectLoader(withDemoProject(args))
}

export const action = async (args: ActionFunctionArgs) => {
  return projectAction(withDemoProject(args))
}

export default function Demo() {
  return (
    <CurrentProjectProvider id={DEMO_PROJECT_ID} projectPath={LIVE_DEMO_URL}>
      <ViewProject />
    </CurrentProjectProvider>
  )
}
