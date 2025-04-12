import _replace from 'lodash/replace'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { checkPassword, getProject } from '~/api'
import { LS_PROJECTS_PROTECTED_KEY } from '~/lib/constants'
import { type Project } from '~/lib/models/Project'
import { type StateType } from '~/lib/store'
import { getItem, removeItem } from '~/utils/localstorage'
import routes from '~/utils/routes'

import { getProjectPreferences, setProjectPreferences } from '../pages/Project/View/utils/cache'
import { CHART_METRICS_MAPPING } from '../pages/Project/View/ViewProject.helpers'

import { useTheme } from './ThemeProvider'

interface CurrentProjectContextType {
  id: string
  project: Project | null
  preferences: ProjectPreferences
  updatePreferences: (prefs: ProjectPreferences) => void
}

const CurrentProjectContext = createContext<CurrentProjectContextType | undefined>(undefined)

interface CurrentProjectProviderProps {
  id: string
  children: React.ReactNode
}

export const useProjectPassword = (id: string) => {
  const [searchParams] = useSearchParams()

  const projectPassword = useMemo(
    () => searchParams.get('password') || (getItem(LS_PROJECTS_PROTECTED_KEY) as Record<string, string>)?.[id] || '',
    [id, searchParams],
  )

  return projectPassword
}

const useIsEmbedded = () => {
  const [searchParams] = useSearchParams()

  return searchParams.get('embedded') === 'true'
}

const useProject = (id: string) => {
  const { theme } = useTheme()
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { loading: authLoading } = useSelector((state: StateType) => state.auth)
  const projectPassword = useProjectPassword(id)
  const isEmbedded = useIsEmbedded()
  const [project, setProject] = useState<Project | null>(null)

  const onErrorLoading = useCallback(() => {
    if (projectPassword) {
      checkPassword(id, projectPassword).then((res) => {
        if (res) {
          navigate({
            pathname: _replace(routes.project, ':id', id),
            search: `?theme=${theme}&embedded=${isEmbedded}`,
          })
          return
        }

        toast.error(t('apiNotifications.incorrectPassword'))
        navigate({
          pathname: _replace(routes.project_protected_password, ':id', id),
          search: `?theme=${theme}&embedded=${isEmbedded}`,
        })
        removeItem(LS_PROJECTS_PROTECTED_KEY)
      })
      return
    }

    toast.error(t('project.noExist'))
    navigate(routes.dashboard)
  }, [id, projectPassword, navigate, t, isEmbedded, theme])

  useEffect(() => {
    if (authLoading || project) {
      return
    }

    getProject(id, projectPassword)
      .then((result) => {
        if (!result) {
          onErrorLoading()
        }

        if (result.isPasswordProtected && !result.role && projectPassword) {
          navigate({
            pathname: _replace(routes.project_protected_password, ':id', id),
            search: `?theme=${theme}&embedded=${isEmbedded}`,
          })
          return
        }

        setProject(result)
      })
      .catch((reason) => {
        console.error('[ERROR] (getProject)', reason)
        onErrorLoading()
      })
  }, [authLoading, project, id, projectPassword, navigate, onErrorLoading, isEmbedded, theme])

  return project
}

export type ProjectPreferences = {
  period?: string
  timeBucket?: string
  rangeDate?: Date[]
  customEvents?: any
  metricsVisualisation?: Record<keyof typeof CHART_METRICS_MAPPING, boolean>
}

const useProjectPreferences = (id: string) => {
  const [preferences, setPreferences] = useState<ProjectPreferences>(getProjectPreferences(id) as ProjectPreferences)

  const updatePreferences = useCallback(
    (prefs: ProjectPreferences) => {
      setPreferences((prev) => {
        const newPrefs = { ...prev, ...prefs }
        setProjectPreferences(id, newPrefs)
        return newPrefs
      })
    },
    [id],
  )

  return { preferences, updatePreferences }
}

export const CurrentProjectProvider = ({ children, id }: CurrentProjectProviderProps) => {
  const project = useProject(id)
  const { preferences, updatePreferences } = useProjectPreferences(id)
  return (
    <CurrentProjectContext.Provider value={{ id, project, preferences, updatePreferences }}>
      {children}
    </CurrentProjectContext.Provider>
  )
}

export const useCurrentProject = () => {
  const context = useContext(CurrentProjectContext)

  if (context === undefined) {
    throw new Error('useCurrentProject must be used within a CurrentProjectProvider')
  }

  return context
}
