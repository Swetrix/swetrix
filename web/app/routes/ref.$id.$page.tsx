import type { LoaderFunctionArgs } from 'react-router'
import { redirect } from 'react-router'

import { isSelfhosted } from '~/lib/constants'

export async function loader({ params }: LoaderFunctionArgs) {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  const { page } = params

  const init = {
    status: 302,
  }

  const redirectPath = page === 'index' ? '/' : `/${page}`

  return redirect(redirectPath, init)
}
