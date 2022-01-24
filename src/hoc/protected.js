import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
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
    const history = useNavigate()
    
    if (!selector) {
      history(authParam.redirectPath)
    }

    return <WrappedComponent {...params} />
  }

  return WithAuthentication
}
