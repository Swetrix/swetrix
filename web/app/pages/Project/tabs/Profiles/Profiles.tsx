import cx from 'clsx'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import _map from 'lodash/map'
import {
  WarningIcon,
  FileTextIcon,
  CursorClickIcon,
  UserListIcon,
  CaretRightIcon,
} from '@phosphor-icons/react'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '~/ui/Link'
import { useLocation } from 'react-router'
import { ClientOnly } from 'remix-utils/client-only'

import { BrowserIcon, OSIcon } from '../SharedIcons'
import { Profile as ProfileType } from '~/lib/models/Project'
import { useTheme } from '~/providers/ThemeProvider'
import { Badge } from '~/ui/Badge'
import Flag from '~/ui/Flag'
import Loader from '~/ui/Loader'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import countries from '~/utils/isoCountries'
import { getProfileDisplayName, ProfileAvatar } from '~/utils/profileAvatars'

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

const ProfileRow = ({ profile, timeFormat }: ProfileRowProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const location = useLocation()
  const { theme } = useTheme()

  const displayName = useMemo(() => {
    return getProfileDisplayName(profile.profileId, profile.isIdentified)
  }, [profile.profileId, profile.isIdentified])

  const lastSeenText = useMemo(() => {
    return dayjs(profile.lastSeen)
      .toDate()
      .toLocaleDateString(language, {
        month: 'short',
        day: 'numeric',
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
    <li className='mb-2'>
      <Link
        to={{ search: params.toString() }}
        className='block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-300'
      >
        <div className='relative flex cursor-pointer items-center justify-between gap-x-4 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 transition-colors hover:bg-gray-200/70 sm:px-5 dark:border-slate-800/60 dark:bg-slate-900/25 dark:hover:bg-slate-900/60'>
          <div className='flex min-w-0 flex-1 items-center gap-x-3.5'>
            <div className='relative shrink-0'>
              <ProfileAvatar profileId={profile.profileId} size={32} />
              {onlineStatus !== 'offline' && (
                <Tooltip
                  text={t('project.lastSeenAgo', { time: lastSeenAgo })}
                  className='absolute -right-0.5 -bottom-0.5'
                  tooltipNode={
                    <span
                      className={cx(
                        'block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900',
                        onlineStatus === 'online'
                          ? 'bg-emerald-500'
                          : 'bg-amber-500',
                      )}
                    />
                  }
                />
              )}
            </div>

            <div className='flex min-w-0 flex-1 flex-col justify-center gap-2'>
              <div className='flex flex-wrap items-start justify-between gap-2 sm:gap-4'>
                <div className='flex min-w-0 items-center gap-2'>
                  <Text size='sm' weight='semibold' truncate>
                    {displayName}
                  </Text>
                  {Boolean(profile.isIdentified) && (
                    <Badge
                      label={t('project.identified')}
                      colour='indigo'
                      className='text-[0.625rem] leading-3'
                    />
                  )}
                </div>

                {/* Mobile Date */}
                <div className='mt-0.5 flex shrink-0 items-center sm:hidden'>
                  <Text size='xs' colour='secondary' className='text-[11px]'>
                    {lastSeenText}
                  </Text>
                </div>
              </div>

              <div className='flex items-center justify-between gap-4'>
                <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
                  <div className='flex items-center gap-1.5'>
                    <Tooltip
                      text={
                        profile.cc
                          ? countries.getName(profile.cc, language) ||
                            profile.cc
                          : t('project.unknownCountry')
                      }
                      tooltipNode={
                        <div className='flex h-[22px] w-[22px] items-center justify-center rounded bg-gray-100/80 ring-1 ring-gray-200/50 dark:bg-slate-800/80 dark:ring-slate-700/50'>
                          <Flag
                            country={profile.cc}
                            size={14}
                            className='rounded-[2px]'
                            aria-hidden='true'
                          />
                        </div>
                      }
                    />
                    <Tooltip
                      text={profile.os || t('project.unknown')}
                      tooltipNode={
                        <div className='flex h-[22px] w-[22px] items-center justify-center rounded bg-gray-100/80 ring-1 ring-gray-200/50 dark:bg-slate-800/80 dark:ring-slate-700/50'>
                          <OSIcon
                            os={profile.os}
                            theme={theme}
                            className='size-3.5'
                          />
                        </div>
                      }
                    />
                    <Tooltip
                      text={profile.br || t('project.unknown')}
                      tooltipNode={
                        <div className='flex h-[22px] w-[22px] items-center justify-center rounded bg-gray-100/80 ring-1 ring-gray-200/50 dark:bg-slate-800/80 dark:ring-slate-700/50'>
                          <BrowserIcon
                            browser={profile.br}
                            className='size-3.5'
                          />
                        </div>
                      }
                    />
                  </div>

                  <div className='h-3 w-px bg-gray-200 dark:bg-slate-700' />

                  <div className='flex items-center gap-3'>
                    <Tooltip
                      text={t('project.sessions')}
                      tooltipNode={
                        <Text
                          as='span'
                          size='xs'
                          colour='secondary'
                          weight='medium'
                          className='flex items-center gap-1'
                        >
                          <UserListIcon className='size-3.5' />
                          {profile.sessionsCount}
                        </Text>
                      }
                    />

                    <Tooltip
                      text={t('dashboard.pageviews')}
                      tooltipNode={
                        <Text
                          as='span'
                          size='xs'
                          colour='secondary'
                          weight='medium'
                          className='flex items-center gap-1'
                        >
                          <FileTextIcon className='size-3.5' />
                          {profile.pageviewsCount}
                        </Text>
                      }
                    />

                    {profile.eventsCount > 0 && (
                      <Tooltip
                        text={t('dashboard.events')}
                        tooltipNode={
                          <Text
                            as='span'
                            size='xs'
                            colour='secondary'
                            weight='medium'
                            className='flex items-center gap-1'
                          >
                            <CursorClickIcon className='size-3.5' />
                            {profile.eventsCount}
                          </Text>
                        }
                      />
                    )}

                    {profile.errorsCount > 0 && (
                      <Tooltip
                        text={t('dashboard.errors')}
                        tooltipNode={
                          <Text
                            as='span'
                            size='xs'
                            colour='error'
                            weight='medium'
                            className='flex items-center gap-1'
                          >
                            <WarningIcon className='size-3.5' />
                            {profile.errorsCount}
                          </Text>
                        }
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className='hidden shrink-0 items-center gap-x-3 sm:flex'>
            <div className='flex flex-col items-end'>
              <Text as='p' size='xs' colour='secondary' className='text-[11px]'>
                {lastSeenText}
              </Text>
            </div>
            <CaretRightIcon
              className='size-4 text-gray-400'
              aria-hidden='true'
            />
          </div>
          <div className='flex shrink-0 items-center sm:hidden'>
            <CaretRightIcon
              className='size-4 text-gray-400'
              aria-hidden='true'
            />
          </div>
        </div>
      </Link>
    </li>
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
