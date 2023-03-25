import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import _filter from 'lodash/filter'
import _findIndex from 'lodash/findIndex'
import _map from 'lodash/map'
import { tabForOwnedProject, PROJECT_TABS } from 'redux/constants'
import { setItem, getItem } from 'utils/localstorage'
import { IProject, ICaptchaProject } from 'redux/models/IProject'
import { ISharedProject } from 'redux/models/ISharedProject'
import { IAlerts } from 'redux/models/IAlerts'
import { toNumber } from 'lodash'

// projects: [],
// sharedProjects: [],
// captchaProjects: [],
// isLoading: true,
// isLoadingShared: true,
// isLoadingCaptcha: true,
// error: null,
// totalMonthlyEvents: null,
// total: 0,
// sharedTotal: 0,
// captchaTotal: 0,
// dashboardPaginationPage: 1,
// dashboardPaginationPageShared: 1,
// dashboardPaginationPageCaptcha: 1,
// dashboardTabs: getItem('dashboardTabs') || tabForOwnedProject,
// projectTab: PROJECT_TABS.traffic,
// alerts: [],
// subscribers: [],

interface IInitialState {
    projects: IProject[]
    sharedProjects: ISharedProject[]
    captchaProjects: ICaptchaProject[]
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
}

const initialState: IInitialState = {
  projects: [],
  sharedProjects: [],
  captchaProjects: [],
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
  dashboardTabs: getItem('dashboardTabs') || tabForOwnedProject,
  projectTab: PROJECT_TABS.traffic,
  alerts: [],
  subscribers: [],
}

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setProjects(state, { payload }: PayloadAction<{
            projects: IProject[] | ISharedProject[]
            shared: boolean
        }>) {
      if (payload.shared) {
        state.isLoadingShared = false
        state.sharedProjects = payload.projects as ISharedProject[]
      } else {
        state.isLoading = false
        state.projects = payload.projects as IProject[]
      }
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
    setTotal(state, { payload }: PayloadAction<{ total: number, shared: boolean }>) {
      if (payload.shared) {
        state.sharedTotal = payload.total
      } else {
        state.total = payload.total
      }
    },
    setCaptchaProjectsTotal(state, { payload }: PayloadAction<number>) {
      state.captchaTotal = payload
    },
    setCaptchaProjectsLoading(state, { payload }: PayloadAction<boolean>) {
      state.isLoadingCaptcha = payload
    },
    removeCaptchaProject(state, { payload }: PayloadAction<string>) {
      state.captchaProjects = _filter(state.captchaProjects, (project) => project.id !== payload)
    },
    setLiveStats(state, { payload }: PayloadAction<{ data: any[], shared: boolean }>) {
      const { data, shared = false } = payload
      if (shared) {
        state.sharedProjects = _map(state.sharedProjects, (res) => ({
          ...res,
          project: {
            ...res.project,
            live: data[toNumber(res.project.id)],
          },
        }))
      } else {
        state.projects = _map(state.projects, (res) => ({
          ...res,
          live: data[toNumber(res.id)],
        }))
      }
    },
    setLiveStatsProject(state, { payload }: PayloadAction<{ id: string, count: number, shared: boolean }>) {
      const { id, count, shared = false } = payload

      if (shared) {
        state.sharedProjects = _map(state.sharedProjects, (res) => {
          if (res.id === id) {
            return {
              ...res,
              live: count,
            }
          }
          return res
        })
      } else {
        state.projects = _map(state.projects, (res) => {
          if (res.id === id) {
            return {
              ...res,
              live: count,
            }
          }
          return res
        })
      }
    },
    setPublicProject(state, { payload }: PayloadAction<{ project: IProject | ISharedProject, shared: boolean }>) {
      const { project, shared = false } = payload

      if (shared) {
        state.sharedProjects = _findIndex(state.sharedProjects, (el) => el.id === project.id) >= 0
          ? state.sharedProjects
          : [
            ...state.sharedProjects,
            {
              ...project as ISharedProject,
              uiHidden: true,
            },
          ]
      } else {
        state.projects = _findIndex(state.projects, (el) => el.id === project.id) >= 0
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
    setProjectsShareData(state, { payload }: PayloadAction<{ data: IProject[] | ISharedProject[], id: string, shared: boolean }>) {
      const { data, id, shared = false } = payload

      if (shared) {
        state.sharedProjects = _map(state.sharedProjects, (res) => {
          if (res.project.id === id) {
            return {
              ...res,
              ...data,
            }
          }
          return res
        })
      } else {
        state.projects = _map(state.projects, (res) => {
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
    setProjectsLoading(state, { payload }: PayloadAction<{ isLoading: boolean, shared: boolean }>) {
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
  },
})

export const projectsActions = projectsSlice.actions

export default projectsSlice.reducer
