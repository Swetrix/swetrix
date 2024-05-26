import { connect } from 'react-redux'
import type i18next from 'i18next'
import { AppDispatch, StateType } from 'redux/store'
import sagaActions from 'redux/sagas/actions'
import Signup from './Signup'

const mapStateToProps = (state: StateType) => {
  return {
    authenticated: state.auth.authenticated,
    loading: state.auth.loading,
  }
}

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  signup: (
    data: {
      email: string
      password: string
      repeat: string
      dontRemember: boolean
      checkIfLeaked: boolean
    },
    t: typeof i18next.t,
    callback: (res: any) => void,
  ) => {
    dispatch(sagaActions.signupAsync(data, t, callback))
  },
  authSSO: (provider: string, dontRemember: boolean, t: typeof i18next.t, callback: (res: any) => void) => {
    dispatch(sagaActions.authSSO(provider, dontRemember, t, callback))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(Signup)
