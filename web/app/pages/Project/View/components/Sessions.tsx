import { ChevronRightIcon } from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import _map from 'lodash/map'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ClientOnly } from 'remix-utils/client-only'

import Loader from '~/ui/Loader'
import { getStringFromTime, getTimeFromSeconds } from '~/utils/generic'

import { Session as SessionType } from '../interfaces/session'

import CCRow from './CCRow'

dayjs.extend(duration)

interface SessionsProps {
  sessions: SessionType[]
  onClick: (psid: string) => void
  timeFormat: '12-hour' | '24-hour'
}

interface SessionProps {
  session: SessionType
  onClick: (psid: string) => void
  timeFormat: '12-hour' | '24-hour'
}

const Separator = () => (
  <svg viewBox='0 0 2 2' className='h-0.5 w-0.5 flex-none fill-gray-400'>
    <circle cx={1} cy={1} r={1} />
  </svg>
)

const Session = ({ session, onClick, timeFormat }: SessionProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  const lastActivityTime = dayjs(session.lastActivity)
  const sessionStartTime = dayjs(session.sessionStart)

  let sessionDurationString = ''

  if (!session.isLive) {
    const diffSeconds = lastActivityTime.diff(sessionStartTime, 'seconds')

    sessionDurationString = getStringFromTime(getTimeFromSeconds(diffSeconds))
  }

  const dateLineString = session.isLive
    ? sessionStartTime.toDate().toLocaleDateString(language, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: timeFormat === '12-hour' ? 'h12' : 'h23',
      })
    : `${sessionStartTime.toDate().toLocaleDateString(language, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: timeFormat === '12-hour' ? 'h12' : 'h23',
      })} - ${lastActivityTime.toDate().toLocaleTimeString(language, {
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: timeFormat === '12-hour' ? 'h12' : 'h23',
      })} (${sessionDurationString})`

  const psidUrl = new URL(window.location.href)
  psidUrl.searchParams.set('psid', session.psid)
  const stringifiedUrl = psidUrl.toString()

  const pageviewCount =
    session.pageviews === 1 ? t('dashboard.onePageview') : t('dashboard.xPageviews', { x: session.pageviews })

  return (
    <Link
      onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault()
        e.stopPropagation()
        window.history.pushState({}, '', stringifiedUrl)
        onClick(session.psid)
      }}
      to={stringifiedUrl}
    >
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

export const Sessions: React.FC<SessionsProps> = ({ sessions, onClick, timeFormat }) => {
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
            <Session key={session.psid} session={session} onClick={onClick} timeFormat={timeFormat} />
          ))}
        </ul>
      )}
    </ClientOnly>
  )
}
