import { connect } from 'react-redux'
import { errorsActions } from 'redux/actions/errors'
import UIActions from 'redux/actions/ui'

import ProjectAlerts from './ProjectAlertsSettings'

const mapStateToProps = (state) => ({
  alerts: state.ui.alerts.alerts,
  user: state.auth.user,
  total: state.ui.alerts.total,
  pageTotal: state.ui.alerts.pageTotal,
})

const mapDispatchToProps = (dispatch) => ({
  showError: (message) => {
    dispatch(errorsActions.genericError(message))
  },
  setProjectAlerts: (alerts) => {
    dispatch(UIActions.setProjectAlerts(alerts))
  },
  setProjectAlertsTotal: (total) => {
    dispatch(UIActions.setProjectAlertsTotal(total))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(ProjectAlerts)
