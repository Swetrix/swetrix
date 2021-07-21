import { connect } from 'react-redux'
import UIActions from 'redux/actions/ui'
import { alertsActions } from 'redux/actions/alerts'
import { errorsActions } from 'redux/actions/errors'

import ProjectSettings from './ProjectSettings'

const mapStateToProps = (state) => ({
  projects: state.ui.projects.projects,
  isLoading: state.ui.projects.isLoading,
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
  loadProjects: () => {
    dispatch(UIActions.loadProjects())
  },
  removeProject: (pid) => {
    dispatch(UIActions.removeProject(pid))
  },
  showError: (message) => {
    dispatch(errorsActions.genericError(message))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(ProjectSettings)
