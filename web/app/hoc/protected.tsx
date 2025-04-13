import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'

import { useAuth } from '~/providers/AuthProvider'
import routes from '~/utils/routes'

interface AuthParamType {
  shouldBeAuthenticated: boolean
  redirectPath: string
}

type PropsType = Record<string, any>

export const auth = {
  authenticated: {
    shouldBeAuthenticated: true,
    redirectPath: routes.signin,
  },
  notAuthenticated: {
    shouldBeAuthenticated: false,
    redirectPath: routes.dashboard,
  },
}

export const withAuthentication = <P extends PropsType>(WrappedComponent: any, authParam: AuthParamType) => {
  const WithAuthentication = (props: P) => {
    const { shouldBeAuthenticated, redirectPath } = authParam
    const navigate = useNavigate()
    const { isAuthenticated } = useAuth()

    // We need to use ref to avoid 404 errors - https://github.com/remix-run/react-router/pull/12853
    const navigating = useRef(false)

    useEffect(() => {
      if (navigating.current) {
        return
      }

      if (shouldBeAuthenticated !== isAuthenticated) {
        navigate(redirectPath)
        navigating.current = true
      }
      // TODO: Investigate this later. https://github.com/remix-run/react-router/discussions/8465
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, shouldBeAuthenticated])

    // if (!selector) {
    //   return null
    // }

    return <WrappedComponent {...props} />
  }

  return WithAuthentication
}
