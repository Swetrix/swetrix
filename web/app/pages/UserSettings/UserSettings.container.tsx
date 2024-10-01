import { connect } from 'react-redux'
import { toast } from 'sonner'
import type i18next from 'i18next'
import UIActions from 'redux/reducers/ui'
import { authActions } from 'redux/reducers/auth'
import { trackCustom } from 'utils/analytics'
import { StateType, AppDispatch } from 'redux/store'
import sagaActions from 'redux/sagas/actions'
import { IUser } from 'redux/models/IUser'
import { ISharedProject } from 'redux/models/ISharedProject'
import { removeRefreshToken } from 'utils/refreshToken'
import { removeAccessToken } from 'utils/accessToken'
import UserSettings from './UserSettings'

const mapStateToProps = (state: StateType) => {
  return {
    user: state.auth.user,
    dontRemember: state.auth.dontRemember,
    isPaidTierUsed: state.auth.isPaidTierUsed,
    theme: state.ui.theme.theme,
    loading: state.auth.loading,
    activeReferrals: state.ui.cache.activeReferrals,
    referralStatistics: state.ui.cache.referralStatistics,
  }
}

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  onDelete: (
    t: typeof i18next.t,
    deletionFeedback: string,
    onSuccess: {
      (): void
    },
  ) => {
    dispatch(
      sagaActions.deleteAccountAsync(
        (error: string) => toast.error(error),
        () => {
          trackCustom('ACCOUNT_DELETED', {
            reason_stated: deletionFeedback ? 'true' : 'false',
          })
          onSuccess()
        },
        deletionFeedback,
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
  setCache: (key: string, value: any) => {
    dispatch(
      UIActions.setCache({
        key,
        value,
      }),
    )
  },
  removeProject: (projectId: string) => {
    dispatch(
      UIActions.removeProject({
        pid: projectId,
        shared: true,
      }),
    )
  },
  removeShareProject: (id: string) => {
    dispatch(authActions.deleteShareProject(id))
  },
  setProjectsShareData: (data: Partial<ISharedProject>, id: string) => {
    dispatch(
      UIActions.setProjectsShareData({
        data,
        id,
        shared: true,
      }),
    )
  },
  setUserShareData: (data: Partial<ISharedProject>, id: string) => {
    dispatch(
      authActions.setUserShareData({
        data,
        id,
      }),
    )
  },
  updateUserProfileAsync: (
    data: Partial<IUser>,
    successMessage: string,
    callback: (isSuccess: boolean) => void = () => {},
  ) => {
    dispatch(
      sagaActions.updateUserProfileAsync(data, (res: any) => {
        if (res) {
          toast.success(successMessage)
        }
        callback(res)
      }),
    )
  },
  setAPIKey: (apiKey: string) => {
    dispatch(authActions.setApiKey(apiKey))
  },
  // setThemeType: (theme) => {
  //   dispatch(UIActions.setThemeType(theme))
  // },
  linkSSO: (t: typeof i18next.t, callback: (e: any) => void, provider: string) => {
    dispatch(sagaActions.linkSSO(t, callback, provider))
  },
  unlinkSSO: (t: typeof i18next.t, callback: (e: any) => void, provider: string) => {
    dispatch(sagaActions.unlinkSSO(t, callback, provider))
  },
  updateShowLiveVisitorsInTitle: (show: boolean, callback: (isSuccess: boolean) => void) => {
    dispatch(sagaActions.updateShowLiveVisitorsInTitle(show, callback))
  },
  // Reset the user in the regex store and remove tokens
  logoutLocal: () => {
    dispatch(authActions.logout())
    removeRefreshToken()
    removeAccessToken()
  },
  logoutAll: () => {
    dispatch(authActions.logout())
    dispatch(sagaActions.logout(false, true))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(UserSettings)
