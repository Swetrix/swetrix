import { connect } from 'react-redux'
import { errorsActions } from 'redux/reducers/errors'
import { alertsActions } from 'redux/reducers/alerts'
import { AppDispatch } from 'redux/store'
import CreateNewPassword from './CreateNewPassword'

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  createNewPasswordFailed: (e: string) => {
    dispatch(errorsActions.createNewPasswordFailed({
      message: e,
    }))
  },
  newPassword: (message: string) => {
    dispatch(alertsActions.newPassword({
      message,
    }))
  },
})

export default connect(null, mapDispatchToProps)(CreateNewPassword)
