import cx from 'clsx'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import _map from 'lodash/map'
import {
  WarningIcon,
  FileTextIcon,
  CursorClickIcon,
  UserListIcon,
  CalendarDotsIcon,
  CaretRightIcon,
} from '@phosphor-icons/react'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { ClientOnly } from 'remix-utils/client-only'

import { Profile as ProfileType } from '~/lib/models/Project'
import { Badge } from '~/ui/Badge'
import Loader from '~/ui/Loader'
import Tooltip from '~/ui/Tooltip'
import { getProfileDisplayName, ProfileAvatar } from '~/utils/profileAvatars'

import CCRow from '../../View/components/CCRow'

dayjs.extend(relativeTime)

const ONLINE_THRESHOLD_MINUTES = 5
const RECENTLY_ACTIVE_THRESHOLD_MINUTES = 30

type OnlineStatus = 'online' | 'recently_active' | 'offline'

const getOnlineStatus = (lastSeen: string): OnlineStatus => {
  const now = dayjs()
  const lastSeenTime = dayjs(lastSeen)
  const minutesAgo = now.diff(lastSeenTime, 'minute')

  if (minutesAgo < ONLINE_THRESHOLD_MINUTES) {
    return 'online'
  }

  if (minutesAgo < RECENTLY_ACTIVE_THRESHOLD_MINUTES) {
    return 'recently_active'
  }

  return 'offline'
}

interface UsersProps {
  profiles: ProfileType[]
  timeFormat: '12-hour' | '24-hour'
}

interface ProfileRowProps {
  profile: ProfileType
  timeFormat: '12-hour' | '24-hour'
}

const Separator = () => (
  <svg viewBox='0 0 2 2' className='h-0.5 w-0.5 flex-none fill-gray-400'>
    <circle cx={1} cy={1} r={1} />
  </svg>
)

const ProfileRow = ({ profile, timeFormat }: ProfileRowProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const location = useLocation()

  const displayName = useMemo(() => {
    return getProfileDisplayName(profile.profileId, profile.isIdentified)
  }, [profile.profileId, profile.isIdentified])

  const lastSeenText = useMemo(() => {
    return dayjs(profile.lastSeen)
      .toDate()
      .toLocaleDateString(language, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: timeFormat === '12-hour' ? 'h12' : 'h23',
      })
  }, [profile.lastSeen, language, timeFormat])

  const onlineStatus = useMemo(
    () => getOnlineStatus(profile.lastSeen),
    [profile.lastSeen],
  )

  const lastSeenAgo = useMemo(
    () => dayjs(profile.lastSeen).fromNow(),
    [profile.lastSeen],
  )

  const params = new URLSearchParams(location.search)
  params.set('profileId', profile.profileId)

  return (
    <Link to={{ search: params.toString() }}>
      <li className='relative mb-3 flex cursor-pointer justify-between gap-x-6 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 transition-colors hover:bg-gray-200/70 sm:px-6 dark:border-slate-800/60 dark:bg-slate-900/25 dark:hover:bg-slate-900/60'>
        <div className='flex min-w-0 gap-x-3'>
          <div className='relative shrink-0'>
            <ProfileAvatar
              className='mt-1'
              profileId={profile.profileId}
              size={40}
            />
            {onlineStatus === 'offline' ? null : (
              <Tooltip
                text={t('project.lastSeenAgo', { time: lastSeenAgo })}
                className='absolute right-0 bottom-2'
                tooltipNode={
                  <span
                    className={cx(
                      'block h-3 w-3 rounded-full ring-2 ring-gray-50 dark:ring-slate-800',
                      onlineStatus === 'online' && 'bg-green-500',
                      onlineStatus === 'recently_active' && 'bg-yellow-500',
                    )}
                  />
                }
              />
            )}
          </div>

          <div className='min-w-0 flex-auto'>
            <p className='flex items-center text-sm leading-6 font-semibold text-gray-900 dark:text-gray-50'>
              <span className='truncate'>{displayName}</span>
              {profile.isIdentified ? (
                <Badge
                  label={t('project.identified')}
                  colour='indigo'
                  className='ml-2'
                />
              ) : null}
            </p>
            <p className='mt-1 flex flex-wrap items-center gap-x-2 text-xs leading-5 text-gray-500 dark:text-gray-300'>
              <span className='flex items-center'>
                {profile.cc ? (
                  <CCRow size={18} cc={profile.cc} language={language} />
                ) : (
                  t('project.unknownCountry')
                )}
              </span>
              <Separator />
              {profile.os || t('project.unknown')}
              <Separator />
              {profile.br || t('project.unknown')}
            </p>
            <p className='mt-2 flex text-xs leading-5 text-gray-500 sm:hidden dark:text-gray-300'>
              <span
                className='mr-2 flex items-center'
                title={t('project.sessions')}
              >
                <UserListIcon className='mr-1 size-4' /> {profile.sessionsCount}
              </span>
              <span
                className='mr-2 flex items-center'
                title={t('dashboard.pageviews')}
              >
                <FileTextIcon className='mr-1 size-4' />{' '}
                {profile.pageviewsCount}
              </span>
              {profile.eventsCount > 0 ? (
                <span
                  className='mr-2 flex items-center'
                  title={t('dashboard.events')}
                >
                  <CursorClickIcon className='mr-1 size-4' />{' '}
                  {profile.eventsCount}
                </span>
              ) : null}
              {profile.errorsCount > 0 ? (
                <span
                  className='flex items-center text-red-400'
                  title={t('dashboard.errors')}
                >
                  <WarningIcon className='mr-1 size-4' /> {profile.errorsCount}
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <div className='flex shrink-0 items-center gap-x-4'>
          <div className='hidden sm:flex sm:flex-col sm:items-end'>
            <div className='flex items-center gap-x-3 text-sm leading-6 text-gray-900 dark:text-gray-50'>
              <span
                className='flex items-center'
                title={t('project.xSessions', { x: profile.sessionsCount })}
              >
                <UserListIcon className='mr-1 size-5' /> {profile.sessionsCount}
              </span>
              <span
                className='flex items-center'
                title={t('dashboard.xPageviews', { x: profile.pageviewsCount })}
              >
                <FileTextIcon className='mr-1 size-5' />{' '}
                {profile.pageviewsCount}
              </span>
              {profile.eventsCount > 0 ? (
                <span
                  className='flex items-center'
                  title={t('dashboard.xCustomEvents', {
                    x: profile.eventsCount,
                  })}
                >
                  <CursorClickIcon className='mr-1 size-5' />{' '}
                  {profile.eventsCount}
                </span>
              ) : null}
              {profile.errorsCount > 0 ? (
                <span
                  className='flex items-center text-red-500'
                  title={t('dashboard.xErrors', { x: profile.errorsCount })}
                >
                  <WarningIcon className='mr-1 size-5' /> {profile.errorsCount}
                </span>
              ) : null}
            </div>
            <p className='mt-1 flex items-center text-xs leading-5 text-gray-500 dark:text-gray-400'>
              <CalendarDotsIcon className='mr-1 size-3' />
              {lastSeenText}
            </p>
          </div>
          <CaretRightIcon
            className='h-5 w-5 flex-none text-gray-400'
            aria-hidden='true'
          />
        </div>
      </li>
    </Link>
  )
}

export const Profiles: React.FC<UsersProps> = ({ profiles, timeFormat }) => {
  return (
    <ClientOnly
      fallback={
        <div className='bg-gray-50 dark:bg-slate-950'>
          <Loader />
        </div>
      }
    >
      {() => (
        <ul>
          {_map(profiles, (profile) => (
            <ProfileRow
              key={profile.profileId}
              profile={profile}
              timeFormat={timeFormat}
            />
          ))}
        </ul>
      )}
    </ClientOnly>
  )
}
