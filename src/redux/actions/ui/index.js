import { types } from './types'

const loadProjects = (take, skip) => ({
  type: types.LOAD_PROJECTS,
  payload: { take, skip },
})

const loadSharedProjects = (take, skip) => ({
  type: types.LOAD_SHARED_PROJECTS,
  payload: { take, skip },
})

const setProjects = (projects, shared) => ({
  type: types.SET_PROJECTS,
  payload: {
    projects,
    shared,
  },
})

const setExtensions = (extensions) => ({
  type: types.SET_EXTENSIONS,
  payload: {
    extensions,
  },
})

const loadExtensions = () => ({
  type: types.LOAD_EXTENSIONS,
})

const setTotalMonthlyEvents = (totalMonthlyEvents) => ({
  type: types.SET_TOTAL_MONTHLY_EVENTS,
  payload: {
    totalMonthlyEvents,
  },
})

const setTotal = (total, shared) => ({
  type: types.SET_TOTAL,
  payload: {
    total,
    shared,
  },
})

const setDashboardPaginationPage = (page) => ({
  type: types.SET_DASHBOARD_PAGINATION_PAGE,
  payload: {
    page,
  },
})

const setDashboardPaginationPageShared = (page) => ({
  type: types.SET_DASHBOARD_PAGINATION_PAGE_SHARED,
  payload: {
    page,
  },
})

const setShowNoEventsLeftBanner = (showNoEventsLeftBanner) => ({
  type: types.SET_SHOW_NO_EVENTS_LEFT,
  payload: {
    showNoEventsLeftBanner,
  },
})

const setLiveStats = (data, shared) => ({
  type: types.SET_LIVE_STATS,
  payload: {
    data,
    shared,
  },
})

const setLiveStatsForProject = (id, count, shared) => ({
  type: types.SET_LIVE_STATS_PROJECT,
  payload: {
    id, count, shared,
  },
})

const setPublicProject = (project, shared) => ({
  type: types.SET_PUBLIC_PROJECT,
  payload: {
    project,
    shared,
  },
})

const removeProject = (pid, shared) => ({
  type: types.REMOVE_PROJECT,
  payload: {
    pid,
    shared,
  },
})

const setProjectsError = (error) => ({
  type: types.SET_PROJECTS_ERROR,
  payload: {
    error,
  },
})

const setProjectsLoading = (isLoading, shared) => ({
  type: types.SET_PROJECTS_LOADING,
  payload: {
    isLoading,
    shared,
  },
})

const setProjectCache = (pid, data, key) => ({
  type: types.SET_PROJECT_CACHE,
  payload: {
    pid, data, key,
  },
})

const setProjectCachePerf = (pid, data, key) => ({
  type: types.SET_PROJECT_CACHE_PERF,
  payload: {
    pid, data, key,
  },
})

const setProjectForcastCache = (pid, data, key) => ({
  type: types.SET_PROJECT_FORECAST_CACHE,
  payload: {
    pid, data, key,
  },
})

const deleteProjectCache = (pid, period, timeBucket) => ({
  type: types.DELETE_PROJECT_CACHE,
  payload: {
    pid, period, timeBucket,
  },
})

const deleteProjectCachePerf = (pid, period, timeBucket) => ({
  type: types.DELETE_PROJECT_CACHE_PERF,
  payload: {
    pid, period, timeBucket,
  },
})

const setProjectViewPrefs = (pid, period, timeBucket, rangeDate) => ({
  type: types.SET_PROJECT_VIEW_PREFS,
  payload: {
    pid, period, timeBucket, rangeDate,
  },
})

const setTheme = (theme) => ({
  type: types.SET_THEME,
  payload: {
    theme,
  },
})

const setGeneralStats = (stats) => ({
  type: types.SET_GENERAL_STATS,
  payload: {
    stats,
  },
})

const setPaddleLastEvent = (event) => ({
  type: types.SET_PADDLE_LAST_EVENT,
  payload: {
    event,
  },
})

const setProjectsShareData = (data, id, shared) => ({
  type: types.SET_PROJECTS_SHARE_DATA,
  payload: {
    data,
    id,
    shared,
  },
})

const shareVerifyAsync = (data, successfulCallback, errorCallback) => ({
  type: types.SHARE_VERIFY_ASYNC,
  payload: { data, successfulCallback, errorCallback },
})

const setDashboardTabs = (tab) => ({
  type: types.SET_DASHBOARD_TABS,
  payload: { tab },
})

const setLastBlogPost = (lastBlogPost) => ({
  type: types.SET_LAST_BLOG_POST,
  payload: { lastBlogPost },
})

const setThemeType = (theme) => ({
  type: types.SET_THEME_TYPE,
  payload: { theme },
})

const setProjectTab = (tab) => ({
  type: types.SET_PROJECT_TAB,
  payload: { tab },
})

const setProjectAlerts = (alerts) => ({
  type: types.SET_PROJECT_ALERTS,
  payload: { alerts },
})

const setProjectAlertsTotal = (total, pageTotal) => ({
  type: types.SET_PROJECT_ALERTS_TOTAL,
  payload: { total, pageTotal },
})

const setProjectAlertsLoading = (loading) => ({
  type: types.SET_PROJECT_ALERTS_LOADING,
  payload: { loading },
})

const loadProjectAlerts = (take, skip) => ({
  type: types.LOAD_PROJECT_ALERTS,
  payload: { take, skip },
})

const UIActions = {
  loadProjects,
  loadSharedProjects,
  setProjects,
  setProjectsError,
  setProjectsLoading,
  removeProject,
  setProjectCache,
  deleteProjectCache,
  setProjectViewPrefs,
  setPublicProject,
  setLiveStatsForProject,
  setLiveStats,
  setTheme,
  setGeneralStats,
  setPaddleLastEvent,
  setTotalMonthlyEvents,
  setDashboardPaginationPage,
  setDashboardPaginationPageShared,
  setTotal,
  setShowNoEventsLeftBanner,
  setProjectsShareData,
  shareVerifyAsync,
  setDashboardTabs,
  setExtensions,
  loadExtensions,
  setLastBlogPost,
  setThemeType,
  setProjectCachePerf,
  deleteProjectCachePerf,
  setProjectTab,
  setProjectAlerts,
  setProjectAlertsTotal,
  setProjectAlertsLoading,
  loadProjectAlerts,
  setProjectForcastCache,
}

export default UIActions
