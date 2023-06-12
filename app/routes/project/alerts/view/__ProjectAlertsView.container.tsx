import { connect } from 'react-redux'
import { StateType } from 'redux/store'
import ProjectAlerts from './__ProjectAlertsView'

const mapStateToProps = (state: StateType) => ({
  alerts: state.ui.alerts.alerts,
  loading: state.ui.alerts.loading,
  user: state.auth.user,
  total: state.ui.alerts.total,
  authenticated: state.auth.authenticated,
})

export default connect(mapStateToProps)(ProjectAlerts)
