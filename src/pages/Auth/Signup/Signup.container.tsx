import { connect } from 'react-redux'
import { AppDispatch } from 'redux/store'
import sagaActions from 'redux/sagas/actions'
import Signup from './Signup'

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  signup: (data: {
    email: string,
    password: string,
    repeat: string,
    dontRemember: boolean,
    checkIfLeaked: boolean,
  }, t: (key: string, optinions?: {
    [key: string]: string | number,
  }) => string, callback: (res: any) => void) => {
    dispatch(sagaActions.signupAsync(data, t, callback))
  },
  authSSO: (dontRemember: boolean, t: (key: string) => string, callback: (res: any) => void) => {
    dispatch(sagaActions.authSSO(dontRemember, t, callback))
  },
})

export default connect(null, mapDispatchToProps)(Signup)
