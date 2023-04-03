import { useSelector } from 'react-redux'
import { Redirect } from 'react-router-dom'

import { StateType } from 'redux/store'
import routes from 'routes'

type AuthParamType = {
  selector: (state: StateType) => boolean,
  redirectPath: string
}

export const auth = {
  authenticated: {
    selector: (state: StateType) => state.auth.authenticated,
    redirectPath: routes.signin,
  },
  notAuthenticated: {
    selector: (state: StateType) => !state.auth.authenticated,
    redirectPath: routes.dashboard,
  },
}

export const withAuthentication = (WrappedComponent: any, authParam: AuthParamType) => {
  const WithAuthentication = (params: any) => {
    const selector = useSelector(authParam.selector)

    if (!selector) {
      return <Redirect to={authParam.redirectPath} />
    }

    return <WrappedComponent {...params} />
  }

  return WithAuthentication
}
