import { useDispatch } from 'react-redux'
import { useHistory, useParams } from 'react-router-dom'

import CreateNewPassword from './CreateNewPassword'
import { createNewPassword } from 'api'
import { errorsActions } from 'redux/actions/errors'
import { alertsActions } from 'redux/actions/alerts'
import routes from 'routes'

const CreateNewPasswordContainer = () => {
  const dispatch = useDispatch()
  const history = useHistory()
  const { id } = useParams()

  const onSubmit = async (data) => {
    try {
      const { password } = data
      await createNewPassword(id, password)

      dispatch(alertsActions.newPassword('Your password has been updated'))
      history.push(routes.signin)
    } catch (e) {
      dispatch(errorsActions.createNewPasswordFailed(e.toString()))
    }
  }

  return (
    <CreateNewPassword onSubmit={onSubmit} />
  )
}

export default CreateNewPasswordContainer
