import ForgotPassword from './ForgotPassword'

export default () => {
  const onSubmit = data => {
    console.log(data)
  }

  return (
    <ForgotPassword onSubmit={onSubmit} />
  )
}