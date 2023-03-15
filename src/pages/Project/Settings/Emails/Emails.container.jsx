import { connect } from 'react-redux'
import { errorsActions } from 'redux/actions/errors'
import { alertsActions } from 'redux/actions/alerts'

import Emails from './Emails'

const mapStateToProps = (state) => ({
  user: state.auth.user,
})

const mapDispatchToProps = (dispatch) => ({
  emailFailed: (message) => {
    dispatch(errorsActions.generateErrors(message))
  },
  addEmail: (message, type = 'success') => {
    dispatch(alertsActions.generateAlerts(message, type))
  },
  removeEmail: (message, type = 'success') => {
    dispatch(alertsActions.generateAlerts(message, type))
  },
  reportTypeNotifiction: (message, type = 'success') => {
    dispatch(alertsActions.generateAlerts(message, type))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(Emails)
