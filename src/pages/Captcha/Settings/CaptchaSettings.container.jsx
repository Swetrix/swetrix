import { connect } from 'react-redux'
import UIActions from 'redux/actions/ui'
import { alertsActions } from 'redux/actions/alerts'
import { errorsActions } from 'redux/actions/errors'

import CaptchaSettings from './CaptchaSettings'

const mapStateToProps = (state) => {
  console.log(state)
  return {
    projects: state.ui.projects.captchaProjects,
    isLoading: state.ui.projects.isLoadingCaptcha,
    user: state.auth.user,
  }
}

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
  projectDeleted: (message) => {
    dispatch(alertsActions.projectDeleted(message))
  },
  deleteProjectFailed: (message) => {
    dispatch(errorsActions.deleteProjectFailed(message))
  },
  loadProjects: () => {
    UIActions.loadProjectsCaptcha()
  },
  removeProject: (pid) => {
    dispatch(UIActions.removeCaptchProject(pid))
  },
  deleteProjectCache: (pid) => {
    dispatch(UIActions.deleteProjectCache(pid))
  },
  showError: (message) => {
    dispatch(errorsActions.genericError(message))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(CaptchaSettings)
