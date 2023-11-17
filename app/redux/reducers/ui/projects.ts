import { createSlice, current, PayloadAction } from '@reduxjs/toolkit'
import _filter from 'lodash/filter'
import _findIndex from 'lodash/findIndex'
import _map from 'lodash/map'
import { tabForOwnedProject, PROJECT_TABS, PROJECTS_PROTECTED } from 'redux/constants'
import { setItem, getItem } from 'utils/localstorage'
import { IProject, ICaptchaProject, ILiveStats, IOverall, IOverallObject } from 'redux/models/IProject'
import { ISharedProject } from 'redux/models/ISharedProject'
import { IAlerts } from 'redux/models/IAlerts'

interface IInitialState {
  projects: IProject[]
  sharedProjects: ISharedProject[]
  captchaProjects: ICaptchaProject[]
  birdseye: {
    [key: string]: IOverallObject
  }
  isLoading: boolean
  isLoadingShared: boolean
  isLoadingCaptcha: boolean
  error: null | string
  totalMonthlyEvents: number | null
  total: number
  sharedTotal: number
  captchaTotal: number
  dashboardPaginationPage: number
  dashboardPaginationPageShared: number
  dashboardPaginationPageCaptcha: number
  dashboardTabs: string
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
  sharedProjects: [],
  captchaProjects: [],
  birdseye: {},
  isLoading: true,
  isLoadingShared: true,
  isLoadingCaptcha: true,
  error: null,
  totalMonthlyEvents: null,
  total: 0,
  sharedTotal: 0,
  captchaTotal: 0,
  dashboardPaginationPage: 1,
  dashboardPaginationPageShared: 1,
  dashboardPaginationPageCaptcha: 1,
  dashboardTabs: getItem('dashboardTabs') as string || tabForOwnedProject,
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
    setProjects(state, { payload }: PayloadAction<{
      projects: Partial<IProject | ISharedProject>[]
      shared?: boolean
    }>) {
      if (payload.shared) {
        state.isLoadingShared = false
        state.sharedProjects = payload.projects as ISharedProject[]
      } else {
        state.isLoading = false
        state.projects = payload.projects as IProject[]
      }
    },
    updateProject(state, { payload }: PayloadAction<{ project: Partial<IProject | ISharedProject>, pid: string }>) {
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
    setCaptchaProjects(state, { payload }: PayloadAction<ICaptchaProject[]>) {
      state.isLoadingCaptcha = false
      state.captchaProjects = payload
    },
    setDashboardPaginationPage(state, { payload }: PayloadAction<number>) {
      state.dashboardPaginationPage = payload
    },
    setDashboardPaginationPageShared(state, { payload }: PayloadAction<number>) {
      state.dashboardPaginationPageShared = payload
    },
    setDashboardPaginationPageCaptcha(state, { payload }: PayloadAction<number>) {
      state.dashboardPaginationPageCaptcha = payload
    },
    setTotalMonthlyEvents(state, { payload }: PayloadAction<number>) {
      state.totalMonthlyEvents = payload
    },
    setTotal(state, { payload }: PayloadAction<{ total: number, shared?: boolean }>) {
      if (payload.shared) {
        state.sharedTotal = payload.total
      } else {
        state.total = payload.total
      }
    },
    setCaptchaTotal(state, { payload }: PayloadAction<number>) {
      state.captchaTotal = payload
    },
    setCaptchaLoading(state, { payload }: PayloadAction<boolean>) {
      state.isLoadingCaptcha = payload
    },
    removeCaptchaProject(state, { payload }: PayloadAction<string>) {
      state.captchaProjects = _filter(state.captchaProjects, (project) => project.id !== payload)
    },
    setLiveStats(state, { payload }: PayloadAction<{ data: any }>) {
      const { data } = payload

      state.liveStats = {
        ...state.liveStats,
        ...data,
      }
    },
    setLiveStatsProject(state, { payload }: PayloadAction<{ id: string, count: number }>) {
      const { id, count } = payload

      state.liveStats = {
        ...state.liveStats,
        [id]: count,
      }
    },
    setPublicProject(state, { payload }: PayloadAction<{ project: Partial<IProject | ISharedProject>, shared?: boolean }>) {
      const { project, shared = false } = payload

      if (shared) {
        state.sharedProjects = _findIndex(current(state.sharedProjects), (el) => el.id === project.id) >= 0
          ? state.sharedProjects
          : [
            ...state.sharedProjects,
            {
              ...project as ISharedProject,
              uiHidden: true,
            },
          ]
      } else {
        state.projects = _findIndex(current(state.projects), (el) => el.id === project.id) >= 0
          ? state.projects
          : [
            ...state.projects,
            {
              ...project as IProject,
              uiHidden: true,
            },
          ]
      }
    },
    setProjectsShareData(state, { payload }: PayloadAction<{ data: Partial<IProject> | Partial<ISharedProject>, id: string, shared?: boolean }>) {
      const { data, id, shared = false } = payload

      if (shared) {
        state.sharedProjects = _map(current(state.sharedProjects), (res) => {
          if (res.project && res.project.id === id) {
            return {
              ...res,
              ...data,
            }
          }
          return res
        })
      } else {
        state.projects = _map(current(state.projects), (res) => {
          if (res.id === id) {
            return {
              ...res,
              ...data,
            }
          }
          return res
        })
      }
    },
    setProjectsError(state, { payload }: PayloadAction<string>) {
      state.error = payload
    },
    removeProject(state, { payload }: PayloadAction<{ pid: string, shared: boolean }>) {
      const { pid, shared = false } = payload

      if (shared) {
        state.sharedProjects = _filter(state.sharedProjects, (project) => project.id !== pid)
        state.sharedTotal -= 1
      } else {
        state.projects = _filter(state.projects, (project) => project.id !== pid)
        state.total -= 1
      }
    },
    setProjectsLoading(state, { payload }: PayloadAction<{ isLoading: boolean, shared?: boolean }>) {
      const { isLoading, shared = false } = payload

      if (shared) {
        state.isLoadingShared = isLoading
      } else {
        state.isLoading = isLoading
      }
    },
    setDashboardTabs(state, { payload }: PayloadAction<string>) {
      state.dashboardTabs = payload
      setItem('dashboardTabs', payload)
    },
    setProjectTab(state, { payload }: PayloadAction<string>) {
      state.projectTab = payload
    },
    setProjectProtectedPassword: (state, { payload }: PayloadAction<{ id: string, password: string }>) => {
      const { id, password } = payload

      state.password = {
        ...state.password,
        [id]: password,
      }
      setItem(PROJECTS_PROTECTED, JSON.stringify(state.password))
    },
    reset(state) {
      state.projects = []
      state.sharedProjects = []
      state.captchaProjects = []
      state.total = 0
      state.sharedTotal = 0
      state.captchaTotal = 0
      state.alerts = []
      state.subscribers = []
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
