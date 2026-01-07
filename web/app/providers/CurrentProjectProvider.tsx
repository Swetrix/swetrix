import _replace from 'lodash/replace'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams, useFetcher } from 'react-router'
import { toast } from 'sonner'

import { getLiveVisitors } from '~/api'
import { LIVE_VISITORS_UPDATE_INTERVAL, LS_PROJECTS_PROTECTED_KEY, Period, TimeBucket } from '~/lib/constants'
import { type Project } from '~/lib/models/Project'
import type { ProjectViewActionData } from '~/routes/projects.$id'
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
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false)

  const projectFetcher = useFetcher<ProjectViewActionData>()
  const checkPasswordFetcher = useFetcher<ProjectViewActionData>()

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
      checkPasswordFetcher.submit(
        { intent: 'check-password', password: projectPassword },
        { method: 'POST', action: `/projects/${id}` },
      )
      return
    }

    toast.error(t('project.noExist'))
    navigate(routes.dashboard)
  }, [id, projectPassword, navigate, t, checkPasswordFetcher])

  // Handle check password response
  useEffect(() => {
    if (checkPasswordFetcher.state !== 'idle' || !checkPasswordFetcher.data) return

    if (checkPasswordFetcher.data.success && checkPasswordFetcher.data.data === true) {
      navigate({
        pathname: _replace(routes.project, ':id', id),
        search: params,
      })
    } else {
      toast.error(t('apiNotifications.incorrectPassword'))
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPasswordRequired(true)
      removeItem(LS_PROJECTS_PROTECTED_KEY)
    }
  }, [checkPasswordFetcher.state, checkPasswordFetcher.data, id, navigate, params, t])

  // Handle project fetch response
  useEffect(() => {
    if (projectFetcher.state !== 'idle' || !projectFetcher.data) return

    if (projectFetcher.data.success && projectFetcher.data.data) {
      const result = projectFetcher.data.data as Project

      if (result.isPasswordProtected && !result.role && !projectPassword && !passwordForRetry) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsPasswordRequired(true)
        return
      }

      setProject(result)
    } else if (projectFetcher.data.error) {
      console.error('[ERROR] (getProject)', projectFetcher.data.error)
      onErrorLoading()
    }
  }, [projectFetcher.state, projectFetcher.data, projectPassword, passwordForRetry, onErrorLoading])

  // Submit password and retry loading project
  const submitPassword = useCallback(
    async (password: string): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        setProjectPassword(id, password)
        setPasswordForRetry(password)
        setIsPasswordRequired(false)

        // Trigger a new project fetch with the password
        projectFetcher.submit({ intent: 'get-project', password }, { method: 'POST', action: `/projects/${id}` })

        // We'll resolve based on the fetcher result in a subsequent effect
        // For now, return success to indicate the submission was initiated
        resolve({ success: true })
      })
    },
    [id, projectFetcher],
  )

  // Load project
  useEffect(() => {
    if (authLoading || project || hasAttemptedLoad) {
      return
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasAttemptedLoad(true)
    const effectivePassword = passwordForRetry || projectPassword

    projectFetcher.submit(
      { intent: 'get-project', password: effectivePassword },
      { method: 'POST', action: `/projects/${id}` },
    )
  }, [authLoading, project, id, projectPassword, passwordForRetry, hasAttemptedLoad, projectFetcher])

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

    // eslint-disable-next-line react-hooks/set-state-in-effect
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
