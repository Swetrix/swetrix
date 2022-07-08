import { connect } from 'react-redux'
import UIActions from 'redux/actions/ui'
import { alertsActions } from 'redux/actions/alerts'
import { errorsActions } from 'redux/actions/errors'

import ProjectSettings from './ProjectSettings'

const mapStateToProps = (state) => ({
  projects: state.ui.projects.projects,
  sharedProjects: state.ui.projects.sharedProjects,
  isLoading: state.ui.projects.isLoading,
  user: state.auth.user,
  isSharedProject: false,
})

const mapDispatchToProps = (dispatch) => ({
  updateProjectFailed: (message) => {
    dispatch(errorsActions.updateProjectFailed(message))
  },
  createNewProjectFailed: (message) => {
    dispatch(errorsActions.createNewProjectFailed(message))
  },
  newProject: (message) => {
    dispatch(alertsActions.newProject(message))
  },
  projectDeleted: () => {
    dispatch(alertsActions.projectDeleted('The project has been deleted'))
  },
  deleteProjectFailed: (message) => {
    dispatch(errorsActions.deleteProjectFailed(message))
  },
  loadProjects: (shared) => {
    if (shared) {
      dispatch(UIActions.loadSharedProjects())
    } else {
      dispatch(UIActions.loadProjects())
    }
  },
  removeProject: (pid, shared) => {
    dispatch(UIActions.removeProject(pid, shared))
  },
  showError: (message) => {
    dispatch(errorsActions.genericError(message))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(ProjectSettings)
