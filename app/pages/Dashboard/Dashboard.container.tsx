import { connect } from 'react-redux'
import { errorsActions } from 'redux/reducers/errors'
import UIActions from 'redux/reducers/ui'
import sagaActions from 'redux/sagas/actions'
import { authActions } from 'redux/reducers/auth'
import { alertsActions } from 'redux/reducers/alerts'
import { StateType, AppDispatch } from 'redux/store'
import { IProject } from 'redux/models/IProject'
import { ISharedProject } from 'redux/models/ISharedProject'
import Dashboard from './Dashboard'

const mapStateToProps = (state: StateType) => ({
  projects: state.ui.projects.projects,
  sharedProjects: state.ui.projects.sharedProjects,
  captchaProjects: state.ui.projects.captchaProjects,
  user: state.auth.user,
  isLoading: state.ui.projects.isLoading,
  total: state.ui.projects.total,
  sharedTotal: state.ui.projects.sharedTotal,
  captchaTotal: state.ui.projects.captchaTotal,
  error: state.ui.projects.error,
  dashboardPaginationPage: state.ui.projects.dashboardPaginationPage,
  dashboardPaginationPageShared: state.ui.projects.dashboardPaginationPageShared,
  dashboardPaginationPageCaptcha: state.ui.projects.dashboardPaginationPageCaptcha,
  dashboardTabs: state.ui.projects.dashboardTabs,
  liveStats: state.ui.projects.liveStats,
})

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  deleteProjectFailed: (message: string) => {
    dispatch(errorsActions.deleteProjectFailed({
      message,
    }))
  },
  setProjectsShareData: (data: IProject | ISharedProject, id: string, shared?: boolean) => {
    dispatch(UIActions.setProjectsShareData({
      data,
      id,
      shared,
    }))
  },
  setUserShareData: (data: ISharedProject, id: string) => {
    dispatch(authActions.setUserShareData({
      data,
      id,
    }))
  },
  userSharedUpdate: (message: string) => {
    dispatch(alertsActions.userSharedUpdate({
      message,
    }))
  },
  sharedProjectError: (message: string) => {
    dispatch(errorsActions.sharedProjectFailed({
      message,
    }))
  },
  loadProjects: (take: number, skip: number, search: string) => {
    dispatch(sagaActions.loadProjects(take, skip, search))
  },
  loadSharedProjects: (take: number, skip: number, search: string) => {
    dispatch(sagaActions.loadSharedProjects(take, skip, search))
  },
  setDashboardPaginationPage: (page: number) => {
    dispatch(UIActions.setDashboardPaginationPage(page))
  },
  setDashboardPaginationPageShared: (page: number) => {
    dispatch(UIActions.setDashboardPaginationPageShared(page))
  },
  setDashboardTabs: (tab: string) => {
    dispatch(UIActions.setDashboardTabs(tab))
  },
  loadProjectsCaptcha: (take: number, skip: number, search: string) => {
    dispatch(sagaActions.loadProjectsCaptcha(take, skip, search))
  },
  setDashboardPaginationPageCaptcha: (page: number) => {
    dispatch(UIActions.setDashboardPaginationPageCaptcha(page))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(Dashboard)
