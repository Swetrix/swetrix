import Signin from './Signin'

export default () => {
  const onSubmit = data => {
    console.log(data)
  }

  return (
    <Signin onSubmit={onSubmit} />
  )
}