import type { LinksFunction } from 'react-router'

import { useRequiredParams } from '~/hooks/useRequiredParams'
import ViewCaptcha from '~/pages/Captcha/View'
import { CurrentProjectProvider } from '~/providers/CurrentProjectProvider'
import ProjectViewStyle from '~/styles/ProjectViewStyle.css?url'

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: ProjectViewStyle }]

export default function Index() {
  const { id } = useRequiredParams<{ id: string }>()

  return (
    <CurrentProjectProvider id={id}>
      <ViewCaptcha />
    </CurrentProjectProvider>
  )
}
