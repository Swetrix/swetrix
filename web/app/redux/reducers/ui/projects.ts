import { createSlice, current, PayloadAction } from '@reduxjs/toolkit'
import _filter from 'lodash/filter'
import _findIndex from 'lodash/findIndex'
import _map from 'lodash/map'
import { PROJECT_TABS, PROJECTS_PROTECTED } from 'redux/constants'
import { setItem, getItem } from 'utils/localstorage'
import { IProject, ILiveStats, IOverall, IOverallObject } from 'redux/models/IProject'
import { IAlerts } from 'redux/models/IAlerts'

interface IInitialState {
  projects: IProject[]
  birdseye: {
    [key: string]: IOverallObject
  }
  isLoading: boolean
  error: null | string
  totalMonthlyEvents: number | null
  total: number
  dashboardPaginationPage: number
  projectTab: string
  alerts: IAlerts[]
  subscribers: any[]
  liveStats: ILiveStats
  password: {
    [key: string]: string
  }
}

const initialState: IInitialState = {
  projects: [],
  birdseye: {},
  isLoading: true,
  error: null,
  totalMonthlyEvents: null,
  total: 0,
  dashboardPaginationPage: 1,
  projectTab: PROJECT_TABS.traffic,
  alerts: [],
  subscribers: [],
  liveStats: {},
  password: getItem(PROJECTS_PROTECTED) || {},
}

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setProjects(
      state,
      {
        payload,
      }: PayloadAction<{
        projects: Partial<IProject>[]
      }>,
    ) {
      state.isLoading = false
      state.projects = payload.projects as IProject[]
    },
    updateProject(state, { payload }: PayloadAction<{ project: Partial<IProject>; pid: string }>) {
      const { pid, project } = payload

      state.projects = _map(current(state.projects), (res) => {
        if (res.id === pid) {
          return {
            ...res,
            ...project,
          }
        }
        return res
      })
    },
    setDashboardPaginationPage(state, { payload }: PayloadAction<number>) {
      state.dashboardPaginationPage = payload
    },
    setTotalMonthlyEvents(state, { payload }: PayloadAction<number>) {
      state.totalMonthlyEvents = payload
    },
    setTotal(state, { payload }: PayloadAction<{ total: number }>) {
      state.total = payload.total
    },
    setLiveStats(state, { payload }: PayloadAction<{ data: any }>) {
      const { data } = payload

      state.liveStats = {
        ...state.liveStats,
        ...data,
      }
    },
    setLiveStatsProject(state, { payload }: PayloadAction<{ id: string; count: number }>) {
      const { id, count } = payload

      state.liveStats = {
        ...state.liveStats,
        [id]: count,
      }
    },
    setPublicProject(state, { payload }: PayloadAction<{ project: Partial<IProject> }>) {
      const { project } = payload

      state.projects =
        _findIndex(current(state.projects), (el) => el.id === project.id) >= 0
          ? state.projects
          : [
              ...state.projects,
              {
                ...(project as IProject),
                uiHidden: true,
              },
            ]
    },
    setProjectsShareData(state, { payload }: PayloadAction<{ data: Partial<IProject>; id: string }>) {
      const { data, id } = payload

      state.projects = _map(current(state.projects), (res) => {
        if (res.id === id) {
          return {
            ...res,
            ...data,
          }
        }
        return res
      })
    },
    setProjectsError(state, { payload }: PayloadAction<string>) {
      state.error = payload
    },
    removeProject(state, { payload }: PayloadAction<{ pid: string }>) {
      const { pid } = payload

      state.projects = _filter(state.projects, (project) => project.id !== pid)
      state.total -= 1
    },
    setProjectsLoading(state, { payload }: PayloadAction<{ isLoading: boolean }>) {
      const { isLoading } = payload
      state.isLoading = isLoading
    },
    setProjectTab(state, { payload }: PayloadAction<string>) {
      state.projectTab = payload
    },
    setProjectProtectedPassword: (state, { payload }: PayloadAction<{ id: string; password: string }>) => {
      const { id, password } = payload

      state.password = {
        ...state.password,
        [id]: password,
      }
      setItem(PROJECTS_PROTECTED, JSON.stringify(state.password))
    },
    reset(state) {
      state.projects = []
      state.total = 0
      state.alerts = []
      state.subscribers = []
      state.error = null
    },
    setBirdsEyeBulk(state, { payload }: PayloadAction<IOverall>) {
      state.birdseye = {
        ...state.birdseye,
        ...payload,
      }
    },
  },
})

export const projectsActions = projectsSlice.actions

export default projectsSlice.reducer
