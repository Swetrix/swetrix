import { isBrowser, LS_PROJECTS_PROTECTED_KEY, LS_VIEW_PREFS_SETTING } from '~/lib/constants'
import { type Project } from '~/lib/models/Project'
import { getItemJSON, removeItem, setItem } from '~/utils/localstorage'

import { ProjectPreferences } from '../../../../providers/CurrentProjectProvider'

import { filterInvalidPreferences } from './filters'

const getAllProjectPreferences = (): Record<string, ProjectPreferences> => {
  if (!isBrowser) {
    return {}
  }

  const storedPrefs = getItemJSON(LS_VIEW_PREFS_SETTING) || {}

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

const getAllProjectPasswords = () => getItemJSON(LS_PROJECTS_PROTECTED_KEY) || {}

export const setProjectPassword = (id: Project['id'], password: string) => {
  setItem(
    LS_PROJECTS_PROTECTED_KEY,
    JSON.stringify({
      ...getAllProjectPasswords(),
      [id]: password,
    }),
  )
}
