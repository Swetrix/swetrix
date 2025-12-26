import { redirect } from 'react-router'

import { isSelfhosted } from '~/lib/constants'

export async function loader() {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  return redirect('/', 302)
}

export default function ReferralPageRoute() {
  return null
}
