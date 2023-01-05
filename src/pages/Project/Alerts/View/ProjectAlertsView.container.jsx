import { connect } from 'react-redux'

import ProjectAlerts from './ProjectAlertsView'

const mapStateToProps = (state) => ({
  alerts: state.ui.alerts.alerts,
  loading: state.ui.alerts.loading,
  user: state.auth.user,
})

export default connect(mapStateToProps)(ProjectAlerts)
