import React, { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from '@remix-run/react'

import { getAccessToken } from 'utils/accessToken'
import { StateType } from 'redux/store'
import routes from 'routesPath'

type AuthParamType = {
  shouldBeAuthenticated: boolean
  redirectPath: string
}

type PropsType = {
  [key: string]: any
}

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
  const accessToken = getAccessToken()

  const WithAuthentication = (props: P) => {
    const {
      shouldBeAuthenticated, redirectPath,
    } = authParam
    const {
      authenticated: reduxAuthenticated,
      loading,
    } = useSelector((state: StateType) => state.auth)
    const navigate = useNavigate()
    const authenticated = loading ? !!accessToken : reduxAuthenticated

    useEffect(() => {
      if (shouldBeAuthenticated !== authenticated) {
        navigate(redirectPath)
      }
    // TODO: Investigate this later. https://github.com/remix-run/react-router/discussions/8465
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authenticated, shouldBeAuthenticated])

    // if (!selector) {
    //   return null
    // }

    return <WrappedComponent {...props} />
  }

  return WithAuthentication
}
