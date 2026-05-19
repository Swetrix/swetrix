import { useEffect, useState } from 'react'

import {
  isLastAuthMethod,
  LAST_AUTH_METHOD_COOKIE,
  type LastAuthMethod,
} from '~/utils/authMethod'
import { getCookie } from '~/utils/cookie'

export const useLastAuthMethod = () => {
  const [lastAuthMethod, setLastAuthMethod] = useState<LastAuthMethod | null>(
    null,
  )

  useEffect(() => {
    const authMethod = getCookie(LAST_AUTH_METHOD_COOKIE)
    setLastAuthMethod(isLastAuthMethod(authMethod) ? authMethod : null)
  }, [])

  return lastAuthMethod
}
