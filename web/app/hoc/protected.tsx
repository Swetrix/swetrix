import { useEffect } from 'react'
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
    const { isAuthenticated, isLoading } = useAuth()

    useEffect(() => {
      if (isLoading) {
        return
      }

      if (shouldBeAuthenticated !== isAuthenticated) {
        navigate(redirectPath)
      }
      // TODO: Investigate this later. https://github.com/remix-run/react-router/discussions/8465
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, shouldBeAuthenticated, isLoading])

    return <WrappedComponent {...props} />
  }

  return WithAuthentication
}
