import { connect } from 'react-redux'

import { authActions } from 'redux/actions/auth'
import { errorsActions } from 'redux/actions/errors'
import UIActions from 'redux/actions/ui'
import Signin from './Signin'

const mapDispatchToProps = (dispatch) => ({
  login: (data, callback) => {
    dispatch(authActions.loginAsync(data, callback))
  },
  loginSuccess: (user) => {
    dispatch(authActions.loginSuccess(user))
    dispatch(UIActions.loadProjects())
    dispatch(UIActions.loadSharedProjects())
  },
  loginFailed: (error) => {
    dispatch(errorsActions.loginFailed(error))
  },
})

export default connect(null, mapDispatchToProps)(Signin)
