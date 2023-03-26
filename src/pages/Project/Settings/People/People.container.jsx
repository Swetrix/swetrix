import { connect } from 'react-redux'
import UIActions from 'redux/reducers/ui'
import { errorsActions } from 'redux/reducers/errors'
import { alertsActions } from 'redux/reducers/alerts'

import People from './People'

const mapStateToProps = (state) => ({
  isPaidTierUsed: state.auth.isPaidTierUsed,
})

const mapDispatchToProps = (dispatch) => ({
  updateProjectFailed: (message) => {
    dispatch(errorsActions.updateProjectFailed(message))
  },
  setProjectShareData: (projectId, share) => {
    dispatch(UIActions.setProjectsShareData(projectId, share))
  },
  roleUpdatedNotification: (message, type = 'success') => {
    dispatch(alertsActions.roleUpdated(message, type))
  },
  inviteUserNotification: (message, type = 'success') => {
    dispatch(alertsActions.inviteUser(message, type))
  },
  removeUserNotification: (message, type = 'success') => {
    dispatch(alertsActions.removeUser(message, type))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(People)
