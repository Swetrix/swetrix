import { connect } from 'react-redux'
import UIActions from 'redux/reducers/ui'
import sagaActions from 'redux/sagas/actions'
import { StateType, AppDispatch } from 'redux/store'
import CaptchaSettings from './CaptchaSettings'

const mapStateToProps = (state: StateType) => ({
  projects: state.ui.projects.projects,
  isLoading: state.ui.projects.isLoading,
  loading: state.auth.loading,
  user: state.auth.user,
})

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  loadProjects: () => {
    sagaActions.loadProjects()
  },
  removeProject: (pid: string) => {
    dispatch(UIActions.removeProject({ pid }))
  },
  deleteProjectCache: (pid: string) => {
    dispatch(
      UIActions.deleteProjectCache({
        pid,
      }),
    )
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(CaptchaSettings)
