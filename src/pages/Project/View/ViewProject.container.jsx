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
      cachePerf: state.ui.cache.analyticsPerf,
      projectViewPrefs: state.ui.cache.projectViewPrefs,
      authenticated: state.auth.authenticated,
      timezone: state.auth.user.timezone,
      isPaidTierUsed: state.auth.isPaidTierUsed,
      extensions: state.ui.misc.extensions,
      user: state.auth.user,
      projectTab: state.ui.projects.projectTab,
    }
  }

  return {
    projects: state.ui.projects.projects,
    sharedProjects: state.ui.projects.sharedProjects,
    isLoading: state.ui.projects.isLoading,
    cache: state.ui.cache.analytics,
    cachePerf: state.ui.cache.analyticsPerf,
    projectViewPrefs: state.ui.cache.projectViewPrefs,
    authenticated: state.auth.authenticated,
    timezone: state.auth.user.timezone,
    isPaidTierUsed: state.auth.isPaidTierUsed,
    extensions: state.ui.misc.extensions,
    user: state.auth.user,
    projectTab: state.ui.projects.projectTab,
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
  setProjectCachePerf: (pid, data, key) => {
    dispatch(UIActions.setProjectCachePerf(pid, data, key))
  },
  setPublicProject: (project) => {
    dispatch(UIActions.setPublicProject(project))
  },
  setProjects: (project, shared) => {
    dispatch(UIActions.setProjects(project, shared))
  },
  setLiveStatsForProject: (id, count) => {
    dispatch(UIActions.setLiveStatsForProject(id, count))
  },
  generateAlert: (message, type) => {
    dispatch(alertsActions.generateAlerts(message, type))
  },
  setProjectTab: (tabs) => {
    dispatch(UIActions.setProjectTab(tabs))
  },
  setProjectForcastCache: (pid, data, key) => {
    dispatch(UIActions.setProjectForcastCache(pid, data, key))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(ViewProject)
