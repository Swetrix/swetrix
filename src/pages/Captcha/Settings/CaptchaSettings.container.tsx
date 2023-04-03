import { connect } from 'react-redux'
import UIActions from 'redux/reducers/ui'
import sagaActions from 'redux/sagas/actions'
import { alertsActions } from 'redux/reducers/alerts'
import { errorsActions } from 'redux/reducers/errors'
import { StateType, AppDispatch } from 'redux/store'
import CaptchaSettings from './CaptchaSettings'

const mapStateToProps = (state: StateType) => ({
  projects: state.ui.projects.captchaProjects,
  analyticsProjects: state.ui.projects.projects,
  isLoading: state.ui.projects.isLoadingCaptcha,
  user: state.auth.user,
})

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  updateProjectFailed: (message: string) => {
    dispatch(errorsActions.updateProjectFailed({
      message,
    }))
  },
  createNewProjectFailed: (message: string) => {
    dispatch(errorsActions.createNewProjectFailed({
      message,
    }))
  },
  newProject: (message: string) => {
    dispatch(alertsActions.generateAlerts({
      message,
    }))
  },
  projectDeleted: (message: string) => {
    dispatch(alertsActions.generateAlerts({
      message,
    }))
  },
  deleteProjectFailed: (message: string) => {
    dispatch(errorsActions.deleteProjectFailed({
      message,
    }))
  },
  loadProjects: () => {
    sagaActions.loadProjectsCaptcha()
  },
  removeProject: (pid: string) => {
    dispatch(UIActions.removeCaptchaProject(pid))
  },
  deleteProjectCache: (pid: string) => {
    dispatch(UIActions.deleteCaptchaProjectCache({
      pid,
    }))
  },
  showError: (message: string) => {
    dispatch(errorsActions.genericError({
      message,
    }))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(CaptchaSettings)
