import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import { DownloadIcon } from 'lucide-react'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { getProfiles, getProfile, getProfileSessions } from '~/api'
import { Profile, ProfileDetails as ProfileDetailsType, Session } from '~/lib/models/Project'
import { ProfileDetails } from '~/pages/Project/tabs/Profiles/ProfileDetails'
import { Profiles, ProfilesFilter } from '~/pages/Project/tabs/Profiles/Profiles'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import NoEvents from '~/pages/Project/View/components/NoEvents'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import { getFormatDate } from '~/pages/Project/View/ViewProject.helpers'
import { useCurrentProject, useProjectPassword } from '~/providers/CurrentProjectProvider'
import Loader from '~/ui/Loader'
import LoadingBar from '~/ui/LoadingBar'

import Filters from '../../View/components/Filters'

const SESSIONS_TAKE = 30

interface ProfilesViewProps {
  tnMapping: Record<string, string>
}

const ProfilesView = ({ tnMapping }: ProfilesViewProps) => {
  const { id, project } = useCurrentProject()
  const projectPassword = useProjectPassword(id)
  const { timezone, period, dateRange, filters, timeFormat, profilesRefreshTrigger } = useViewProjectContext()
  const { t } = useTranslation('common')
  const [searchParams] = useSearchParams()

  // Profiles state
  const [profilesSkip, setProfilesSkip] = useState(0)
  const [canLoadMoreProfiles, setCanLoadMoreProfiles] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [profilesLoading, setProfilesLoading] = useState<boolean | null>(null)
  const [activeProfile, setActiveProfile] = useState<ProfileDetailsType | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSessions, setProfileSessions] = useState<Session[]>([])
  const [profileSessionsLoading, setProfileSessionsLoading] = useState<boolean | null>(null)
  const [profileSessionsSkip, setProfileSessionsSkip] = useState(0)
  const [canLoadMoreProfileSessions, setCanLoadMoreProfileSessions] = useState(false)
  const [profileTypeFilter, setProfileTypeFilter] = useState<'all' | 'anonymous' | 'identified'>('all')

  const activeProfileId = useMemo(() => {
    return searchParams.get('profileId')
  }, [searchParams])

  const prevActiveProfileIdRef = useRef<string | null>(activeProfileId)
  const profilesRequestIdRef = useRef(0)
  const skipNextProfilesAutoLoadRef = useRef(false)
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const loadProfiles = async (forcedSkip?: number, override?: boolean) => {
    if (profilesLoading) {
      return
    }

    const requestId = profilesRequestIdRef.current
    setProfilesLoading(true)

    try {
      const skip = typeof forcedSkip === 'number' ? forcedSkip : profilesSkip
      let dataProfiles: { profiles: Profile[] }
      let from
      let to

      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
      }

      if (period === 'custom' && dateRange) {
        dataProfiles = await getProfiles(
          id,
          '',
          filters,
          from,
          to,
          SESSIONS_TAKE,
          skip,
          timezone,
          profileTypeFilter,
          projectPassword,
        )
      } else {
        dataProfiles = await getProfiles(
          id,
          period,
          filters,
          '',
          '',
          SESSIONS_TAKE,
          skip,
          timezone,
          profileTypeFilter,
          projectPassword,
        )
      }

      if (requestId === profilesRequestIdRef.current && isMountedRef.current) {
        if (override) {
          setProfiles(dataProfiles?.profiles || [])
        } else {
          setProfiles((prev) => [...prev, ...(dataProfiles?.profiles || [])])
        }
        setProfilesSkip((prev) => {
          if (typeof forcedSkip === 'number') {
            return SESSIONS_TAKE + forcedSkip
          }
          return SESSIONS_TAKE + prev
        })

        if (dataProfiles?.profiles?.length < SESSIONS_TAKE) {
          setCanLoadMoreProfiles(false)
        } else {
          setCanLoadMoreProfiles(true)
        }
      }
    } catch (reason) {
      console.error('[ERROR](loadProfiles) Loading profiles data failed:', reason)
    } finally {
      if (requestId === profilesRequestIdRef.current && isMountedRef.current) {
        setProfilesLoading(false)
      }
    }
  }

  const loadProfile = async (profileId: string) => {
    const hasExistingProfileData = !!activeProfile && activeProfile.profileId === profileId

    setProfileLoading(true)
    // Avoid flicker on refresh: keep currently displayed details/sessions while we refetch.
    // Only reset sessions when opening a different profile (or first load).
    if (!hasExistingProfileData) {
      setProfileSessions([])
      setProfileSessionsSkip(0)
      setCanLoadMoreProfileSessions(false)
    }

    try {
      let from
      let to

      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
      }

      const data = await getProfile(
        id,
        profileId,
        period === 'custom' ? '' : period,
        from || '',
        to || '',
        timezone,
        projectPassword,
      )

      if (isMountedRef.current) {
        setActiveProfile(data)
        // Load initial sessions for the profile (override existing on refresh)
        loadProfileSessionsData(profileId, 0, true)
      }
    } catch (reason) {
      console.error('[ERROR](loadProfile) Loading profile data failed:', reason)
      if (isMountedRef.current) {
        setActiveProfile(null)
      }
    } finally {
      if (isMountedRef.current) {
        setProfileLoading(false)
      }
    }
  }

  const loadProfileSessionsData = async (profileId: string, forcedSkip?: number, override?: boolean) => {
    if (profileSessionsLoading) {
      return
    }

    setProfileSessionsLoading(true)

    try {
      const skip = typeof forcedSkip === 'number' ? forcedSkip : profileSessionsSkip
      let dataSessions: { sessions: Session[] }
      let from
      let to

      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
      }

      if (period === 'custom' && dateRange) {
        dataSessions = await getProfileSessions(
          id,
          profileId,
          '',
          filters,
          from,
          to,
          SESSIONS_TAKE,
          skip,
          timezone,
          projectPassword,
        )
      } else {
        dataSessions = await getProfileSessions(
          id,
          profileId,
          period,
          filters,
          '',
          '',
          SESSIONS_TAKE,
          skip,
          timezone,
          projectPassword,
        )
      }

      if (isMountedRef.current) {
        if (override) {
          setProfileSessions(dataSessions?.sessions || [])
        } else {
          setProfileSessions((prev) => [...prev, ...(dataSessions?.sessions || [])])
        }
        setProfileSessionsSkip((prev) => {
          if (typeof forcedSkip === 'number') {
            return SESSIONS_TAKE + forcedSkip
          }
          return SESSIONS_TAKE + prev
        })

        if (dataSessions?.sessions?.length < SESSIONS_TAKE) {
          setCanLoadMoreProfileSessions(false)
        } else {
          setCanLoadMoreProfileSessions(true)
        }
      }
    } catch (reason) {
      console.error('[ERROR](loadProfileSessions) Loading profile sessions failed:', reason)
    } finally {
      if (isMountedRef.current) {
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
  }, [dateRange, filters, id, period, projectPassword, timezone, project, activeProfileId, profileTypeFilter])

  // Load single profile when profileId is set
  useEffect(() => {
    if (!activeProfileId || !project) {
      return
    }

    loadProfile(activeProfileId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfileId, project])

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
        loadProfile(activeProfileId)
      } else {
        setProfilesSkip(0)
        loadProfiles(0, true)
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
          <Loader />
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
      <DashboardHeader showLiveVisitors />
      {profilesLoading && !_isEmpty(profiles) ? <LoadingBar /> : null}
      {!_isEmpty(profiles) ? <Filters className='mb-3' tnMapping={tnMapping} /> : null}
      <ProfilesFilter
        profileType={profileTypeFilter}
        onProfileTypeChange={(type) => {
          setProfileTypeFilter(type)
          setProfilesSkip(0)
        }}
      />
      {(profilesLoading === null || profilesLoading) && _isEmpty(profiles) ? <Loader /> : null}
      {typeof profilesLoading === 'boolean' && !profilesLoading && _isEmpty(profiles) ? (
        <NoEvents filters={filters} />
      ) : null}
      <Profiles profiles={profiles} timeFormat={timeFormat} />
      {canLoadMoreProfiles ? (
        <button
          type='button'
          title={t('project.loadMore')}
          onClick={() => loadProfiles()}
          className={cx(
            'relative mx-auto mt-2 flex items-center rounded-md border border-transparent p-2 text-sm font-medium text-gray-700 ring-inset hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200',
            {
              'cursor-not-allowed opacity-50': profilesLoading || profilesLoading === null,
              hidden: profilesLoading && _isEmpty(profiles),
            },
          )}
        >
          <DownloadIcon className='mr-2 h-5 w-5' strokeWidth={1.5} />
          {t('project.loadMore')}
        </button>
      ) : null}
    </>
  )
}

export default ProfilesView
