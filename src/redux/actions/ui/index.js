import { types } from './types'

const loadProjects = () => ({
  type: types.LOAD_PROJECTS,
})

const setProjects = (projects) => ({
  type: types.SET_PROJECTS,
  payload: {
    projects,
  },
})

const setProject = (project) => ({
  type: types.SET_PROJECT,
  payload: {
    project,
  },
})

const removeProject = (pid) => ({
  type: types.REMOVE_PROJECT,
  payload: {
    pid,
  },
})

const setProjectsError = (error) => ({
  type: types.SET_PROJECTS_ERROR,
  payload: {
    error,
  },
})

const setProjectsLoading = (isLoading) => ({
  type: types.SET_PROJECTS_LOADING,
  payload: {
    isLoading,
  },
})

const setProjectCache = (pid, period, timeBucket, data) => ({
  type: types.SET_PROJECT_CACHE,
  payload: {
    pid, period, timeBucket, data,
  },
})

const deleteProjectCache = (pid, period, timeBucket) => ({
  type: types.DELETE_PROJECT_CACHE,
  payload: {
    pid, period, timeBucket,
  },
})

const setProjectViewPrefs = (pid, period, timeBucket) => ({
  type: types.SET_PROJECT_VIEW_PREFS,
  payload: {
    pid, period, timeBucket,
  },
})

const UIActions = {
  loadProjects,
  setProjects,
  setProjectsError,
  setProjectsLoading,
  removeProject,
  setProjectCache,
  deleteProjectCache,
  setProjectViewPrefs,
  setProject,
}

export default UIActions
