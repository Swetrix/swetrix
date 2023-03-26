import { connect } from 'react-redux'
import { authActions } from 'redux/reducers/auth'
import Signup from './Signup'

const mapDispatchToProps = (dispatch) => ({
  signup: (data, t, callback) => {
    dispatch(authActions.signupAsync(data, t, callback))
  },
})

export default connect(null, mapDispatchToProps)(Signup)
