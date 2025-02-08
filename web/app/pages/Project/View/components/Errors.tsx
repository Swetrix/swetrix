import React, { useMemo } from 'react'
import { Link } from '@remix-run/react'
import { ClientOnly } from 'remix-utils/client-only'
import { useTranslation } from 'react-i18next'
import _map from 'lodash/map'
import cx from 'clsx'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import Loader from '~/ui/Loader'
import { SwetrixError } from '../interfaces/error'
import { getRelativeDateIfPossible } from '~/utils/date'
import { Badge } from '~/ui/Badge'

interface ErrorsProps {
  errors: SwetrixError[]
  onClick: (psid: string) => void
}

interface ErrorItemProps {
  error: SwetrixError
  onClick: (psid: string) => void
}

interface SeparatorProps {
  className?: string
}

const Separator = ({ className }: SeparatorProps) => (
  <svg viewBox='0 0 2 2' className={cx('h-0.5 w-0.5 flex-none fill-gray-400', className)}>
    <circle cx={1} cy={1} r={1} />
  </svg>
)

const ErrorItem = ({ error, onClick }: ErrorItemProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const lastSeen = useMemo(() => {
    return getRelativeDateIfPossible(error.last_seen, language)
  }, [error.last_seen, language])
  const status: {
    label: string
    colour: 'red' | 'yellow' | 'slate'
  } = useMemo(() => {
    if (error.status === 'active') {
      return {
        label: t('error.status.active'),
        colour: 'red',
      }
    }

    if (error.status === 'regressed') {
      return {
        label: t('error.status.regressed'),
        colour: 'yellow',
      }
    }

    return {
      label: t('error.status.resolved'),
      colour: 'slate',
    }
  }, [error.status, t])

  const eidUrl = new URL(window.location.href)
  eidUrl.searchParams.set('eid', error.eid)
  const stringifiedUrl = eidUrl.toString()

  return (
    <Link
      onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault()
        e.stopPropagation()
        window.history.pushState({}, '', stringifiedUrl)

        onClick(error.eid)
      }}
      to={stringifiedUrl}
    >
      <li className='relative mb-4 flex cursor-pointer justify-between gap-x-6 rounded-lg bg-gray-200/60 px-4 py-4 font-mono hover:bg-gray-200 sm:px-6 dark:bg-[#162032] dark:hover:bg-slate-800'>
        <div className='flex min-w-0 gap-x-4'>
          <div className='min-w-0 flex-auto'>
            <p className='flex items-baseline gap-x-2 leading-6 font-semibold text-gray-900 dark:text-gray-50'>
              <span className='text-sm font-bold'>{error.name}</span>
              {error.filename ? (
                <>
                  <Separator className='self-center' />
                  <span className='mx-1 text-xs font-normal text-gray-500'>{error.filename}</span>
                </>
              ) : null}
            </p>
            {error.message ? (
              <p className='mt-1 flex text-sm leading-5 text-gray-500 dark:text-gray-300'>{error.message}</p>
            ) : null}
            <p className='mt-1 flex items-center gap-x-2 text-base text-sm leading-5 text-gray-500 dark:text-gray-300'>
              <Badge className='mr-2 sm:hidden' label={status.label} colour={status.colour} />
              {lastSeen}
              <Separator className='sm:hidden' />
              <span className='sm:hidden'>
                {t('dashboard.xOccurrences', {
                  x: error.count,
                })}
              </span>
            </p>
          </div>
        </div>
        <div className='flex shrink-0 items-center gap-x-4'>
          <div className='hidden sm:flex sm:flex-col sm:items-end'>
            <p className='text-sm leading-6 text-gray-900 dark:text-gray-50'>
              {t('dashboard.xOccurrences', {
                x: error.count,
              })}
            </p>
            <Badge label={status.label} colour={status.colour} />
          </div>
          <ChevronRightIcon className='h-5 w-5 flex-none text-gray-400' aria-hidden='true' />
        </div>
      </li>
    </Link>
  )
}

export const Errors = ({ errors, onClick }: ErrorsProps) => {
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
          {_map(errors, (error) => (
            <ErrorItem key={error.eid} error={error} onClick={onClick} />
          ))}
        </ul>
      )}
    </ClientOnly>
  )
}
