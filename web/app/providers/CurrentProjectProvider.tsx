import _replace from 'lodash/replace'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { checkPassword, getInstalledExtensions, getLiveVisitors, getProject } from '~/api'
import {
  isSelfhosted,
  LIVE_VISITORS_UPDATE_INTERVAL,
  LS_PROJECTS_PROTECTED_KEY,
  Period,
  TimeBucket,
} from '~/lib/constants'
import { Extension, type Project } from '~/lib/models/Project'
import { getItemJSON, removeItem } from '~/utils/localstorage'
import routes from '~/utils/routes'

import { getProjectPreferences, setProjectPreferences } from '../pages/Project/View/utils/cache'
import { CHART_METRICS_MAPPING } from '../pages/Project/View/ViewProject.helpers'

import { useAuth } from './AuthProvider'

interface CurrentProjectContextType {
  id: string
  project: Project | null
  preferences: ProjectPreferences
  extensions: Extension[]
  allowedToManage: boolean
  updatePreferences: (prefs: ProjectPreferences) => void
  mergeProject: (project: Partial<Project>) => void
  liveVisitors: number
  updateLiveVisitors: () => Promise<void>
}

const CurrentProjectContext = createContext<CurrentProjectContextType | undefined>(undefined)

interface CurrentProjectProviderProps {
  id: string
  children: React.ReactNode
}

export const useProjectPassword = (id?: string) => {
  const [searchParams] = useSearchParams()

  const projectPassword = useMemo(
    () => searchParams.get('password') || getItemJSON(LS_PROJECTS_PROTECTED_KEY)?.[id || ''] || '',
    [id, searchParams],
  )

  return projectPassword
}

const useProject = (id: string) => {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { isLoading: authLoading } = useAuth()
  const projectPassword = useProjectPassword(id)
  const [project, setProject] = useState<Project | null>(null)

  const [searchParams] = useSearchParams()

  const params = useMemo(() => {
    const searchParamsObj = new URLSearchParams()

    if (searchParams.has('theme')) {
      searchParamsObj.set('theme', searchParams.get('theme')!)
    }

    if (searchParams.has('embedded')) {
      searchParamsObj.set('embedded', searchParams.get('embedded')!)
    }

    const searchString = searchParamsObj.toString()
    return searchString ? `?${searchString}` : undefined
  }, [searchParams])

  const onErrorLoading = useCallback(() => {
    if (projectPassword) {
      checkPassword(id, projectPassword).then((res) => {
        if (res) {
          navigate({
            pathname: _replace(routes.project, ':id', id),
            search: params,
          })
          return
        }

        toast.error(t('apiNotifications.incorrectPassword'))
        navigate({
          pathname: _replace(routes.project_protected_password, ':pid', id),
          search: params,
        })
        removeItem(LS_PROJECTS_PROTECTED_KEY)
      })
      return
    }

    toast.error(t('project.noExist'))
    navigate(routes.dashboard)
  }, [id, projectPassword, navigate, t, params])

  useEffect(() => {
    if (authLoading || project) {
      return
    }

    getProject(id, projectPassword)
      .then((result) => {
        if (!result) {
          onErrorLoading()
        }

        if (result.isPasswordProtected && !result.role && !projectPassword) {
          navigate({
            pathname: _replace(routes.project_protected_password, ':pid', id),
            search: params,
          })
          return
        }

        setProject(result)
      })
      .catch((reason) => {
        console.error('[ERROR] (getProject)', reason)
        onErrorLoading()
      })
  }, [authLoading, project, id, projectPassword, navigate, onErrorLoading, params])

  const mergeProject = useCallback((project: Partial<Project>) => {
    setProject((prev) => {
      if (!prev) {
        return null
      }

      return { ...prev, ...project }
    })
  }, [])

  return { project, mergeProject }
}

export type ProjectPreferences = {
  period?: Period
  timeBucket?: TimeBucket
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

const useLiveVisitors = (project: Project | null) => {
  const projectPassword = useProjectPassword(project?.id)
  const [liveVisitors, setLiveVisitors] = useState(0)

  const updateLiveVisitors = useCallback(async () => {
    if (!project || project.isLocked) {
      return
    }

    const { id: pid } = project
    const result = await getLiveVisitors([pid], projectPassword)
    setLiveVisitors(result[pid] || 0)
  }, [project, projectPassword])

  useEffect(() => {
    if (!project || project.isLocked) {
      return
    }

    updateLiveVisitors()

    const interval = setInterval(async () => {
      await updateLiveVisitors()
    }, LIVE_VISITORS_UPDATE_INTERVAL)

    return () => clearInterval(interval)
  }, [project, updateLiveVisitors])

  return { liveVisitors, updateLiveVisitors }
}

export const CurrentProjectProvider = ({ children, id }: CurrentProjectProviderProps) => {
  const { project, mergeProject } = useProject(id)
  const { isAuthenticated } = useAuth()
  const { preferences, updatePreferences } = useProjectPreferences(id)
  const [extensions, setExtensions] = useState<Extension[]>([])
  const { liveVisitors, updateLiveVisitors } = useLiveVisitors(project)

  useEffect(() => {
    if (!project || isSelfhosted || !isAuthenticated) {
      return
    }

    const abortController = new AbortController()

    getInstalledExtensions(100, 0, { signal: abortController.signal })
      .then(({ extensions }) => {
        setExtensions(extensions)
      })
      .catch((reason) => {
        console.error('[ERROR] (CurrentProjectProvider -> getInstalledExtensions)', reason)
      })

    return () => abortController.abort()
  }, [project, isAuthenticated])

  return (
    <CurrentProjectContext.Provider
      value={{
        id,
        project,
        preferences,
        updatePreferences,
        extensions,
        mergeProject,
        allowedToManage: project?.role === 'owner' || project?.role === 'admin',
        liveVisitors,
        updateLiveVisitors,
      }}
    >
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
