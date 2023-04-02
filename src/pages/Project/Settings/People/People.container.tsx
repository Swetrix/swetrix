import { connect } from 'react-redux'
import UIActions from 'redux/reducers/ui'
import { errorsActions } from 'redux/reducers/errors'
import { alertsActions } from 'redux/reducers/alerts'
import { StateType, AppDispatch } from 'redux/store'
import { IProject } from 'redux/models/IProject'

import People from './People'

const mapStateToProps = (state: StateType) => ({
  isPaidTierUsed: state.auth.isPaidTierUsed,
})

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  updateProjectFailed: (message: string) => {
    dispatch(errorsActions.updateProjectFailed({
      message,
    }))
  },
  setProjectShareData: (data: Partial<IProject>, projectId: string, share = true) => {
    dispatch(UIActions.setProjectsShareData({
      data,
      id: projectId,
      shared: share,
    }))
  },
  roleUpdatedNotification: (message: string, type = 'success') => {
    dispatch(alertsActions.roleUpdated({
      message,
      type,
    }))
  },
  inviteUserNotification: (message: string, type = 'success') => {
    dispatch(alertsActions.inviteUser({
      message,
      type,
    }))
  },
  removeUserNotification: (message: string, type = 'success') => {
    dispatch(alertsActions.removeUser({
      message,
      type,
    }))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(People)
