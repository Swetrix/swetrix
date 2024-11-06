import { redirect } from '@remix-run/node'
import About from 'pages/About'
import { isSelfhosted } from 'redux/constants'

export async function loader() {
  if (isSelfhosted) {
    return redirect('/dashboard', 302)
  }

  return null
}

export default function Index() {
  return <About />
}
