import { redirect } from 'react-router'

import { isSelfhosted } from '~/lib/constants'
import ReferralPage from '~/pages/ReferralPage'

export async function loader() {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  return null
}

export default function ReferralPageRoute() {
  return <ReferralPage />
}
