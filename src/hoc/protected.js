import { useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import routes from 'routes'

export const auth = {
  authenticated: {
    selector: state => state.auth.authenticated,
    redirectPath: routes.signin,
  },
  notAuthenticated: {
    selector: state => !state.auth.authenticated,
    redirectPath: routes.dashboard,
  },
}

export const withAuthentication = (WrappedComponent, authParam) => {
  const WithAuthentication = (params) => {
    const selector = useSelector(authParam.selector)
    const history = useHistory()
    
    if (!selector) {
      history.push(authParam.redirectPath)
    }

    return <WrappedComponent {...params} />
  }

  return WithAuthentication
}
