import CaptchaView from 'pages/Captcha/View'
import type { LinksFunction } from '@remix-run/node'
import ProjectViewStyle from 'styles/ProjectViewStyle.css'

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: ProjectViewStyle }]

export default function Index() {
  return <CaptchaView />
}
