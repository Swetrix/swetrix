import React from 'react'
import { Link } from '@remix-run/react'
import { ClientOnly } from 'remix-utils'
import { useTranslation } from 'react-i18next'
import _map from 'lodash/map'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import Loader from 'ui/Loader'
import { ISession } from '../interfaces/session'
import CCRow from './CCRow'

interface ISessions {
  sessions: ISession[]
  onClick: (psid: string) => void
}

interface ISessionComponent {
  session: ISession
  onClick: (psid: string) => void
}

const Separator = () => (
  <svg viewBox='0 0 2 2' className='h-0.5 w-0.5 flex-none fill-gray-400'>
    <circle cx={1} cy={1} r={1} />
  </svg>
)

const Session = ({ session, onClick }: ISessionComponent) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const date = new Date(session.created).toLocaleDateString(language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  })

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
      <li className='relative flex justify-between gap-x-6 py-4 bg-gray-200/60 hover:bg-gray-200 dark:bg-[#162032] dark:hover:bg-slate-800 cursor-pointer px-4 sm:px-6 mb-4 rounded-lg'>
        <div className='flex min-w-0 gap-x-4'>
          <div className='min-w-0 flex-auto'>
            <p className='flex items-center gap-x-2 text-sm font-semibold leading-6 text-gray-900 dark:text-gray-50'>
              {date}
            </p>
            <p className='mt-1 flex items-center gap-x-2 text-xs leading-5 text-gray-500 dark:text-gray-300'>
              <span className='flex'>
                {session.cc ? <CCRow size={18} cc={session.cc} language={language} /> : t('project.unknownCountry')}
              </span>
              <Separator />
              {session.os}
              <Separator />
              {session.br}
            </p>
            <p className='mt-1 flex sm:hidden text-xs leading-5 text-gray-500 dark:text-gray-300'>{pageviewCount}</p>
          </div>
        </div>
        <div className='flex shrink-0 items-center gap-x-4'>
          <div className='hidden sm:flex sm:flex-col sm:items-end'>
            <p className='text-sm leading-6 text-gray-900  dark:text-gray-50'>{pageviewCount}</p>
          </div>
          <ChevronRightIcon className='h-5 w-5 flex-none text-gray-400' aria-hidden='true' />
        </div>
      </li>
    </Link>
  )
}

export const Sessions: React.FC<ISessions> = ({ sessions, onClick }) => {
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
            <Session key={session.psid} session={session} onClick={onClick} />
          ))}
        </ul>
      )}
    </ClientOnly>
  )
}
