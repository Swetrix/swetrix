import { connect } from 'react-redux'
import UIActions from 'redux/actions/ui'
import { errorsActions } from 'redux/actions/errors'
import { alertsActions } from 'redux/actions/alerts'

import People from './People'

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

export default connect(null, mapDispatchToProps)(People)
