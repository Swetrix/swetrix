import OpenStartup from 'pages/OpenStartup'
import { redirect } from '@remix-run/node'
import { isSelfhosted } from 'redux/constants'

export async function loader() {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  return null
}

export default function Index() {
  return <OpenStartup />
}
