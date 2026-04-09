import cx from 'clsx'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import _map from 'lodash/map'
import {
  FileTextIcon,
  WarningIcon,
  CursorClickIcon,
  CaretRightIcon,
  GlobeIcon,
} from '@phosphor-icons/react'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { ClientOnly } from 'remix-utils/client-only'

import {
  BROWSER_LOGO_MAP,
  OS_LOGO_MAP,
  OS_LOGO_MAP_DARK,
} from '~/lib/constants'
import { Session as SessionType } from '~/lib/models/Project'
import { useTheme } from '~/providers/ThemeProvider'
import { Badge } from '~/ui/Badge'
import Flag from '~/ui/Flag'
import Loader from '~/ui/Loader'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { getStringFromTime, getTimeFromSeconds } from '~/utils/generic'
import countries from '~/utils/isoCountries'
import { getProfileDisplayName, ProfileAvatar } from '~/utils/profileAvatars'

dayjs.extend(duration)
dayjs.extend(relativeTime)

const ONLINE_THRESHOLD_MINUTES = 5
const RECENTLY_ACTIVE_THRESHOLD_MINUTES = 30

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'A$',
}

const getCurrencySymbol = (currency?: string) => {
  return CURRENCY_SYMBOLS[currency || 'USD'] || CURRENCY_SYMBOLS.USD
}

type OnlineStatus = 'online' | 'recently_active' | 'offline'

const getOnlineStatus = (lastActivity: string): OnlineStatus => {
  const now = dayjs()
  const lastActivityTime = dayjs(lastActivity)
  const minutesAgo = now.diff(lastActivityTime, 'minute')

  if (minutesAgo < ONLINE_THRESHOLD_MINUTES) {
    return 'online'
  }

  if (minutesAgo < RECENTLY_ACTIVE_THRESHOLD_MINUTES) {
    return 'recently_active'
  }

  return 'offline'
}

interface SessionsProps {
  sessions: SessionType[]
  timeFormat: '12-hour' | '24-hour'
  hideNewReturnBadge?: boolean
  hideUserDetails?: boolean
  currency?: string
}

interface SessionProps {
  session: SessionType
  timeFormat: '12-hour' | '24-hour'
  hideNewReturnBadge?: boolean
  hideUserDetails?: boolean
  currency?: string
}

const BrowserIcon = ({
  browser,
  className,
}: {
  browser: string | null
  className?: string
}) => {
  if (!browser)
    return (
      <GlobeIcon
        className={className || 'size-3.5 text-gray-400'}
        weight='duotone'
      />
    )
  const logoUrl = BROWSER_LOGO_MAP[browser as keyof typeof BROWSER_LOGO_MAP]
  if (!logoUrl)
    return (
      <GlobeIcon
        className={className || 'size-3.5 text-gray-400'}
        weight='duotone'
      />
    )
  return <img src={logoUrl} className={className || 'size-3.5'} alt={browser} />
}

const OSIcon = ({
  os,
  theme,
  className,
}: {
  os: string | null
  theme: string
  className?: string
}) => {
  if (!os)
    return (
      <GlobeIcon
        className={className || 'size-3.5 text-gray-400'}
        weight='duotone'
      />
    )
  const logoUrlLight = OS_LOGO_MAP[os as keyof typeof OS_LOGO_MAP]
  const logoUrlDark = OS_LOGO_MAP_DARK[os as keyof typeof OS_LOGO_MAP_DARK]
  let logoUrl = theme === 'dark' ? logoUrlDark : logoUrlLight
  logoUrl ||= logoUrlLight
  if (!logoUrl)
    return (
      <GlobeIcon
        className={className || 'size-3.5 text-gray-400'}
        weight='duotone'
      />
    )
  return <img src={logoUrl} className={className || 'size-3.5'} alt={os} />
}

export const Session = ({
  session,
  timeFormat,
  hideNewReturnBadge,
  hideUserDetails,
  currency,
}: SessionProps) => {
  const currencySymbol = getCurrencySymbol(currency)
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const location = useLocation()
  const { theme } = useTheme()

  const sessionStartTime = dayjs(session.sessionStart)

  let sessionDurationString = ''
  if (!session.isLive) {
    if (session.sdur != null && session.sdur > 0) {
      sessionDurationString = getStringFromTime(
        getTimeFromSeconds(session.sdur),
      )
    } else {
      const diffSeconds = dayjs(session.lastActivity).diff(
        sessionStartTime,
        'seconds',
      )
      if (diffSeconds > 0) {
        sessionDurationString = getStringFromTime(
          getTimeFromSeconds(diffSeconds),
        )
      }
    }
  }

  const displayName = useMemo(() => {
    if (!session.profileId) {
      return t('project.unknownUser')
    }
    return getProfileDisplayName(
      session.profileId,
      Boolean(session.isIdentified),
    )
  }, [session.profileId, session.isIdentified, t])

  const dateLineString = useMemo(() => {
    const startDateTimeStr = sessionStartTime
      .toDate()
      .toLocaleDateString(language, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: timeFormat === '12-hour' ? 'h12' : 'h23',
      })

    if (session.isLive) {
      return (
        <span className='flex items-center font-medium text-red-500'>
          <span className='mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-red-500' />
          {t('dashboard.live')}
        </span>
      )
    }

    const durationDisplay = sessionDurationString
      ? ` • ${sessionDurationString}`
      : ''
    return (
      <span className='flex items-center'>
        {startDateTimeStr}
        {durationDisplay}
      </span>
    )
  }, [
    session,
    language,
    timeFormat,
    sessionDurationString,
    sessionStartTime,
    t,
  ])

  const onlineStatus = useMemo(
    () => getOnlineStatus(session.lastActivity),
    [session.lastActivity],
  )

  const lastActivityAgo = useMemo(
    () => dayjs(session.lastActivity).fromNow(),
    [session.lastActivity],
  )

  const params = new URLSearchParams(location.search)
  params.set('psid', session.psid)
  params.set('tab', 'sessions')

  return (
    <li className='mb-2'>
      <Link
        to={{ search: params.toString() }}
        className='block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-300'
      >
        <div className='relative flex cursor-pointer items-center justify-between gap-x-4 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 transition-colors hover:bg-gray-200/70 sm:px-5 dark:border-slate-800/60 dark:bg-slate-900/25 dark:hover:bg-slate-900/60'>
          <div className='flex min-w-0 flex-1 items-center gap-x-3.5'>
            {!hideUserDetails && (
              <div className='relative shrink-0'>
                {session.profileId ? (
                  <ProfileAvatar profileId={session.profileId} size={32} />
                ) : (
                  <div className='flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 ring-1 ring-gray-200/50 dark:bg-slate-800 dark:ring-slate-700/50'>
                    <Text size='xs' weight='medium' colour='secondary'>
                      ?
                    </Text>
                  </div>
                )}
                {onlineStatus !== 'offline' && (
                  <Tooltip
                    text={t('project.lastSeenAgo', { time: lastActivityAgo })}
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
            )}

            <div className='flex min-w-0 flex-1 flex-col justify-center gap-2'>
              <div className='flex flex-wrap items-start justify-between gap-2 sm:gap-4'>
                {!hideUserDetails ? (
                  <div className='flex min-w-0 items-center gap-2'>
                    <Text size='sm' weight='semibold' truncate>
                      {displayName}
                    </Text>
                    {Boolean(session.isIdentified) && (
                      <Badge
                        label={t('project.identified')}
                        colour='indigo'
                        className='text-[0.625rem] leading-3'
                      />
                    )}
                    {!hideNewReturnBadge && (
                      <Badge
                        label={
                          session.isFirstSession
                            ? t('project.sessionNew')
                            : t('project.sessionReturn')
                        }
                        colour={session.isFirstSession ? 'green' : 'slate'}
                        className='text-[0.625rem] leading-3'
                      />
                    )}
                  </div>
                ) : (
                  <div className='flex-1' />
                )}

                {/* Mobile Date */}
                <div className='mt-0.5 flex shrink-0 items-center sm:hidden'>
                  <Text size='xs' colour='secondary' className='text-[11px]'>
                    {dateLineString}
                  </Text>
                </div>
              </div>

              <div className='flex items-center justify-between gap-4'>
                <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
                  <div className='flex items-center gap-1.5'>
                    <Tooltip
                      text={
                        session.cc
                          ? countries.getName(session.cc, language) ||
                            session.cc
                          : t('project.unknownCountry')
                      }
                      tooltipNode={
                        <div className='flex h-[22px] w-[22px] items-center justify-center rounded bg-gray-100/80 ring-1 ring-gray-200/50 dark:bg-slate-800/80 dark:ring-slate-700/50'>
                          <Flag
                            country={session.cc}
                            size={14}
                            className='rounded-[2px]'
                            aria-hidden='true'
                          />
                        </div>
                      }
                    />
                    <Tooltip
                      text={session.os || t('project.unknown')}
                      tooltipNode={
                        <div className='flex h-[22px] w-[22px] items-center justify-center rounded bg-gray-100/80 ring-1 ring-gray-200/50 dark:bg-slate-800/80 dark:ring-slate-700/50'>
                          <OSIcon
                            os={session.os}
                            theme={theme}
                            className='size-3.5'
                          />
                        </div>
                      }
                    />
                    <Tooltip
                      text={session.br || t('project.unknown')}
                      tooltipNode={
                        <div className='flex h-[22px] w-[22px] items-center justify-center rounded bg-gray-100/80 ring-1 ring-gray-200/50 dark:bg-slate-800/80 dark:ring-slate-700/50'>
                          <BrowserIcon
                            browser={session.br}
                            className='size-3.5'
                          />
                        </div>
                      }
                    />
                  </div>

                  <div className='h-3 w-px bg-gray-200 dark:bg-slate-700' />

                  <div className='flex items-center gap-3'>
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
                          {session.pageviews}
                        </Text>
                      }
                    />

                    {session.customEvents > 0 && (
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
                            {session.customEvents}
                          </Text>
                        }
                      />
                    )}

                    {session.revenue != null && session.revenue !== 0 && (
                      <Tooltip
                        text={t('dashboard.revenue')}
                        tooltipNode={
                          <Text
                            as='span'
                            size='xs'
                            weight='medium'
                            colour='inherit'
                            className={cx('flex items-center gap-1', {
                              'text-emerald-600 dark:text-emerald-500':
                                session.revenue > 0,
                              'text-amber-600 dark:text-amber-500':
                                session.revenue < 0,
                            })}
                          >
                            {session.revenue < 0 ? '-' : ''}
                            {currencySymbol}
                            {Math.abs(session.revenue).toFixed(2)}
                          </Text>
                        }
                      />
                    )}

                    {session.errors > 0 && (
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
                            {session.errors}
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
                {dateLineString}
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

export const Sessions: React.FC<SessionsProps> = ({
  sessions,
  timeFormat,
  hideNewReturnBadge,
  hideUserDetails,
  currency,
}) => {
  return (
    <ClientOnly
      fallback={
        <div className='bg-gray-50 dark:bg-slate-950'>
          <Loader />
        </div>
      }
    >
      {() => (
        <ul className='flex flex-col'>
          {_map(sessions, (session) => (
            <Session
              key={session.psid}
              session={session}
              timeFormat={timeFormat}
              hideNewReturnBadge={hideNewReturnBadge}
              hideUserDetails={hideUserDetails}
              currency={currency}
            />
          ))}
        </ul>
      )}
    </ClientOnly>
  )
}
