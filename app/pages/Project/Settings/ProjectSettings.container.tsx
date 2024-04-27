import { connect } from 'react-redux'
import UIActions from 'redux/reducers/ui'
import sagaActions from 'redux/sagas/actions'
import { alertsActions } from 'redux/reducers/alerts'
import { errorsActions } from 'redux/reducers/errors'
import { StateType, AppDispatch } from 'redux/store'

import { tabForSharedProject } from 'redux/constants'
import ProjectSettings from './ProjectSettings'

const mapStateToProps = (state: StateType) => ({
  projects: state.ui.projects.projects,
  sharedProjects: state.ui.projects.sharedProjects,
  isLoading: state.ui.projects.isLoading,
  isLoadingShared: state.ui.projects.isLoadingShared,
  authLoading: state.auth.loading,
  dashboardPaginationPage: state.ui.projects.dashboardPaginationPage,
  dashboardPaginationPageShared: state.ui.projects.dashboardPaginationPageShared,
  user: state.auth.user,
  isSharedProject: state.ui.projects.dashboardTabs === tabForSharedProject,
})

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  updateProjectFailed: (message: string) => {
    dispatch(
      errorsActions.updateProjectFailed({
        message,
      }),
    )
  },
  generateAlerts: (message: string) => {
    dispatch(
      alertsActions.generateAlerts({
        message,
        type: 'success',
      }),
    )
  },
  projectDeleted: (message: string) => {
    dispatch(
      alertsActions.generateAlerts({
        message,
        type: 'success',
      }),
    )
  },
  deleteProjectFailed: (message: string) => {
    dispatch(
      errorsActions.deleteProjectFailed({
        message,
      }),
    )
  },
  loadProjects: (shared: boolean, skip: number) => {
    if (shared) {
      dispatch(sagaActions.loadSharedProjects(skip))
    } else {
      dispatch(sagaActions.loadProjects(skip))
    }
  },
  removeProject: (pid: string, shared: boolean) => {
    dispatch(
      UIActions.removeProject({
        pid,
        shared,
      }),
    )
  },
  deleteProjectCache: (pid: string) => {
    dispatch(
      UIActions.deleteProjectCache({
        pid,
      }),
    )
  },
  showError: (message: string) => {
    dispatch(
      errorsActions.genericError({
        message,
      }),
    )
  },
  setProjectProtectedPassword(id: string, password: string) {
    dispatch(
      UIActions.setProjectProtectedPassword({
        id,
        password,
      }),
    )
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(ProjectSettings)
