import { ChevronRightIcon } from '@heroicons/react/24/outline'
import cx from 'clsx'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import _map from 'lodash/map'
import { FileTextIcon, BugIcon, MousePointerClickIcon, CalendarIcon } from 'lucide-react'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { ClientOnly } from 'remix-utils/client-only'

import { Session as SessionType } from '~/lib/models/Project'
import { Badge } from '~/ui/Badge'
import Loader from '~/ui/Loader'
import Tooltip from '~/ui/Tooltip'
import { getStringFromTime, getTimeFromSeconds } from '~/utils/generic'
import { getProfileDisplayName, ProfileAvatar } from '~/utils/profileAvatars'

import CCRow from '../../View/components/CCRow'

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

const Separator = () => (
  <svg viewBox='0 0 2 2' className='h-0.5 w-0.5 flex-none fill-gray-400'>
    <circle cx={1} cy={1} r={1} />
  </svg>
)

const Session = ({ session, timeFormat, hideNewReturnBadge, hideUserDetails, currency }: SessionProps) => {
  const currencySymbol = getCurrencySymbol(currency)
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const location = useLocation()

  const sessionStartTime = dayjs(session.sessionStart)

  let sessionDurationString = ''
  if (!session.isLive) {
    if (session.sdur != null && session.sdur > 0) {
      sessionDurationString = getStringFromTime(getTimeFromSeconds(session.sdur))
    } else {
      const diffSeconds = dayjs(session.lastActivity).diff(sessionStartTime, 'seconds')
      if (diffSeconds > 0) {
        sessionDurationString = getStringFromTime(getTimeFromSeconds(diffSeconds))
      }
    }
  }

  const displayName = useMemo(() => {
    if (!session.profileId) {
      return t('project.unknownUser')
    }
    return getProfileDisplayName(session.profileId, Boolean(session.isIdentified))
  }, [session.profileId, session.isIdentified, t])

  const dateLineString = useMemo(() => {
    const startDateTimeStr = sessionStartTime.toDate().toLocaleDateString(language, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: timeFormat === '12-hour' ? 'h12' : 'h23',
    })

    if (session.isLive) {
      return startDateTimeStr
    }

    let endDisplayTime
    if (session.sdur != null && session.sdur > 0) {
      endDisplayTime = sessionStartTime.add(session.sdur, 'seconds')
    } else {
      endDisplayTime = dayjs(session.lastActivity)
    }

    const endTimeStr = endDisplayTime.toDate().toLocaleTimeString(language, {
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: timeFormat === '12-hour' ? 'h12' : 'h23',
    })

    const durationDisplay = sessionDurationString ? ` (${sessionDurationString})` : ''
    return `${startDateTimeStr} - ${endTimeStr}${durationDisplay}`
  }, [session, language, timeFormat, sessionDurationString, sessionStartTime])

  const onlineStatus = useMemo(() => getOnlineStatus(session.lastActivity), [session.lastActivity])

  const lastActivityAgo = useMemo(() => dayjs(session.lastActivity).fromNow(), [session.lastActivity])

  const params = new URLSearchParams(location.search)
  params.set('psid', session.psid)
  params.set('tab', 'sessions')

  return (
    <Link to={{ search: params.toString() }}>
      <li className='relative mb-3 flex cursor-pointer justify-between gap-x-6 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 transition-colors hover:bg-gray-200/70 sm:px-6 dark:border-slate-800/25 dark:bg-slate-800/70 dark:hover:bg-slate-700/60'>
        <div className='flex min-w-0 gap-x-3'>
          {hideUserDetails ? null : (
            <div className='relative shrink-0'>
              {session.profileId ? (
                <ProfileAvatar className='mt-1' profileId={session.profileId} size={40} />
              ) : (
                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-slate-600'>
                  <span className='text-sm font-medium text-gray-500 dark:text-gray-300'>?</span>
                </div>
              )}
              {onlineStatus === 'offline' ? null : (
                <Tooltip
                  text={t('project.lastSeenAgo', { time: lastActivityAgo })}
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
          )}

          <div className='min-w-0 flex-auto'>
            {hideUserDetails ? null : (
              <p className='flex items-center text-sm leading-6 font-semibold text-gray-900 dark:text-gray-50'>
                <span className='truncate'>{displayName}</span>
                {session.isIdentified ? (
                  <Badge label={t('project.identified')} colour='indigo' className='ml-2' />
                ) : null}
                {hideNewReturnBadge ? null : (
                  <Badge
                    label={session.isFirstSession ? t('project.sessionNew') : t('project.sessionReturn')}
                    colour={session.isFirstSession ? 'green' : 'slate'}
                    className='ml-2'
                  />
                )}
              </p>
            )}
            <p className='mt-1 flex flex-wrap items-center gap-x-2 text-xs leading-5 text-gray-500 dark:text-gray-300'>
              <span className='flex items-center'>
                {session.cc ? <CCRow size={18} cc={session.cc} language={language} /> : t('project.unknownCountry')}
              </span>
              <Separator />
              {session.os || t('project.unknown')}
              <Separator />
              {session.br || t('project.unknown')}
            </p>
            <p className='mt-2 flex text-xs leading-5 text-gray-500 sm:hidden dark:text-gray-300'>
              <span className='mr-2 flex items-center' title={t('dashboard.pageviews')}>
                <FileTextIcon className='mr-1 size-4' strokeWidth={1.5} /> {session.pageviews}
              </span>
              {session.revenue != null && session.revenue !== 0 ? (
                <span
                  className={cx('mr-2 flex items-center', {
                    'text-amber-600 dark:text-amber-500': session.revenue > 0,
                    'text-orange-600 dark:text-orange-500': session.revenue < 0,
                  })}
                  title={t('dashboard.revenue')}
                >
                  {session.revenue < 0 ? '-' : ''}
                  {currencySymbol}
                  {Math.abs(session.revenue).toFixed(2)}
                </span>
              ) : null}
              {session.customEvents > 0 ? (
                <span className='mr-2 flex items-center' title={t('dashboard.events')}>
                  <MousePointerClickIcon className='mr-1 size-4' strokeWidth={1.5} /> {session.customEvents}
                </span>
              ) : null}
              {session.errors > 0 ? (
                <span className='flex items-center text-red-400' title={t('dashboard.errors')}>
                  <BugIcon className='mr-1 size-4' strokeWidth={1.5} /> {session.errors}
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <div className='flex shrink-0 items-center gap-x-4'>
          <div className='hidden sm:flex sm:flex-col sm:items-end'>
            <div className='flex items-center gap-x-3 text-sm leading-6 text-gray-900 dark:text-gray-50'>
              <span className='flex items-center' title={t('dashboard.xPageviews', { x: session.pageviews })}>
                <FileTextIcon className='mr-1 size-5' strokeWidth={1.5} /> {session.pageviews}
              </span>
              {session.revenue != null && session.revenue !== 0 ? (
                <span
                  className={cx('flex items-center', {
                    'text-amber-600 dark:text-amber-500': session.revenue > 0,
                    'text-orange-600 dark:text-orange-500': session.revenue < 0,
                  })}
                  title={`${session.revenue < 0 ? '-' : ''}${currencySymbol}${Math.abs(session.revenue).toFixed(2)}`}
                >
                  {session.revenue < 0 ? '-' : ''}
                  {currencySymbol}
                  {Math.abs(session.revenue).toFixed(2)}
                </span>
              ) : null}
              {session.customEvents > 0 ? (
                <span className='flex items-center' title={t('dashboard.xCustomEvents', { x: session.customEvents })}>
                  <MousePointerClickIcon className='mr-1 size-5' strokeWidth={1.5} /> {session.customEvents}
                </span>
              ) : null}
              {session.errors > 0 ? (
                <span className='flex items-center text-red-500' title={t('dashboard.xErrors', { x: session.errors })}>
                  <BugIcon className='mr-1 size-5' strokeWidth={1.5} /> {session.errors}
                </span>
              ) : null}
            </div>
            <p className='mt-1 flex items-center text-xs leading-5 text-gray-500 dark:text-gray-400'>
              <CalendarIcon className='mr-1 size-3' strokeWidth={1.5} />
              {dateLineString}
            </p>
          </div>
          <ChevronRightIcon className='h-5 w-5 flex-none text-gray-400' aria-hidden='true' />
        </div>
      </li>
    </Link>
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
        <div className='bg-gray-50 dark:bg-slate-900'>
          <Loader />
        </div>
      }
    >
      {() => (
        <ul>
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
