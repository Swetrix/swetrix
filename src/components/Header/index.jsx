import React from 'react'
import { Link } from 'react-router-dom'
import routes from 'routes'

export default () => {

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
        </nav>
        <Link to={routes.signup} className="btn btn-outline-primary">Get started</Link>
    </header>
  )
}