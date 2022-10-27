import { connect } from 'react-redux'

import UIActions from 'redux/actions/ui'
import { errorsActions } from 'redux/actions/errors'
import { authActions } from 'redux/actions/auth'
import { alertsActions } from 'redux/actions/alerts'
import { trackCustom } from 'utils/analytics'

import UserSettings from './UserSettings'

const mapStateToProps = (state) => {
  return {
    user: state.auth.user,
    dontRemember: state.auth.dontRemember,
    isPaidTierUsed: state.auth.isPaidTierUsed,
  }
}

const mapDispatchToProps = (dispatch) => ({
  onGDPRExportFailed: (message) => {
    dispatch(errorsActions.GDPRExportFailed(message))
  },
  onDelete: (t, onSuccess) => {
    dispatch(
      authActions.deleteAccountAsync(
        (error) => dispatch(
          errorsActions.deleteAccountFailed(error),
        ),
        () => {
          trackCustom('ACCOUNT_DELETED')
          onSuccess()
        },
        t,
      ),
    )
  },
  updateUserData: (data) => {
    dispatch(authActions.updateUserData(data))
  },
  onDeleteProjectCache: () => {
    dispatch(UIActions.deleteProjectCache())
  },
  login: (user) => {
    dispatch(authActions.loginSuccess(user))
  },
  userSharedUpdate: (message) => {
    dispatch(alertsActions.userSharedUpdate(message))
  },
  sharedProjectError: (message) => {
    dispatch(errorsActions.sharedProjectFailed(message))
  },
  genericError: (message) => {
    dispatch(errorsActions.genericError(message))
  },
  removeProject: (projectId) => {
    dispatch(UIActions.removeProject(projectId, true))
  },
  removeShareProject: (id) => {
    dispatch(authActions.deleteShareProject(id))
  },
  setProjectsShareData: (data, id) => {
    dispatch(UIActions.setProjectsShareData(data, id, true))
  },
  setUserShareData: (data, id) => {
    dispatch(authActions.setUserShareData(data, id))
  },
  updateProfileFailed: (message) => {
    dispatch(errorsActions.updateProfileFailed(message))
  },
  accountUpdated: (message) => {
    dispatch(alertsActions.accountUpdated(message))
  },
  updateUserProfileAsync: (data, successMessage) => {
    dispatch(
      authActions.updateUserProfileAsync(
        data,
        () => dispatch(
          alertsActions.accountUpdated(successMessage),
        ),
      ),
    )
  },
  setAPIKey: (apiKey) => {
    dispatch(authActions.setApiKey(apiKey))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(UserSettings)
