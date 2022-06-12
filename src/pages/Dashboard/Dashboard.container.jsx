import { connect } from 'react-redux'
import { errorsActions } from 'redux/actions/errors'
import UIActions from 'redux/actions/ui'
import { authActions } from 'redux/actions/auth'
import Dashboard from './Dashboard'

const mapStateToProps = (state) => ({
  projects: state.ui.projects.projects,
  user: state.auth.user,
  isLoading: state.ui.projects.isLoading,
  error: state.ui.projects.error,
})

const mapDispatchToProps = (dispatch) => ({
  deleteProjectFailed: (message) => {
    dispatch(errorsActions.deleteProjectFailed(message))
  },
  removeProject: (projectId) => {
    dispatch(UIActions.removeProject(projectId))
  },
  removeShareProject: (id) => {
    dispatch(authActions.deleteShareProject(id))
  },
  setProjectsShareData: (data, id) => {
    dispatch(UIActions.setProjectsShareData(data, id))
  },
  setUserShareData: (data, id) => {
    dispatch(authActions.setUserShareData(data, id))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(Dashboard)
