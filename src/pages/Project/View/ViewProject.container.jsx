import { connect } from 'react-redux'
import { errorsActions } from 'redux/actions/errors'
import UIActions from 'redux/actions/ui'
import { tabForSharedProject } from 'redux/constants'
import { alertsActions } from 'redux/actions/alerts'

import ViewProject from './ViewProject'

const mapStateToProps = (state) => {
  if (state.ui.projects.dashboardTabs === tabForSharedProject) {
    return {
      projects: state.ui.projects.projects,
      sharedProjects: state.ui.projects.sharedProjects,
      isLoading: state.ui.projects.isLoadingShared,
      cache: state.ui.cache.analytics,
      projectViewPrefs: state.ui.cache.projectViewPrefs,
      authenticated: state.auth.authenticated,
      timezone: state.auth.user.timezone,
      isPaidTierUsed: state.auth.isPaidTierUsed,
      extensions: state.ui.misc.extensions,
      user: state.auth.user,
    }
  }

  return {
    projects: state.ui.projects.projects,
    sharedProjects: state.ui.projects.sharedProjects,
    isLoading: state.ui.projects.isLoading,
    cache: state.ui.cache.analytics,
    projectViewPrefs: state.ui.cache.projectViewPrefs,
    authenticated: state.auth.authenticated,
    timezone: state.auth.user.timezone,
    isPaidTierUsed: state.auth.isPaidTierUsed,
    extensions: state.ui.misc.extensions,
    user: state.auth.user,
  }
}

const mapDispatchToProps = (dispatch) => ({
  showError: (message) => {
    dispatch(errorsActions.genericError(message))
  },
  setProjectCache: (pid, data, key) => {
    dispatch(UIActions.setProjectCache(pid, data, key))
  },
  setProjectViewPrefs: (pid, period, timeBucket, rangeDate) => {
    dispatch(UIActions.setProjectViewPrefs(pid, period, timeBucket, rangeDate))
  },
  setPublicProject: (project) => {
    dispatch(UIActions.setPublicProject(project))
  },
  setLiveStatsForProject: (id, count) => {
    dispatch(UIActions.setLiveStatsForProject(id, count))
  },
  generateAlert: (message, type) => {
    dispatch(alertsActions.generateAlerts(message, type))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(ViewProject)
