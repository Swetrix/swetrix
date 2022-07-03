import { connect } from 'react-redux'
import { errorsActions } from 'redux/actions/errors'
import UIActions from 'redux/actions/ui'
import { authActions } from 'redux/actions/auth'
import { alertsActions } from 'redux/actions/alerts'
import Dashboard from './Dashboard'

const mapStateToProps = (state) => ({
  projects: state.ui.projects.projects,
  user: state.auth.user,
  isLoading: state.ui.projects.isLoading,
  total: state.ui.projects.total,
  error: state.ui.projects.error,
  dashboardPaginationPage: state.ui.projects.dashboardPaginationPage,
})

const mapDispatchToProps = (dispatch) => ({
  deleteProjectFailed: (message) => {
    dispatch(errorsActions.deleteProjectFailed(message))
  },
  setProjectsShareData: (data, id) => {
    dispatch(UIActions.setProjectsShareData(data, id))
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
})

export default connect(mapStateToProps, mapDispatchToProps)(Dashboard)
