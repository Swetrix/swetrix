import Signin from './Signin'
import { useDispatch } from 'react-redux'
import { authActions } from 'redux/actions/auth'

const SigninContainer = () => {
  const dispatch = useDispatch()

  const onSubmit = data => {
    dispatch(authActions.loginAsync(data))
  }

  return (
    <Signin onSubmit={onSubmit} />
  )
}

export default SigninContainer
