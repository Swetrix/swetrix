import { connect } from 'react-redux'
import { errorsActions } from 'redux/reducers/errors'
import UIActions from 'redux/reducers/ui'
import { StateType, AppDispatch } from 'redux/store'
import { IAlerts } from 'redux/models/IAlerts'
import { alertsActions } from 'redux/reducers/alerts'
import ProjectAlerts from './__ProjectAlertsSettings'

const mapStateToProps = (state: StateType) => ({
  alerts: state.ui.alerts.alerts,
  user: state.auth.user,
  total: state.ui.alerts.total,
})

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  showError: (message: string) => {
    dispatch(errorsActions.genericError({
      message,
    }))
  },
  generateAlerts: (message: string) => {
    dispatch(alertsActions.generateAlerts({
      message,
      type: 'success',
    }))
  },
  setProjectAlerts: (alerts: IAlerts[]) => {
    dispatch(UIActions.setProjectAlerts(alerts))
  },
  setProjectAlertsTotal: (total: number) => {
    dispatch(UIActions.setProjectAlertsTotal({
      total,
    }))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(ProjectAlerts)
