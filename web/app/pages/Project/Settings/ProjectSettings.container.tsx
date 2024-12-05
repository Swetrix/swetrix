import { connect } from 'react-redux'
import UIActions from 'redux/reducers/ui'
import sagaActions from 'redux/sagas/actions'
import { StateType, AppDispatch } from 'redux/store'

import ProjectSettings from './ProjectSettings'

const mapStateToProps = (state: StateType) => ({
  projects: state.ui.projects.projects,
  isLoading: state.ui.projects.isLoading,
  authLoading: state.auth.loading,
  dashboardPaginationPage: state.ui.projects.dashboardPaginationPage,
  user: state.auth.user,
})

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  loadProjects: (skip: number) => {
    dispatch(sagaActions.loadProjects(skip))
  },
  removeProject: (pid: string) => {
    dispatch(
      UIActions.removeProject({
        pid,
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
