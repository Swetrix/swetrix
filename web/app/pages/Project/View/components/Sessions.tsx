import { ChevronRightIcon } from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import _map from 'lodash/map'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ClientOnly } from 'remix-utils/client-only'

import { Session as SessionType } from '~/lib/models/Project'
import Loader from '~/ui/Loader'
import { getStringFromTime, getTimeFromSeconds } from '~/utils/generic'

import CCRow from './CCRow'

dayjs.extend(duration)

interface SessionsProps {
  sessions: SessionType[]
  timeFormat: '12-hour' | '24-hour'
}

interface SessionProps {
  session: SessionType
  timeFormat: '12-hour' | '24-hour'
}

const Separator = () => (
  <svg viewBox='0 0 2 2' className='h-0.5 w-0.5 flex-none fill-gray-400'>
    <circle cx={1} cy={1} r={1} />
  </svg>
)

const Session = ({ session, timeFormat }: SessionProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  const sessionStartTime = dayjs(session.sessionStart)

  let sessionDurationString = ''
  if (!session.isLive) {
    if (session.sdur != null && session.sdur > 0) {
      sessionDurationString = getStringFromTime(getTimeFromSeconds(session.sdur))
    } else {
      const diffSeconds = dayjs(session.lastActivity).diff(sessionStartTime, 'seconds')
      // Only set duration string if it's meaningfully positive
      if (diffSeconds > 0) {
        sessionDurationString = getStringFromTime(getTimeFromSeconds(diffSeconds))
      }
    }
  }

  const dateLineString = useMemo(() => {
    if (session.isLive) {
      return sessionStartTime.toDate().toLocaleDateString(language, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: timeFormat === '12-hour' ? 'h12' : 'h23',
      })
    }

    const startDateTimeStr = sessionStartTime.toDate().toLocaleDateString(language, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: timeFormat === '12-hour' ? 'h12' : 'h23',
    })

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

  const psidUrl = new URL(window.location.href)
  psidUrl.searchParams.set('psid', session.psid)
  const stringifiedUrl = psidUrl.toString()

  const pageviewCount =
    session.pageviews === 1 ? t('dashboard.onePageview') : t('dashboard.xPageviews', { x: session.pageviews })

  return (
    <Link to={stringifiedUrl}>
      <li className='relative mb-4 flex cursor-pointer justify-between gap-x-6 rounded-lg bg-gray-200/60 px-4 py-4 font-mono hover:bg-gray-200 sm:px-6 dark:bg-[#162032] dark:hover:bg-slate-800'>
        <div className='flex min-w-0 gap-x-4'>
          <div className='min-w-0 flex-auto'>
            <p className='flex items-center text-sm leading-6 font-semibold tracking-tighter text-gray-900 dark:text-gray-50'>
              <span>
                {dateLineString}
                {session.isLive ? (
                  <span className='ml-2 inline-flex items-center tracking-normal'>
                    <span className='mr-1.5 h-2 w-2 animate-pulse rounded-full bg-red-500' />
                    <span className='text-xs font-medium text-red-500'>{t('dashboard.live').toUpperCase()}</span>
                  </span>
                ) : null}
              </span>
            </p>
            <p className='mt-1 flex flex-wrap items-center gap-x-2 text-xs leading-5 text-gray-500 dark:text-gray-300'>
              <span className='flex'>
                {session.cc ? <CCRow size={18} cc={session.cc} language={language} /> : t('project.unknownCountry')}
              </span>
              <Separator />
              {session.os}
              <Separator />
              {session.br}
            </p>
            <p className='mt-1 flex text-xs leading-5 text-gray-500 sm:hidden dark:text-gray-300'>{pageviewCount}</p>
          </div>
        </div>
        <div className='flex shrink-0 items-center gap-x-4'>
          <div className='hidden sm:flex sm:flex-col sm:items-end'>
            <p className='text-sm leading-6 text-gray-900 dark:text-gray-50'>{pageviewCount}</p>
          </div>
          <ChevronRightIcon className='h-5 w-5 flex-none text-gray-400' aria-hidden='true' />
        </div>
      </li>
    </Link>
  )
}

export const Sessions: React.FC<SessionsProps> = ({ sessions, timeFormat }) => {
  return (
    <ClientOnly
      fallback={
        <div className='bg-gray-50 dark:bg-slate-900'>
          <Loader />
        </div>
      }
    >
      {() => (
        <ul className='mt-4'>
          {_map(sessions, (session) => (
            <Session key={session.psid} session={session} timeFormat={timeFormat} />
          ))}
        </ul>
      )}
    </ClientOnly>
  )
}
