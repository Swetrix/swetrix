import { connect } from 'react-redux'
import UIActions from 'redux/reducers/ui'
import sagaActions from 'redux/sagas/actions'
import { authActions } from 'redux/reducers/auth'
import { StateType, AppDispatch } from 'redux/store'
import { IProject } from 'redux/models/IProject'
import { ISharedProject } from 'redux/models/ISharedProject'
import Dashboard from './Dashboard'

const mapStateToProps = (state: StateType) => ({
  projects: state.ui.projects.projects,
  user: state.auth.user,
  isLoading: state.ui.projects.isLoading,
  total: state.ui.projects.total,
  error: state.ui.projects.error,
  dashboardPaginationPage: state.ui.projects.dashboardPaginationPage,
  liveStats: state.ui.projects.liveStats,
  birdseye: state.ui.projects.birdseye,
})

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  setProjectsShareData: (data: IProject | ISharedProject, id: string, shared?: boolean) => {
    dispatch(
      UIActions.setProjectsShareData({
        data,
        id,
      }),
    )
  },
  setUserShareData: (data: ISharedProject, id: string) => {
    dispatch(
      authActions.setUserShareData({
        data,
        id,
      }),
    )
  },
  loadProjects: (take: number, skip: number, search: string) => {
    dispatch(sagaActions.loadProjects(take, skip, search))
  },
  setDashboardPaginationPage: (page: number) => {
    dispatch(UIActions.setDashboardPaginationPage(page))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(Dashboard)
