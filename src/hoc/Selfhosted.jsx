import React, { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import _includes from 'lodash/includes'

import { isSelfhosted } from 'redux/constants'
import routes from 'routes'

const selfHostedBlacklist = [
  routes.signup, routes.reset_password, routes.new_password_form, routes.main, routes.user_settings, routes.verify, routes.change_email, routes.billing,
]

const DEFAULT_PAGE = routes.signin

const Selfhosted = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (isSelfhosted) {
      if (_includes(selfHostedBlacklist, location.pathname)) {
        navigate(DEFAULT_PAGE)
      }
    }
  }, [location, navigate])

  return <>{children}</>
  
}

export default Selfhosted
