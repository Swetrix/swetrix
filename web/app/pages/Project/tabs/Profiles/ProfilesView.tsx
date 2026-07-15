import _isEmpty from 'lodash/isEmpty'
import { useState, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import {
  useProfileDetailsQuery,
  useProfileSessionsQuery,
  useProfilesListQuery,
} from '~/hooks/v2/useV2Queries'
import {
  Profile,
  ProfileDetails as ProfileDetailsType,
} from '~/lib/models/Project'
import NoProfiles from '~/pages/Project/tabs/Profiles/components/NoProfiles'
import {
  ProfileDetails,
  type ProfileSession,
} from '~/pages/Project/tabs/Profiles/ProfileDetails'
import { Profiles } from '~/pages/Project/tabs/Profiles/Profiles'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import ProjectViewHeaderActions from '~/pages/Project/View/components/ProjectViewHeaderActions'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import InfiniteScrollTrigger from '~/ui/InfiniteScrollTrigger'
import LoadingBar from '~/ui/LoadingBar'

import Filters from '../../View/components/Filters'
import { LoaderView } from '../../View/components/LoaderView'

interface ProfilesViewProps {
  tnMapping: Record<string, string>
}

const ProfilesView = ({ tnMapping }: ProfilesViewProps) => {
  const { project } = useCurrentProject()
  const { filters, timeFormat } = useViewProjectContext()
  const { t } = useTranslation('common')
  const [searchParams] = useSearchParams()
  const [profileTypeFilter, setProfileTypeFilter] = useState<
    'all' | 'anonymous' | 'identified'
  >('all')

  const activeProfileId = useMemo(() => {
    return searchParams.get('profileId')
  }, [searchParams])

  const profilesQuery = useProfilesListQuery({
    profileType: profileTypeFilter,
    enabled: !activeProfileId,
  })
  const profileDetailsQuery = useProfileDetailsQuery(activeProfileId)
  const profileSessionsQuery = useProfileSessionsQuery(activeProfileId)

  const profiles = useMemo(() => {
    const rows = (profilesQuery.data?.pages || []).flatMap(
      (page) => page.data,
    ) as unknown as Profile[]

    const seen = new Set<string>()
    return rows.filter((profile) => {
      if (seen.has(profile.profileId)) {
        return false
      }
      seen.add(profile.profileId)
      return true
    })
  }, [profilesQuery.data])

  const profileSessions = useMemo(
    () =>
      (profileSessionsQuery.data?.pages || []).flatMap(
        (page) => page.data,
      ) as unknown as ProfileSession[],
    [profileSessionsQuery.data],
  )

  const hasShownContentRef = useRef(false)

  if (profilesQuery.data) {
    hasShownContentRef.current = !_isEmpty(profiles)
  }

  if (activeProfileId) {
    const backSearchParams = (() => {
      const params = new URLSearchParams(searchParams)
      params.delete('profileId')
      return params.toString()
    })()

    const activeProfile =
      (profileDetailsQuery.data?.data as unknown as
        | ProfileDetailsType
        | undefined) || null

    return (
      <div>
        {profileDetailsQuery.isLoading && !activeProfile ? (
          <LoaderView />
        ) : (
          <ProfileDetails
            details={activeProfile}
            sessions={profileSessions}
            sessionsLoading={
              profileSessionsQuery.isLoading ||
              profileSessionsQuery.isFetchingNextPage
            }
            timeFormat={timeFormat}
            onLoadMoreSessions={() => profileSessionsQuery.fetchNextPage()}
            canLoadMoreSessions={Boolean(profileSessionsQuery.hasNextPage)}
            currency={project?.revenueCurrency}
            websiteUrl={project?.websiteUrl}
            backLink={`?${backSearchParams}`}
            backButtonLabel={t('project.backToUsers')}
          />
        )}
      </div>
    )
  }

  const profilesLoading = profilesQuery.isLoading
  const profilesRefetching =
    profilesQuery.isFetching &&
    !profilesQuery.isLoading &&
    !profilesQuery.isFetchingNextPage

  return (
    <>
      <DashboardHeader
        showLiveVisitors
        rightContent={<ProjectViewHeaderActions tnMapping={tnMapping} />}
        profileTypeFilter={profileTypeFilter}
        onProfileTypeFilterChange={setProfileTypeFilter}
      />
      {profilesRefetching && !_isEmpty(profiles) ? <LoadingBar /> : null}
      {!_isEmpty(profiles) ? (
        <Filters className='mb-3' tnMapping={tnMapping} />
      ) : null}
      {profilesLoading && _isEmpty(profiles) ? <LoaderView /> : null}
      {!profilesQuery.isFetching &&
      profilesQuery.data &&
      _isEmpty(profiles) &&
      !hasShownContentRef.current ? (
        <NoProfiles filters={filters} />
      ) : null}
      <Profiles profiles={profiles} timeFormat={timeFormat} />
      <InfiniteScrollTrigger
        hasMore={Boolean(profilesQuery.hasNextPage)}
        isLoading={profilesQuery.isFetchingNextPage}
        onLoadMore={() => profilesQuery.fetchNextPage()}
        disabled={profilesQuery.isFetching}
        className={profilesLoading && _isEmpty(profiles) ? 'hidden' : ''}
      />
    </>
  )
}

export default ProfilesView
