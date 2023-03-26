import { connect } from 'react-redux'
import { errorsActions } from 'redux/reducers/errors'
import UIActions from 'redux/reducers/ui'
import { authActions } from 'redux/reducers/auth'
import { alertsActions } from 'redux/reducers/alerts'
import Dashboard from './Dashboard'

const mapStateToProps = (state) => ({
  projects: state.ui.projects.projects,
  sharedProjects: state.ui.projects.sharedProjects,
  captchaProjects: state.ui.projects.captchaProjects,
  user: state.auth.user,
  isLoading: state.ui.projects.isLoading,
  total: state.ui.projects.total,
  sharedTotal: state.ui.projects.sharedTotal,
  captchaTotal: state.ui.projects.captchaTotal,
  error: state.ui.projects.error,
  dashboardPaginationPage: state.ui.projects.dashboardPaginationPage,
  dashboardPaginationPageShared: state.ui.projects.dashboardPaginationPageShared,
  dashboardPaginationPageCaptcha: state.ui.projects.dashboardPaginationPageCaptcha,
  dashboardTabs: state.ui.projects.dashboardTabs,
})

const mapDispatchToProps = (dispatch) => ({
  deleteProjectFailed: (message) => {
    dispatch(errorsActions.deleteProjectFailed(message))
  },
  setProjectsShareData: (data, id, shared) => {
    dispatch(UIActions.setProjectsShareData(data, id, shared))
  },
  setUserShareData: (data, id) => {
    dispatch(authActions.setUserShareData(data, id))
  },
  userSharedUpdate: (message) => {
    dispatch(alertsActions.userSharedUpdate(message))
  },
  sharedProjectError: (message) => {
    dispatch(errorsActions.sharedProjectFailed(message))
  },
  loadProjects: (take, skip) => {
    dispatch(UIActions.loadProjects(take, skip))
  },
  loadSharedProjects: (take, skip) => {
    dispatch(UIActions.loadSharedProjects(take, skip))
  },
  setDashboardPaginationPage: (page) => {
    dispatch(UIActions.setDashboardPaginationPage(page))
  },
  setDashboardPaginationPageShared: (page) => {
    dispatch(UIActions.setDashboardPaginationPageShared(page))
  },
  setDashboardTabs: (tab) => {
    dispatch(UIActions.setDashboardTabs(tab))
  },
  loadProjectsCaptcha: (take, skip) => {
    dispatch(UIActions.loadProjectsCaptcha(take, skip))
  },
  setDashboardPaginationPageCaptcha: (page) => {
    dispatch(UIActions.setDashboardPaginationPageCaptcha(page))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(Dashboard)
