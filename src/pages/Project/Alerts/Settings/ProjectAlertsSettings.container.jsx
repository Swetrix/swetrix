import { connect } from 'react-redux'
import { errorsActions } from 'redux/actions/errors'
import UIActions from 'redux/actions/ui'

import ProjectAlerts from './ProjectAlertsSettings'

const mapStateToProps = (state) => ({
  alerts: state.ui.alerts.alerts,
})

const mapDispatchToProps = (dispatch) => ({
  showError: (message) => {
    dispatch(errorsActions.genericError(message))
  },
  setProjectAlerts: (alerts) => {
    dispatch(UIActions.setProjectAlerts(alerts))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(ProjectAlerts)
