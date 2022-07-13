import { types } from 'redux/actions/ui/types'
import _filter from 'lodash/filter'
import _findIndex from 'lodash/findIndex'
import _map from 'lodash/map'
import { tabForOwnedProject } from 'redux/constants'
import { setItem, getItem } from 'utils/localstorage'

const getInitialState = () => {
  return {
    projects: [],
    sharedProjects: [],
    isLoading: true,
    isLoadingShared: true,
    error: null,
    totalMonthlyEvents: null,
    total: 0,
    sharedTotal: 0,
    dashboardPaginationPage: 1,
    dashboardTabs: getItem('dashboardTabs') || tabForOwnedProject,
  }
}

// eslint-disable-next-line default-param-last
const projectsReducer = (state = getInitialState(), { type, payload }) => {
  switch (type) {
    case types.SET_PROJECTS: {
      const { projects, shared = false } = payload
      if (shared) {
        return {
          ...state,
          isLoadingShared: false,
          sharedProjects: projects,
        }
      }

      return {
        ...state,
        projects,
        isLoading: false,
      }
    }

    case types.SET_DASHBOARD_PAGINATION_PAGE: {
      const { page } = payload
      return {
        ...state,
        dashboardPaginationPage: page,
      }
    }

    case types.SET_TOTAL_MONTHLY_EVENTS: {
      const { totalMonthlyEvents } = payload
      return {
        ...state,
        totalMonthlyEvents,
      }
    }

    case types.SET_TOTAL: {
      const { total, shared } = payload

      if (shared) {
        return {
          ...state,
          sharedTotal: total,
        }
      }

      return {
        ...state,
        total,
      }
    }

    case types.SET_LIVE_STATS: {
      const { data, shared = false } = payload

      if (shared) {
        return {
          ...state,
          sharedProjects: _map(state.sharedProjects, res => ({
            ...res,
            project: {
              ...res.project,
              live: data[res.project.id],
            },
          })),
        }
      }

      return {
        ...state,
        projects: _map(state.projects, res => ({
          ...res,
          live: data[res.id],
        })),
      }
    }

    case types.SET_LIVE_STATS_PROJECT: {
      const { id, count, shared = false } = payload

      if (shared) {
        return {
          ...state,
          sharedProjects: _map(state.sharedProjects, res => {
            if (res.id === id) {
              return {
                ...res,
                live: count,
              }
            }

            return res
          }),
        }
      }

      return {
        ...state,
        projects: _map(state.projects, res => {
          if (res.id === id) {
            return {
              ...res,
              live: count,
            }
          }

          return res
        }),
      }
    }

    case types.SET_PUBLIC_PROJECT: {
      const { project, shared = false } = payload

      if (shared) {
        return {
          ...state,
          sharedProjects: _findIndex(state.sharedProjects, (el) => el.id === project.id) >= 0
            ? state.sharedProjects
            : [
              ...state.sharedProjects,
              {
                ...project,
                uiHidden: true,
              },
            ],
        }
      }

      return {
        ...state,
        projects: _findIndex(state.projects, (el) => el.id === project.id) >= 0
          ? state.projects
          : [
            ...state.projects,
            {
              ...project,
              uiHidden: true,
            },
          ],
      }
    }

    case types.SET_PROJECTS_SHARE_DATA: {
      const { data, id, shared = false } = payload

      if (shared) {
        return {
          ...state,
          sharedProjects: _map(state.sharedProjects, (item) => {
            if (item.project.id === id) {
              return {
                ...item,
                ...data,
              }
            }

            return item
          }),
        }
      }

      return {
        ...state,
        projects: _map(state.projects, (item) => {
          if (item.id === id) {
            return {
              ...item,
              ...data,
            }
          }

          return item
        }),
      }
    }

    case types.SET_PROJECTS_ERROR: {
      const { error } = payload
      return {
        ...state,
        error,
      }
    }

    case types.REMOVE_PROJECT: {
      const { pid, shared = false } = payload

      if (shared) {
        return {
          ...state,
          sharedProjects: _filter(state.sharedProjects, (item) => item.project.id !== pid),
          sharedTotal: state.sharedTotal - 1,
        }
      }

      return {
        ...state,
        projects: _filter(state.projects, (project) => project.id !== pid),
        total: state.total - 1,
      }
    }

    case types.SET_PROJECTS_LOADING: {
      const { isLoading, shared = false } = payload
      if (shared) {
        return {
          ...state,
          isLoadingShared: isLoading,
        }
      }
      return {
        ...state,
        isLoading,
      }
    }

    case types.SET_DASHBOARD_TABS: {
      const { tab } = payload

      setItem('dashboardTabs', tab)

      return {
        ...state,
        dashboardTabs: tab,
      }
    }

    default:
      return state
  }
}

export default projectsReducer
