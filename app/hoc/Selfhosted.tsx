import React, { useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import _includes from 'lodash/includes'

import { isSelfhosted } from 'redux/constants'
import routes from 'routes'

const selfHostedBlacklist = [
  routes.signup, routes.reset_password, routes.new_password_form, routes.main,
  routes.verify, routes.change_email, routes.billing, routes.open,
]

const DEFAULT_PAGE = routes.signin

interface ISelfhosted {
  children: JSX.Element
}

const Selfhosted: React.FC<ISelfhosted> = ({ children }): JSX.Element => {
  const history = useHistory()

  // eslint-disable-next-line consistent-return
  useEffect(() => {
    if (isSelfhosted) {
      if (_includes(selfHostedBlacklist, window.location.pathname)) {
        history.push(DEFAULT_PAGE)
      }

      const unlisten = history.listen(({ pathname }: any) => {
        if (_includes(selfHostedBlacklist, pathname)) {
          history.push(DEFAULT_PAGE)
        }
      })
      return unlisten
    }
  }, [history])

  return children
}

export default Selfhosted
