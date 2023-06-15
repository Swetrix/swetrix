import CaptchaSettings from 'pages/Captcha/Settings'
import type { V2_MetaFunction } from '@remix-run/node'

export const meta: V2_MetaFunction = () => {
  return [
    {
      title: 'Captcha Settings',
      description: 'Captcha Settings',
    },
  ]
}

export default function Index() {
  return <CaptchaSettings />
}
