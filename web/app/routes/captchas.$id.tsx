import type { LinksFunction, LoaderFunctionArgs } from 'react-router'
import { useLoaderData } from 'react-router'

import { useRequiredParams } from '~/hooks/useRequiredParams'
import ViewCaptcha from '~/pages/Captcha/View'
import { CurrentProjectProvider } from '~/pages/Project/providers/CurrentProjectProvider'
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
  const { id } = useRequiredParams<{ id: string }>()

  return (
    <CurrentProjectProvider id={id}>
      <ViewCaptcha ssrTheme={theme} />
    </CurrentProjectProvider>
  )
}
