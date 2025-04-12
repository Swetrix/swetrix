import { isBrowser, LS_PROJECTS_PROTECTED_KEY, LS_VIEW_PREFS_SETTING } from '~/lib/constants'
import { type Project } from '~/lib/models/Project'
import { getItem, removeItem, setItem } from '~/utils/localstorage'

import { ProjectPreferences } from '../../providers/CurrentProjectProvider'

import { filterInvalidPreferences } from './filters'

const getAllProjectPreferences = (): Record<string, ProjectPreferences> => {
  if (!isBrowser) {
    return {}
  }

  const storedPrefs = (getItem(LS_VIEW_PREFS_SETTING) as Record<string, ProjectPreferences>) || {}

  try {
    return filterInvalidPreferences(storedPrefs)
  } catch {
    removeItem(LS_VIEW_PREFS_SETTING)
  }

  return {}
}

export const getProjectPreferences = (id: Project['id']): ProjectPreferences => {
  const preferences = getAllProjectPreferences()
  return preferences?.[id] || {}
}

export const setProjectPreferences = (id: Project['id'], preferences: ProjectPreferences) => {
  setItem(
    LS_VIEW_PREFS_SETTING,
    JSON.stringify({
      ...getAllProjectPreferences(),
      [id]: preferences,
    }),
  )
}

const getAllProjectPasswords = () => (getItem(LS_PROJECTS_PROTECTED_KEY) as Record<string, string>) || {}

export const setProjectPassword = (id: Project['id'], password: string) => {
  setItem(
    LS_PROJECTS_PROTECTED_KEY,
    JSON.stringify({
      ...getAllProjectPasswords(),
      [id]: password,
    }),
  )
}
