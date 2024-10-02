import { connect } from 'react-redux'
import UIActions from 'redux/reducers/ui'
import sagaActions from 'redux/sagas/actions'
import { StateType, AppDispatch } from 'redux/store'
import CaptchaSettings from './CaptchaSettings'

const mapStateToProps = (state: StateType) => ({
  projects: state.ui.projects.captchaProjects,
  analyticsProjects: state.ui.projects.projects,
  isLoading: state.ui.projects.isLoadingCaptcha,
  loading: state.auth.loading,
  user: state.auth.user,
})

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  loadProjects: () => {
    sagaActions.loadProjectsCaptcha()
  },
  removeProject: (pid: string) => {
    dispatch(UIActions.removeCaptchaProject(pid))
  },
  deleteProjectCache: (pid: string, filters: any) => {
    dispatch(
      UIActions.deleteCaptchaProjectCache({
        pid,
      }),
    )
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(CaptchaSettings)
