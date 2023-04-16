import { connect } from 'react-redux'

import sagaActions from 'redux/sagas/actions'
import { authActions } from 'redux/reducers/auth'
import { errorsActions } from 'redux/reducers/errors'
import { AppDispatch } from 'redux/store'
import { IUser } from 'redux/models/IUser'
import Signin from './Signin'

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  login: (data: {
    email: string,
    password: string,
    dontRemember: boolean
  }, callback: () => void) => {
    dispatch(sagaActions.loginAsync(data, callback))
  },
  loginSuccess: (user: IUser) => {
    dispatch(authActions.loginSuccessful(user))
    dispatch(sagaActions.loadProjects())
    dispatch(sagaActions.loadSharedProjects())
  },
  loginFailed: (error: string) => {
    dispatch(errorsActions.loginFailed({
      message: error,
    }))
  },
  authSSO: (dontRemember: boolean, t: (key: string) => string, callback: (res: any) => void) => {
    console.log('dispatching authSSO')
    dispatch(sagaActions.authSSO(dontRemember, t, callback))
  },
})

export default connect(null, mapDispatchToProps)(Signin)
