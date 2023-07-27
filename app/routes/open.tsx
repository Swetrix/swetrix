import OpenStartup from 'pages/OpenStartup'
import { redirect } from '@remix-run/node'
import { isSelfhosted } from 'redux/constants'

export async function loader() {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }
}

export default function Index() {
  return <OpenStartup />
}
