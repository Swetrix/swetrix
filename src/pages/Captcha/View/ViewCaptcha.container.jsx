import { connect } from 'react-redux'
import { errorsActions } from 'redux/actions/errors'
import UIActions from 'redux/actions/ui'

import ViewProject from './ViewCaptcha'

const mapStateToProps = (state) => ({
  projects: state.ui.projects.captchaProjects,
  isLoading: state.ui.projects.isLoadingCaptcha,
  cache: state.ui.cache.captchaAnalytics,
  projectViewPrefs: state.ui.cache.captchaProjectsViewPrefs,
  authenticated: state.auth.authenticated,
  timezone: state.auth.user.timezone,
  isPaidTierUsed: state.auth.isPaidTierUsed,
  user: state.auth.user,
})

const mapDispatchToProps = (dispatch) => ({
  showError: (message) => {
    dispatch(errorsActions.genericError(message))
  },
  setProjectCache: (pid, data, key) => {
    dispatch(UIActions.setCaptchaProjectCache(pid, data, key))
  },
  setProjects: (project) => {
    dispatch(UIActions.setCaptchaProjects(project))
  },
  setProjectViewPrefs: (pid, period, timeBucket, rangeDate) => {
    dispatch(UIActions.setCaptchaProjectsViewPrefs(pid, period, timeBucket, rangeDate))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(ViewProject)
