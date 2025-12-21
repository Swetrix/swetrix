import _replace from 'lodash/replace'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { checkPassword, getLiveVisitors, getProject } from '~/api'
import { LIVE_VISITORS_UPDATE_INTERVAL, LS_PROJECTS_PROTECTED_KEY, Period, TimeBucket } from '~/lib/constants'
import { type Project } from '~/lib/models/Project'
import { getItemJSON, removeItem } from '~/utils/localstorage'
import routes from '~/utils/routes'

import { getProjectPreferences, setProjectPassword, setProjectPreferences } from '../pages/Project/View/utils/cache'
import { CHART_METRICS_MAPPING } from '../pages/Project/View/ViewProject.helpers'

import { useAuth } from './AuthProvider'

interface CurrentProjectContextType {
  id: string
  project: Project | null
  preferences: ProjectPreferences
  allowedToManage: boolean
  updatePreferences: (prefs: ProjectPreferences) => void
  mergeProject: (project: Partial<Project>) => void
  liveVisitors: number
  updateLiveVisitors: () => Promise<void>
  isPasswordRequired: boolean
  submitPassword: (password: string) => Promise<{ success: boolean; error?: string }>
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
  const [isPasswordRequired, setIsPasswordRequired] = useState(false)
  const [passwordForRetry, setPasswordForRetry] = useState<string | null>(null)

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
        setIsPasswordRequired(true)
        removeItem(LS_PROJECTS_PROTECTED_KEY)
      })
      return
    }

    toast.error(t('project.noExist'))
    navigate(routes.dashboard)
  }, [id, projectPassword, navigate, t, params])

  // Function to submit password and retry loading project
  const submitPassword = useCallback(
    async (password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const isValid = await checkPassword(id, password)

        if (!isValid) {
          return { success: false, error: t('apiNotifications.incorrectPassword') }
        }

        // Password is correct, store it for future use and trigger project reload
        setProjectPassword(id, password)
        setPasswordForRetry(password)
        setIsPasswordRequired(false)
        return { success: true }
      } catch (error) {
        console.error('[ERROR] (submitPassword)', error)
        return { success: false, error: t('apiNotifications.somethingWentWrong') }
      }
    },
    [id, t],
  )

  useEffect(() => {
    if (authLoading || project) {
      return
    }

    // Use passwordForRetry if available, otherwise use stored password
    const effectivePassword = passwordForRetry || projectPassword

    getProject(id, effectivePassword)
      .then((result) => {
        if (!result) {
          onErrorLoading()
          return
        }

        if (result.isPasswordProtected && !result.role && !effectivePassword) {
          // Show password modal instead of redirecting
          setIsPasswordRequired(true)
          return
        }

        setProject(result)
      })
      .catch((reason) => {
        console.error('[ERROR] (getProject)', reason)
        onErrorLoading()
      })
  }, [authLoading, project, id, projectPassword, passwordForRetry, navigate, onErrorLoading, params])

  const mergeProject = useCallback((project: Partial<Project>) => {
    setProject((prev) => {
      if (!prev) {
        return null
      }

      return { ...prev, ...project }
    })
  }, [])

  return { project, mergeProject, isPasswordRequired, submitPassword }
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

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial fetch and interval subscription
    updateLiveVisitors()

    const interval = setInterval(async () => {
      await updateLiveVisitors()
    }, LIVE_VISITORS_UPDATE_INTERVAL)

    return () => clearInterval(interval)
  }, [project, updateLiveVisitors])

  return { liveVisitors, updateLiveVisitors }
}

export const CurrentProjectProvider = ({ children, id }: CurrentProjectProviderProps) => {
  const { project, mergeProject, isPasswordRequired, submitPassword } = useProject(id)
  const { preferences, updatePreferences } = useProjectPreferences(id)
  const { liveVisitors, updateLiveVisitors } = useLiveVisitors(project)

  return (
    <CurrentProjectContext.Provider
      value={{
        id,
        project,
        preferences,
        updatePreferences,
        mergeProject,
        allowedToManage: project?.role === 'owner' || project?.role === 'admin',
        liveVisitors,
        updateLiveVisitors,
        isPasswordRequired,
        submitPassword,
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
