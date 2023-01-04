import { connect } from 'react-redux'
import { errorsActions } from 'redux/actions/errors'
import UIActions from 'redux/actions/ui'

import ProjectAlerts from './ProjectAlertsView'

const mapStateToProps = (state) => ({
  alerts: state.ui.alerts.alerts,
  totalPage: state.ui.alerts.totalPage,
  total: state.ui.alerts.total,
  loading: state.ui.alerts.loading,
})

const mapDispatchToProps = (dispatch) => ({
  showError: (message) => {
    dispatch(errorsActions.genericError(message))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(ProjectAlerts)
