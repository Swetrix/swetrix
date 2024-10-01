import { connect } from 'react-redux'
import type i18next from 'i18next'
import sagaActions from 'redux/sagas/actions'
import { authActions } from 'redux/reducers/auth'
import { AppDispatch } from 'redux/store'
import { IUser } from 'redux/models/IUser'
import Signin from './Signin'

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  login: (
    data: {
      email: string
      password: string
      dontRemember: boolean
    },
    callback: () => void,
  ) => {
    dispatch(sagaActions.loginAsync(data, callback))
  },
  loginSuccess: (user: IUser) => {
    dispatch(authActions.loginSuccessful(user))
    dispatch(sagaActions.loadProjects())
    dispatch(sagaActions.loadSharedProjects())
  },
  authSSO: (provider: string, dontRemember: boolean, t: typeof i18next.t, callback: (res: any) => void) => {
    dispatch(sagaActions.authSSO(provider, dontRemember, t, callback))
  },
})

export default connect(null, mapDispatchToProps)(Signin)
