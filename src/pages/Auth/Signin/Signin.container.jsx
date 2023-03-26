import { connect } from 'react-redux'

import { authActions } from 'redux/reducers/auth'
import { errorsActions } from 'redux/reducers/errors'
import UIActions from 'redux/reducers/ui'
import Signin from './Signin'

const mapDispatchToProps = (dispatch) => ({
  login: (data, callback) => {
    dispatch(authActions.loginAsync(data, callback))
  },
  loginSuccess: (user) => {
    dispatch(authActions.loginSuccessful(user))
    dispatch(UIActions.loadProjects())
    dispatch(UIActions.loadSharedProjects())
  },
  loginFailed: (error) => {
    dispatch(errorsActions.loginFailed(error))
  },
})

export default connect(null, mapDispatchToProps)(Signin)
