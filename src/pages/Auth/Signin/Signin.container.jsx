import Signin from './Signin'
import { useDispatch } from 'react-redux'
import { authActions } from 'actions/auth'

export default () => {
  const dispatch = useDispatch()

  const onSubmit = data => {
    dispatch(authActions.loginAsync(data))
  }

  return (
    <Signin onSubmit={onSubmit} />
  )
}