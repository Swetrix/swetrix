import CaptchaView from 'pages/Captcha/View'
import { json, type LinksFunction, type LoaderFunctionArgs } from '@remix-run/node'
import ProjectViewStyle from 'styles/ProjectViewStyle.css'
import { detectTheme } from 'utils/server'
import { useLoaderData } from '@remix-run/react'

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: ProjectViewStyle }]

export async function loader({ request }: LoaderFunctionArgs) {
  const [theme] = detectTheme(request)

  return json({
    theme,
  })
}

export default function Index() {
  const { theme } = useLoaderData<typeof loader>()

  return <CaptchaView ssrTheme={theme} />
}
