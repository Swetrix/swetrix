import { types } from './types'

const loadProjects = () => ({
  type: types.LOAD_PROJECTS,
})

const setProjects = (projects) => ({
  type: types.SET_PROJECTS,
  payload: {
    projects,
  }
})

const setProjectsError = (error) => ({
  type: types.SET_PROJECTS_ERROR,
  payload: {
    error,
  }
})

const setProjectsLoading = (isLoading) => ({
  type: types.SET_PROJECTS_LOADING,
  payload: {
    isLoading,
  }
})

export default {
  loadProjects,
  setProjects,
  setProjectsError,
  setProjectsLoading,
}
