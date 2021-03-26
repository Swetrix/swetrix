import React from 'react'
import { Link } from 'react-router-dom'
import routes from 'routes'

export default () => {

  return (
    <div className="container">
      <h4 className="mb-3">Sign up</h4>
      <form className="needs-validation" noValidate>
        <div className="mb-3">
          <label htmlFor="email">Email</label>
          <input type="email" placeholder="you@email.com" id="email" className="form-control"/>
        </div>
        <div className="mb-3">
          <label htmlFor="password">Password</label>
          <input type="password" placeholder="Password" id="password" className="form-control"/>
        </div>
        <div className="mb-3">
          <label htmlFor="repeat">Repeat password</label>
          <input type="password" placeholder="Repeat password" id="repeat" className="form-control"/>
        </div>
        <div className="custom-control custom-checkbox">
          <input type="checkbox" id="tos" className="custom-control-input" />
          <label htmlFor="tos" className="custom-control-label">I do accept terms and conditions and the privacy policy.</label>
        </div>
        <div className="custom-control custom-checkbox">
          <input type="checkbox" id="keep_signedin" className="custom-control-input" />
          <label htmlFor="keep_signedin" className="custom-control-label">Don't remember me.</label>
        </div>
        <div className="d-flex align-items-center mb-3">
          <Link to={routes.signin} className="btn btn-link">Sign in instead</Link>
          <button className="btn btn-primary ml-auto">Sign up!</button>
        </div>
      </form>
    </div>
  )
}