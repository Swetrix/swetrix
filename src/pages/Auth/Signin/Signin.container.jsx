import { connect } from 'react-redux'
import { authActions } from 'redux/actions/auth'
import Signin from './Signin'

const mapDispatchToProps = (dispatch) => ({
  login: (data, callback) => {
    dispatch(authActions.loginAsync(data, callback))
  },
})

export default connect(null, mapDispatchToProps)(Signin)
