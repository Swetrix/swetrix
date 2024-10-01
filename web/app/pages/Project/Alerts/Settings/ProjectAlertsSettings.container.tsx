import { connect } from 'react-redux'
import UIActions from 'redux/reducers/ui'
import { StateType, AppDispatch } from 'redux/store'
import { IAlerts } from 'redux/models/IAlerts'
import ProjectAlerts from './ProjectAlertsSettings'

const mapStateToProps = (state: StateType) => ({
  alerts: state.ui.alerts.alerts,
  user: state.auth.user,
  loading: state.auth.loading,
  total: state.ui.alerts.total,
})

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  setProjectAlerts: (alerts: IAlerts[]) => {
    dispatch(UIActions.setProjectAlerts(alerts))
  },
  setProjectAlertsTotal: (total: number) => {
    dispatch(
      UIActions.setProjectAlertsTotal({
        total,
      }),
    )
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(ProjectAlerts)
