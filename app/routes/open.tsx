import OpenStartup from 'pages/OpenStartup'
import { redirect } from '@remix-run/node'
import type { LinksFunction } from '@remix-run/node'
import { isSelfhosted } from 'redux/constants'

import Style from 'styles/ProjectViewStyle.css'

export const links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: Style }]
}

export async function loader() {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  return null
}

export default function Index() {
  return <OpenStartup />
}
