import CaptchaView from 'pages/Captcha/View'
import type { V2_MetaFunction, LinksFunction } from '@remix-run/node'
import ProjectViewStyle from 'styles/ProjectViewStyle.css'

export const meta: V2_MetaFunction = () => {
  return [
    {
      title: 'Captcha View',
      description: 'Captcha View',
    },
  ]
}

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: ProjectViewStyle },
]

export default function Index() {
  return <CaptchaView />
}
