import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  useNavigate,
  useSearchParams,
  useFetcher,
  useLoaderData,
} from 'react-router'
import { toast } from 'sonner'

import { useLiveVisitorsProxy } from '~/hooks/useAnalyticsProxy'
import {
  LIVE_VISITORS_UPDATE_INTERVAL,
  LS_PROJECTS_PROTECTED_KEY,
  Period,
  TimeBucket,
} from '~/lib/constants'
import { type Project } from '~/lib/models/Project'
import type {
  ProjectLoaderData,
  ProjectViewActionData,
} from '~/routes/projects.$id'
import { getItemJSON } from '~/utils/localstorage'
import routes from '~/utils/routes'

import {
  getProjectPreferences,
  setProjectPassword,
  setProjectPreferences,
} from '../pages/Project/View/utils/cache'
import { CHART_METRICS_MAPPING } from '../pages/Project/View/ViewProject.helpers'

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
  submitPassword: (
    password: string,
  ) => Promise<{ success: boolean; error?: string }>
}

const CurrentProjectContext = createContext<
  CurrentProjectContextType | undefined
>(undefined)

interface CurrentProjectProviderProps {
  id: string
  children: React.ReactNode
}

export const useProjectPassword = (id?: string) => {
  const [searchParams] = useSearchParams()

  const projectPassword = useMemo(
    () =>
      searchParams.get('password') ||
      getItemJSON(LS_PROJECTS_PROTECTED_KEY)?.[id || ''] ||
      '',
    [id, searchParams],
  )

  return projectPassword
}

const useProject = (id: string) => {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const loaderData = useLoaderData<ProjectLoaderData>()
  const storedPassword = useProjectPassword(id)

  // Use loader data only for initial state (SSR hydration)
  const [project, setProject] = useState<Project | null>(
    () => loaderData?.project || null,
  )
  const [isPasswordRequired, setIsPasswordRequired] = useState(
    () => loaderData?.isPasswordRequired || false,
  )

  const passwordFetcher = useFetcher<ProjectViewActionData>()
  const lastHandledFetcherData = useRef<ProjectViewActionData | null>(null)
  const hasTriedStoredPassword = useRef(false)
  const passwordResolverRef = useRef<
    ((value: { success: boolean; error?: string }) => void) | null
  >(null)
  const lastSubmittedPasswordRef = useRef<string | null>(null)

  useEffect(() => {
    if (
      loaderData?.error &&
      !loaderData.project &&
      !loaderData.isPasswordRequired
    ) {
      console.error('[ERROR] (getProject)', loaderData.error)
      toast.error(t('project.noExist'))
      navigate(routes.dashboard)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-submit stored password if loader says password is required but we have it in localStorage
  useEffect(() => {
    if (
      loaderData?.isPasswordRequired &&
      storedPassword &&
      !hasTriedStoredPassword.current &&
      passwordFetcher.state === 'idle'
    ) {
      hasTriedStoredPassword.current = true
      passwordFetcher.submit(
        { intent: 'get-project', password: storedPassword },
        { method: 'POST', action: `/projects/${id}` },
      )
    }
  }, [loaderData?.isPasswordRequired, storedPassword, id, passwordFetcher])

  // Handle password fetcher response
  useEffect(() => {
    if (passwordFetcher.state !== 'idle' || !passwordFetcher.data) return

    // Prevent handling the same response twice
    if (lastHandledFetcherData.current === passwordFetcher.data) return
    lastHandledFetcherData.current = passwordFetcher.data

    if (passwordFetcher.data.success && passwordFetcher.data.data) {
      const result = passwordFetcher.data.data as Project
      setProject(result)
      setIsPasswordRequired(false)

      if (lastSubmittedPasswordRef.current) {
        setProjectPassword(id, lastSubmittedPasswordRef.current)
        lastSubmittedPasswordRef.current = null
      }

      if (passwordResolverRef.current) {
        passwordResolverRef.current({ success: true })
        passwordResolverRef.current = null
      }
    } else if (passwordFetcher.data.error) {
      toast.error(t('apiNotifications.incorrectPassword'))

      lastSubmittedPasswordRef.current = null
      if (passwordResolverRef.current) {
        passwordResolverRef.current({
          success: false,
          error: passwordFetcher.data.error,
        })
        passwordResolverRef.current = null
      }
    }
  }, [passwordFetcher.state, passwordFetcher.data, t, id])

  const submitPassword = useCallback(
    async (password: string): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        passwordResolverRef.current = resolve
        lastSubmittedPasswordRef.current = password
        passwordFetcher.submit(
          { intent: 'get-project', password },
          { method: 'POST', action: `/projects/${id}` },
        )
      })
    },
    [id, passwordFetcher],
  )

  const mergeProject = useCallback((updates: Partial<Project>) => {
    setProject((prev) => {
      if (!prev) {
        return null
      }

      return { ...prev, ...updates }
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
  const [preferences, setPreferences] = useState<ProjectPreferences>(
    getProjectPreferences(id) as ProjectPreferences,
  )

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
  const projectId = project?.id
  const isLocked = project?.isLocked
  const [liveVisitors, setLiveVisitors] = useState(0)
  const { fetchLiveVisitors } = useLiveVisitorsProxy()

  const updateLiveVisitors = useCallback(async () => {
    if (!projectId || isLocked) {
      return
    }

    try {
      const result = await fetchLiveVisitors([projectId])
      if (result) {
        setLiveVisitors(result[projectId] || 0)
      }
    } catch (reason) {
      console.error('Failed to update live visitors:', reason)
    }
  }, [projectId, isLocked, fetchLiveVisitors])

  useEffect(() => {
    if (!projectId || isLocked) {
      return
    }

    // Initial fetch on mount - eslint-disable needed as this is intentional
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateLiveVisitors()

    const interval = setInterval(() => {
      updateLiveVisitors()
    }, LIVE_VISITORS_UPDATE_INTERVAL)

    return () => clearInterval(interval)
  }, [projectId, isLocked, updateLiveVisitors])

  return { liveVisitors, updateLiveVisitors }
}

export const CurrentProjectProvider = ({
  children,
  id,
}: CurrentProjectProviderProps) => {
  const { project, mergeProject, isPasswordRequired, submitPassword } =
    useProject(id)
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
    throw new Error(
      'useCurrentProject must be used within a CurrentProjectProvider',
    )
  }

  return context
}
