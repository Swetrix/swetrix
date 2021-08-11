import { connect } from 'react-redux'
import { errorsActions } from 'redux/actions/errors'
import { alertsActions } from 'redux/actions/alerts'
import ForgotPassword from './ForgotPassword'

const mapDispatchToProps = (dispatch) => ({
  createNewPasswordFailed: (e) => {
    dispatch(errorsActions.createNewPasswordFailed(e.toString()))
  },
  newPassword: (message) => {
    dispatch(alertsActions.newPassword(message))
  },
})

export default connect(null, mapDispatchToProps)(ForgotPassword)
