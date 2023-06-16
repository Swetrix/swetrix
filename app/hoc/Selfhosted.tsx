import React, { useEffect } from 'react'
import { useNavigate, useLocation } from '@remix-run/react'
import _includes from 'lodash/includes'

import { isSelfhosted } from 'redux/constants'
import routes from 'routesPath'

const selfHostedBlacklist = [
  routes.signup, routes.reset_password, routes.new_password_form, routes.main,
  routes.verify, routes.change_email, routes.billing, routes.open,
]

const DEFAULT_PAGE = routes.signin

interface ISelfhosted {
  children: JSX.Element
}

const Selfhosted: React.FC<ISelfhosted> = ({ children }): JSX.Element => {
  const navigate = useNavigate()
  const location = useLocation()

  // eslint-disable-next-line consistent-return
  useEffect(() => {
    if (isSelfhosted) {
      if (_includes(selfHostedBlacklist, location.pathname)) {
        navigate(DEFAULT_PAGE)
      }
    }
  // TODO: Investigate this later. https://github.com/remix-run/react-router/discussions/8465
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  return children
}

export default Selfhosted
