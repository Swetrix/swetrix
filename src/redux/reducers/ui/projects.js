import { types } from 'redux/actions/ui/types'
import _filter from 'lodash/filter'
import _findIndex from 'lodash/findIndex'

const getInitialState = () => {
  return {
    projects: [],
    isLoading: true,
    error: null,
  }
}

const projectsReducer = (state = getInitialState(), { type, payload }) => {
  switch (type) {
    case types.SET_PROJECTS: {
      const { projects } = payload
      return {
        ...state,
        projects,
        isLoading: false,
      }
    }

    case types.SET_PROJECT: {
      const { project } = payload
      return {
        ...state,
        projects: _findIndex(state.projects, (el) => el.id === project.id) >= 0 ? state.projects : [...state.projects, project],
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
      const { pid } = payload
      return {
        ...state,
        projects: _filter(state.projects, (project) => project.id !== pid)
      }
    }

    case types.SET_PROJECTS_LOADING: {
      const { isLoading } = payload
      return {
        ...state,
        isLoading,
      }
    }

    default:
      return state
  }
}

export default projectsReducer
