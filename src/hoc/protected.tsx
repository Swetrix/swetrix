import { useSelector } from 'react-redux'
import { Redirect } from 'react-router-dom'

import { StateType } from 'redux/store'
import routes from 'routes'

type AuthParamType = {
  selector: (state: StateType) => boolean,
  redirectPath: string
}

type PropsType = {
  [key: string]: any
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

export const withAuthentication = <P extends PropsType>(WrappedComponent: any, authParam: AuthParamType) => {
  const WithAuthentication = (props: P) => {
    const selector = useSelector(authParam.selector)

    if (!selector) {
      return <Redirect to={authParam.redirectPath} />
    }

    return <WrappedComponent {...props} />
  }

  return WithAuthentication
}
