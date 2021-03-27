import Signup from './Signup'
// import { useDispatch } from 'react-redux'

export default () => {
  // const dispatch = useDispatch()

  const onSubmit = data => {
    console.log(data)
  }

  return (
    <Signup onSubmit={onSubmit} />
  )
}