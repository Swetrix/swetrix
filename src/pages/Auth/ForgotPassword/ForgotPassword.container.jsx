import { useDispatch } from 'react-redux'
import { useHistory } from 'react-router-dom'

import ForgotPassword from './ForgotPassword'
import { forgotPassword } from 'api'
import { errorsActions } from 'redux/actions/errors'
import { alertsActions } from 'redux/actions/alerts'
import routes from 'routes'

const ForgotPasswordContainer = () => {
  const dispatch = useDispatch()
  const history = useHistory()

  const onSubmit = async (data) => {
    try {
      await forgotPassword(data)

      dispatch(alertsActions.newPassword('A password reset e-mail has been sent to the specified address'))
      history.push(routes.main)
    } catch (e) {
      dispatch(errorsActions.createNewPasswordFailed(e.toString()))
    }
  }

  return (
    <ForgotPassword onSubmit={onSubmit} />
  )
}

export default ForgotPasswordContainer
