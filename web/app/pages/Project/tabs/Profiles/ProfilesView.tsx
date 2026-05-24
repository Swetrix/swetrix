import _isEmpty from 'lodash/isEmpty'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { ApiProfile } from '~/api/api.server'
import {
  useProfilesProxy,
  useProfileProxy,
  useProfileSessionsProxy,
} from '~/hooks/useAnalyticsProxy'
import {
  Profile,
  ProfileDetails as ProfileDetailsType,
  Session,
} from '~/lib/models/Project'
import NoProfiles from '~/pages/Project/tabs/Profiles/components/NoProfiles'
import { ProfileDetails } from '~/pages/Project/tabs/Profiles/ProfileDetails'
import { Profiles } from '~/pages/Project/tabs/Profiles/Profiles'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import ProjectViewHeaderActions from '~/pages/Project/View/components/ProjectViewHeaderActions'
import {
  useViewProjectContext,
  useRefreshTriggers,
} from '~/pages/Project/View/ViewProject'
import { getFormatDate } from '~/pages/Project/View/ViewProject.helpers'
import {
  useCurrentProject,
  useProjectPassword,
} from '~/providers/CurrentProjectProvider'
import InfiniteScrollTrigger from '~/ui/InfiniteScrollTrigger'
import LoadingBar from '~/ui/LoadingBar'

import Filters from '../../View/components/Filters'
import { LoaderView } from '../../View/components/LoaderView'

const mapApiProfileToUI = (apiProfile: ApiProfile): Profile => ({
  profileId: apiProfile.profileId,
  isIdentified: apiProfile.isIdentified,
  sessionsCount: apiProfile.sessionsCount,
  pageviewsCount: apiProfile.pageviewsCount,
  eventsCount: apiProfile.eventsCount,
  errorsCount: apiProfile.errorsCount,
  firstSeen: apiProfile.firstSeen,
  lastSeen: apiProfile.lastSeen,
  cc: apiProfile.cc,
  os: apiProfile.os,
  br: apiProfile.br,
  dv: apiProfile.dv,
})

const SESSIONS_TAKE = 30

interface ProfilesViewProps {
  tnMapping: Record<string, string>
}

const ProfilesView = ({ tnMapping }: ProfilesViewProps) => {
  const { id, project } = useCurrentProject()
  const projectPassword = useProjectPassword(id)
  const { profilesRefreshTrigger } = useRefreshTriggers()
  const { timezone, period, dateRange, filters, timeFormat } =
    useViewProjectContext()
  const { t } = useTranslation('common')
  const [searchParams] = useSearchParams()
  const profilesProxy = useProfilesProxy()
  const profileProxy = useProfileProxy()
  const profileSessionsProxy = useProfileSessionsProxy()

  // Profiles state
  const [profilesSkip, setProfilesSkip] = useState(0)
  const [canLoadMoreProfiles, setCanLoadMoreProfiles] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [profilesLoading, setProfilesLoading] = useState<boolean | null>(null)
  const [activeProfile, setActiveProfile] = useState<ProfileDetailsType | null>(
    null,
  )
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSessions, setProfileSessions] = useState<Session[]>([])
  const [profileSessionsLoading, setProfileSessionsLoading] = useState<
    boolean | null
  >(null)
  const [profileSessionsSkip, setProfileSessionsSkip] = useState(0)
  const [canLoadMoreProfileSessions, setCanLoadMoreProfileSessions] =
    useState(false)
  const [profileTypeFilter, setProfileTypeFilter] = useState<
    'all' | 'anonymous' | 'identified'
  >('all')

  const activeProfileId = useMemo(() => {
    return searchParams.get('profileId')
  }, [searchParams])

  const prevActiveProfileIdRef = useRef<string | null>(activeProfileId)
  const profilesRequestIdRef = useRef(0)
  const profileRequestIdRef = useRef(0)
  const profileSessionsRequestIdRef = useRef(0)
  const skipNextProfilesAutoLoadRef = useRef(false)
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const loadProfiles = async (
    forcedSkip?: number,
    override?: boolean,
    options: { take?: number; limit?: number } = {},
  ) => {
    if (profilesLoading) {
      return
    }

    const requestId = ++profilesRequestIdRef.current
    setProfilesLoading(true)

    try {
      const skip = typeof forcedSkip === 'number' ? forcedSkip : profilesSkip
      let from = ''
      let to = ''

      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
      }

      const dataProfiles = await profilesProxy.fetchProfiles(id, {
        period: period === 'custom' && dateRange ? '' : period,
        filters,
        from: period === 'custom' && dateRange ? from : '',
        to: period === 'custom' && dateRange ? to : '',
        take: options.take || SESSIONS_TAKE,
        skip,
        timezone,
        profileType: profileTypeFilter,
      })

      if (requestId === profilesRequestIdRef.current && isMountedRef.current) {
        const profilesList = (dataProfiles?.profiles || []).map(
          mapApiProfileToUI,
        )
        const visibleProfiles =
          typeof options.limit === 'number'
            ? profilesList.slice(0, options.limit)
            : profilesList

        if (override) {
          setProfiles(visibleProfiles)
        } else {
          setProfiles((prev) => [...prev, ...visibleProfiles])
        }
        setProfilesSkip(skip + visibleProfiles.length)

        if (typeof options.limit === 'number') {
          setCanLoadMoreProfiles(profilesList.length > options.limit)
        } else {
          setCanLoadMoreProfiles(
            profilesList.length >= (options.take || SESSIONS_TAKE),
          )
        }
      }
    } catch (reason) {
      console.error(
        '[ERROR](loadProfiles) Loading profiles data failed:',
        reason,
      )
    } finally {
      if (requestId === profilesRequestIdRef.current && isMountedRef.current) {
        setProfilesLoading(false)
      }
    }
  }

  const loadProfile = async (
    profileId: string,
    options: { sessionsTake?: number; sessionsLimit?: number } = {},
  ) => {
    const requestId = ++profileRequestIdRef.current
    const hasExistingProfileData =
      !!activeProfile && activeProfile.profileId === profileId

    setProfileLoading(true)
    // Avoid flicker on refresh: keep currently displayed details/sessions while we refetch.
    // Only reset sessions when opening a different profile (or first load).
    if (!hasExistingProfileData) {
      setProfileSessions([])
      setProfileSessionsSkip(0)
      setCanLoadMoreProfileSessions(false)
    }

    try {
      let from = ''
      let to = ''

      if (period === 'custom' && dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
      }

      const data = await profileProxy.fetchProfile(id, profileId, {
        period: period === 'custom' && dateRange ? '' : period,
        from,
        to,
        timezone,
      })

      if (
        requestId === profileRequestIdRef.current &&
        isMountedRef.current &&
        data
      ) {
        setActiveProfile(data as unknown as ProfileDetailsType)
        loadProfileSessionsData(profileId, 0, true, {
          take: options.sessionsTake,
          limit: options.sessionsLimit,
        })
      }
    } catch (reason) {
      console.error('[ERROR](loadProfile) Loading profile data failed:', reason)
      if (requestId === profileRequestIdRef.current && isMountedRef.current) {
        setActiveProfile(null)
      }
    } finally {
      if (requestId === profileRequestIdRef.current && isMountedRef.current) {
        setProfileLoading(false)
      }
    }
  }

  const loadProfileSessionsData = async (
    profileId: string,
    forcedSkip?: number,
    override?: boolean,
    options: { take?: number; limit?: number } = {},
  ) => {
    if (profileSessionsLoading) {
      return
    }

    const requestId = ++profileSessionsRequestIdRef.current
    setProfileSessionsLoading(true)

    try {
      const skip =
        typeof forcedSkip === 'number' ? forcedSkip : profileSessionsSkip
      let from = ''
      let to = ''

      if (period === 'custom' && dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
      }

      const dataSessions = await profileSessionsProxy.fetchProfileSessions(
        id,
        profileId,
        {
          period: period === 'custom' && dateRange ? '' : period,
          filters,
          from,
          to,
          take: options.take || SESSIONS_TAKE,
          skip,
          timezone,
        },
      )

      if (
        requestId === profileSessionsRequestIdRef.current &&
        isMountedRef.current
      ) {
        const sessionsList = (dataSessions?.sessions ||
          []) as unknown as Session[]
        const visibleSessions =
          typeof options.limit === 'number'
            ? sessionsList.slice(0, options.limit)
            : sessionsList

        if (override) {
          setProfileSessions(visibleSessions)
        } else {
          setProfileSessions((prev) => [...prev, ...visibleSessions])
        }
        setProfileSessionsSkip(skip + visibleSessions.length)

        if (typeof options.limit === 'number') {
          setCanLoadMoreProfileSessions(sessionsList.length > options.limit)
        } else {
          setCanLoadMoreProfileSessions(
            sessionsList.length >= (options.take || SESSIONS_TAKE),
          )
        }
      }
    } catch (reason) {
      console.error(
        '[ERROR](loadProfileSessions) Loading profile sessions failed:',
        reason,
      )
    } finally {
      if (
        requestId === profileSessionsRequestIdRef.current &&
        isMountedRef.current
      ) {
        setProfileSessionsLoading(false)
      }
    }
  }

  // Load profiles list when component mounts or dependencies change
  useEffect(() => {
    if (!project || activeProfileId) {
      return
    }

    if (skipNextProfilesAutoLoadRef.current) {
      skipNextProfilesAutoLoadRef.current = false
      return
    }

    // Reset pagination and load the first page whenever the query context changes
    setProfilesSkip(0)
    loadProfiles(0, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dateRange,
    filters,
    id,
    period,
    projectPassword,
    timezone,
    project,
    activeProfileId,
    profileTypeFilter,
  ])

  // Reload active profile when query context changes (period, date range, filters, etc.)
  useEffect(() => {
    if (!activeProfileId || !project) {
      return
    }

    loadProfile(activeProfileId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeProfileId,
    project,
    period,
    dateRange,
    timezone,
    filters,
    projectPassword,
    id,
  ])

  // Reset profiles when navigating away from profile detail
  useEffect(() => {
    const prevProfileId = prevActiveProfileIdRef.current
    prevActiveProfileIdRef.current = activeProfileId

    if (prevProfileId && !activeProfileId) {
      // We just closed a profile detail, reset to first page
      setProfilesSkip(0)
      skipNextProfilesAutoLoadRef.current = true
      loadProfiles(0, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfileId])

  // Handle refresh trigger from parent
  useEffect(() => {
    if (profilesRefreshTrigger > 0) {
      if (activeProfileId) {
        const limit = Math.max(profileSessions.length, SESSIONS_TAKE)
        loadProfile(activeProfileId, {
          sessionsTake: limit + 1,
          sessionsLimit: limit,
        })
      } else {
        const limit = Math.max(profiles.length, SESSIONS_TAKE)
        loadProfiles(0, true, { take: limit + 1, limit })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profilesRefreshTrigger])

  // Profile detail view
  if (activeProfileId) {
    const backSearchParams = (() => {
      const params = new URLSearchParams(searchParams)
      params.delete('profileId')
      return params.toString()
    })()

    return (
      <>
        <DashboardHeader
          backLink={`?${backSearchParams}`}
          backButtonLabel={t('project.backToUsers')}
          showLiveVisitors={false}
        />
        {profileLoading && !activeProfile ? (
          <LoaderView />
        ) : (
          <ProfileDetails
            details={activeProfile}
            sessions={profileSessions}
            sessionsLoading={profileSessionsLoading}
            timeFormat={timeFormat}
            onLoadMoreSessions={() => {
              if (activeProfileId) {
                loadProfileSessionsData(activeProfileId)
              }
            }}
            canLoadMoreSessions={canLoadMoreProfileSessions}
            currency={project?.revenueCurrency}
          />
        )}
      </>
    )
  }

  // Profiles list view
  return (
    <>
      <DashboardHeader
        showLiveVisitors
        rightContent={<ProjectViewHeaderActions tnMapping={tnMapping} />}
        profileTypeFilter={profileTypeFilter}
        onProfileTypeFilterChange={(type) => {
          setProfileTypeFilter(type)
          setProfilesSkip(0)
        }}
      />
      {profilesLoading && !_isEmpty(profiles) ? <LoadingBar /> : null}
      {!_isEmpty(profiles) ? (
        <Filters className='mb-3' tnMapping={tnMapping} />
      ) : null}
      {(profilesLoading === null || profilesLoading) && _isEmpty(profiles) ? (
        <LoaderView />
      ) : null}
      {typeof profilesLoading === 'boolean' &&
      !profilesLoading &&
      _isEmpty(profiles) ? (
        <NoProfiles filters={filters} />
      ) : null}
      <Profiles profiles={profiles} timeFormat={timeFormat} />
      <InfiniteScrollTrigger
        hasMore={canLoadMoreProfiles}
        isLoading={profilesLoading || profilesLoading === null}
        onLoadMore={() => loadProfiles()}
        disabled={profilesLoading || profilesLoading === null}
        className={profilesLoading && _isEmpty(profiles) ? 'hidden' : ''}
      />
    </>
  )
}

export default ProfilesView
