import { types } from 'redux/actions/ui/types'

const getInitialState = () => {
  return {
    projects: [],
    isLoading: true,
		error: null,
  }
}

export default (state = getInitialState(), { type, payload }) => {
  switch (type) {
    case types.SET_PROJECTS: {
      const { projects } = payload
      return {
        ...state,
        projects,
        isLoading: false,
      }
    }

    case types.SET_PROJECTS_ERROR: {
      const { error } = payload
      return {
        ...state,
				error,
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
