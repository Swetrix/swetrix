import type { LinksFunction, LoaderFunctionArgs } from 'react-router'
import { useLoaderData } from 'react-router'

import CaptchaView from '~/pages/Captcha/View'
import ProjectViewStyle from '~/styles/ProjectViewStyle.css?url'
import { detectTheme } from '~/utils/server'

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: ProjectViewStyle }]

export async function loader({ request }: LoaderFunctionArgs) {
  const [theme] = detectTheme(request)

  return {
    theme,
  }
}

export default function Index() {
  const { theme } = useLoaderData<typeof loader>()

  return <CaptchaView ssrTheme={theme} />
}
