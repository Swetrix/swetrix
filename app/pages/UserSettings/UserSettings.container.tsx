import { connect } from 'react-redux'
import UIActions from 'redux/reducers/ui'
import { errorsActions } from 'redux/reducers/errors'
import { authActions } from 'redux/reducers/auth'
import { alertsActions } from 'redux/reducers/alerts'
import { trackCustom } from 'utils/analytics'
import { StateType, AppDispatch } from 'redux/store'
import sagaActions from 'redux/sagas/actions'
import { IUser } from 'redux/models/IUser'
import { ISharedProject } from 'redux/models/ISharedProject'

import UserSettings from './UserSettings'

const mapStateToProps = (state: StateType) => {
  return {
    user: state.auth.user,
    dontRemember: state.auth.dontRemember,
    isPaidTierUsed: state.auth.isPaidTierUsed,
    theme: state.ui.theme.theme,
  }
}

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  onGDPRExportFailed: (message: string) => {
    dispatch(errorsActions.genericError({
      message,
    }))
  },
  onDelete: (t: (key: string) => string, onSuccess: {
    (): void,
  }) => {
    dispatch(
      sagaActions.deleteAccountAsync(
        (error: string) => dispatch(
          errorsActions.deleteAccountFailed({
            message: error,
          }),
        ),
        () => {
          trackCustom('ACCOUNT_DELETED')
          onSuccess()
        },
        t,
      ),
    )
  },
  updateUserData: (data: IUser) => {
    dispatch(authActions.updateUserData(data))
  },
  onDeleteProjectCache: () => {
    dispatch(UIActions.deleteProjectCache({}))
  },
  userSharedUpdate: (message: string) => {
    dispatch(alertsActions.userSharedUpdate({
      message,
      type: 'success',
    }))
  },
  sharedProjectError: (message: string) => {
    dispatch(errorsActions.sharedProjectFailed({
      message,
    }))
  },
  genericError: (message: string) => {
    dispatch(errorsActions.genericError({
      message,
    }))
  },
  removeProject: (projectId: string) => {
    dispatch(UIActions.removeProject({
      pid: projectId,
      shared: true,
    }))
  },
  removeShareProject: (id: string) => {
    dispatch(authActions.deleteShareProject(id))
  },
  setProjectsShareData: (data: Partial<ISharedProject>, id: string) => {
    dispatch(UIActions.setProjectsShareData({
      data,
      id,
      shared: true,
    }))
  },
  setUserShareData: (data: Partial<ISharedProject>, id: string) => {
    dispatch(authActions.setUserShareData({
      data,
      id,
    }))
  },
  updateProfileFailed: (message: string) => {
    dispatch(errorsActions.updateUserProfileFailed({
      message,
    }))
  },
  accountUpdated: (message: string) => {
    dispatch(alertsActions.accountUpdated({
      message,
      type: 'success',
    }))
  },
  updateUserProfileAsync: (data: Partial<IUser>, successMessage: string, callback = (e: any) => {}) => {
    dispatch(
      sagaActions.updateUserProfileAsync(
        data,
        (res: any) => {
          if (res) {
            dispatch(
              alertsActions.accountUpdated({
                message: successMessage,
                type: 'success',
              }),
            )
          }
          callback(res)
        },
      ),
    )
  },
  setAPIKey: (apiKey: string) => {
    dispatch(authActions.setApiKey(apiKey))
  },
  // setThemeType: (theme) => {
  //   dispatch(UIActions.setThemeType(theme))
  // },
  linkSSO: (t: (key: string) => string, callback: (e: any) => void, provider: string) => {
    dispatch(
      sagaActions.linkSSO(
        t,
        callback,
        provider,
      ),
    )
  },
  unlinkSSO: (t: (key: string) => string, callback: (e: any) => void, provider: string) => {
    dispatch(
      sagaActions.unlinkSSO(
        t,
        callback,
        provider,
      ),
    )
  },
  updateShowLiveVisitorsInTitle: (show: boolean, callback: (isSuccess: boolean) => void) => {
    dispatch(sagaActions.updateShowLiveVisitorsInTitle(show, callback))
  },
  logoutAll: () => {
    dispatch(authActions.logout())
    dispatch(sagaActions.logout(false, true))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(UserSettings)
