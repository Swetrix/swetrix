import React from 'react'
import { Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { BoxArrowRight } from 'react-bootstrap-icons'

import routes from 'routes'
import { authActions } from 'actions/auth'

const Header = ({ authenticated }) => {
  const dispatch = useDispatch()

  return (
    <header className="d-flex flex-column flex-md-row align-items-center p-3 px-md-4 mb-3 bg-white border-bottom shadow-sm">
        <Link 
          to="/" 
          className="my-0 mr-md-auto font-weight-normal">
          Analytics
        </Link>

        <nav className="my-2 my-md-0 mr-md-3">
          <Link to="/" className="p-2 text-dark">Features</Link>
          <Link to="/" className="p-2 text-dark">Pricing</Link>
          <Link to="/" className="p-2 text-dark">FAQs</Link>
          <Link to="/" className="p-2 text-dark">Docs</Link>
          { authenticated && <Link to={routes.user_settings} className="p-2 text-dark">You</Link> }
          { !authenticated && <Link to={routes.signin} className="p-2 text-dark">Sign in</Link> }
        </nav>
        { authenticated
          ? (
            <>
              <Link to={routes.dashboard} className="btn btn-outline-primary mr-3">Dashboard</Link>
              <BoxArrowRight
                className="btn-hover"
                color="#007bff"
                size="24"
                role="button"
                onClick={() => dispatch(authActions.logout())}
                />
            </>
          )
          : <Link to={routes.signup} className="btn btn-outline-primary">Get started</Link>
        }
    </header>
  )
}

export default React.memo(Header)