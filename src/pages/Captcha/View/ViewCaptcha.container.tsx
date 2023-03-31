import { connect } from 'react-redux'
import { errorsActions } from 'redux/reducers/errors'
import UIActions from 'redux/reducers/ui'
import { StateType, AppDispatch } from 'redux/store'

import { ICaptchaProject } from 'redux/models/IProject'
import ViewCaptcha from './ViewCaptcha'

const mapStateToProps = (state: StateType) => ({
  projects: state.ui.projects.captchaProjects,
  isLoading: state.ui.projects.isLoadingCaptcha,
  cache: state.ui.cache.captchaAnalytics,
  projectViewPrefs: state.ui.cache.captchaProjectsViewPrefs,
  authenticated: state.auth.authenticated,
  timezone: state.auth.user.timezone,
  isPaidTierUsed: state.auth.isPaidTierUsed,
  user: state.auth.user,
})

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  showError: (message: string) => {
    dispatch(errorsActions.genericError({
      message,
    }))
  },
  setProjectCache: (pid: string, data: any, key: string) => {
    dispatch(UIActions.setCaptchaProjectCache({
      pid,
      data,
      key,
    }))
  },
  setProjects: (project: ICaptchaProject[]) => {
    dispatch(UIActions.setCaptchaProjects(project))
  },
  setProjectViewPrefs: (pid: string, period: string, timeBucket: string, rangeDate?: Date[] | null) => {
    dispatch(UIActions.setCaptchaProjectViewPrefs({
      pid,
      period,
      timeBucket,
      rangeDate,
    }))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(ViewCaptcha)
