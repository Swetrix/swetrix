import { TFunction } from 'i18next'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _toUpper from 'lodash/toUpper'
import { BugIcon, ChevronDownIcon, CircleIcon, FileTextIcon, MousePointerClickIcon } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { cn, getStringFromTime, getTimeFromSeconds } from '~/utils/generic'

interface Metadata {
  key: string
  value: string
}

interface PageflowProps {
  pages: {
    type: 'pageview' | 'event' | 'error'
    value: string
    created: string
    metadata?: Metadata[]
  }[]
  timeFormat: '12-hour' | '24-hour'
  zoomedTimeRange?: [Date, Date] | null
  sdur?: number
}

interface PageflowItemProps {
  value: string
  created: string
  type: 'pageview' | 'event' | 'error'
  metadata?: Metadata[]
  displayCreated: string
  timeDuration: number | null
  isLastEvent: boolean
  t: TFunction
}

const KeyValue = ({ evKey, evValue }: { evKey: string; evValue: string }) => (
  <li className='text-[11px] wrap-anywhere'>
    <span className='text-gray-500 dark:text-gray-400'>{evKey}:</span> {evValue}
  </li>
)

const formatDuration = (seconds: number): string => {
  if (seconds <= 0) {
    return ''
  }

  return getStringFromTime(getTimeFromSeconds(seconds))
}

const PageflowItem = ({
  value,
  created,
  type,
  metadata,
  displayCreated,
  timeDuration,
  isLastEvent,
  t,
}: PageflowItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasMetadata = metadata && metadata.length > 0

  return (
    <li>
      <div className='relative pb-8'>
        {/* Solid line to next event OR dotted line to end of session */}
        {!isLastEvent ? (
          <span
            className='absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200 dark:bg-slate-700'
            aria-hidden='true'
          />
        ) : (
          <span
            className='absolute top-4 left-4 -ml-px h-full w-0.5 border-l-2 border-dashed border-slate-200 dark:border-slate-700'
            aria-hidden='true'
          />
        )}
        <div className='relative flex space-x-3'>
          <div>
            <span
              className={cn('flex h-8 w-8 items-center justify-center rounded-full', {
                'bg-slate-400 dark:bg-slate-800': type !== 'error',
                'bg-red-400 dark:bg-red-800': type === 'error',
              })}
            >
              {type === 'pageview' ? (
                <FileTextIcon className='h-5 w-5 text-white' aria-hidden='true' strokeWidth={1.5} />
              ) : null}
              {type === 'event' ? (
                <MousePointerClickIcon className='h-5 w-5 text-white' aria-hidden='true' strokeWidth={1.5} />
              ) : null}
              {type === 'error' ? (
                <BugIcon className='h-5 w-5 text-white' aria-hidden='true' strokeWidth={1.5} />
              ) : null}
            </span>
          </div>
          <div className='flex min-w-0 flex-1 flex-col pt-1.5'>
            <div className='flex justify-between space-x-4'>
              <div
                className={cn('flex items-center text-sm text-gray-700 dark:text-gray-300', {
                  'cursor-pointer': hasMetadata,
                })}
                onClick={hasMetadata ? () => setIsExpanded(!isExpanded) : undefined}
                role={hasMetadata ? 'button' : undefined}
                tabIndex={hasMetadata ? 0 : undefined}
                onKeyDown={
                  hasMetadata
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setIsExpanded(!isExpanded)
                        }
                      }
                    : undefined
                }
              >
                {hasMetadata ? (
                  <ChevronDownIcon
                    className={cn(
                      'mr-1 h-4 w-4 text-gray-400 transition-transform duration-200 dark:text-gray-500',
                      {
                        'rotate-0': !isExpanded,
                        '-rotate-90': !isExpanded,
                      },
                      isExpanded && 'rotate-0',
                    )}
                    aria-hidden='true'
                  />
                ) : null}
                <Trans
                  t={t}
                  i18nKey={
                    type === 'pageview' ? 'project.pageviewX' : type === 'event' ? 'project.eventX' : 'project.errorX'
                  }
                  components={{
                    value: <span className='ml-1 font-medium text-gray-900 dark:text-gray-50' />,
                    span: <span />,
                  }}
                  values={{
                    x: value || _toUpper(t('common.notSet')),
                  }}
                />
              </div>
              <div className='text-right text-sm whitespace-nowrap text-gray-700 dark:text-gray-300'>
                <time dateTime={created}>{displayCreated}</time>
              </div>
            </div>

            {/* Collapsible metadata */}
            {hasMetadata && isExpanded ? (
              <ul className='mt-2 ml-5 space-y-0.5 rounded-md bg-gray-50 p-2 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300'>
                {_map(metadata, ({ key, value: metaValue }, index) => (
                  <KeyValue key={`${key}${metaValue}${index}`} evKey={key} evValue={metaValue} />
                ))}
              </ul>
            ) : null}

            {/* Time duration to next step */}
            {timeDuration !== null && timeDuration > 0 ? (
              <div className='mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400'>
                <svg
                  className='mr-1 h-3 w-3'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <circle cx='12' cy='12' r='10' strokeWidth='2' />
                  <polyline points='12 6 12 12 16 14' strokeWidth='2' strokeLinecap='round' />
                </svg>
                {formatDuration(timeDuration)}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  )
}

export const Pageflow = ({ pages, timeFormat, zoomedTimeRange, sdur = 0 }: PageflowProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  const filteredPages = useMemo(() => {
    if (!pages) {
      return []
    }

    if (!zoomedTimeRange) {
      return pages
    }

    return pages.filter((page) => {
      const pageTime = new Date(page.created).getTime()
      return pageTime >= zoomedTimeRange[0].getTime() && pageTime <= zoomedTimeRange[1].getTime()
    })
  }, [pages, zoomedTimeRange])

  // Calculate time between events
  const timeBetweenEvents = useMemo(() => {
    if (filteredPages.length < 2) {
      return []
    }

    const times: number[] = []
    for (let i = 0; i < filteredPages.length - 1; i++) {
      const currentTime = new Date(filteredPages[i].created).getTime()
      const nextTime = new Date(filteredPages[i + 1].created).getTime()
      const diffSeconds = Math.round((nextTime - currentTime) / 1000)
      times.push(diffSeconds)
    }
    return times
  }, [filteredPages])

  // Calculate time remaining after the last event
  const timeAfterLastEvent = useMemo(() => {
    if (sdur <= 0 || filteredPages.length === 0) {
      return 0
    }

    const firstEventTime = new Date(filteredPages[0].created).getTime()
    const lastEventTime = new Date(filteredPages[filteredPages.length - 1].created).getTime()
    const timeBetweenFirstAndLast = Math.round((lastEventTime - firstEventTime) / 1000)
    const remaining = sdur - timeBetweenFirstAndLast

    return remaining > 0 ? remaining : 0
  }, [filteredPages, sdur])

  if (zoomedTimeRange && _isEmpty(filteredPages)) {
    return (
      <div className='my-4 py-8 text-center text-gray-800 dark:text-gray-300'>
        {t('project.noEventsForSelectedPeriod')}
      </div>
    )
  }

  return (
    <div className='flow-root'>
      <ul className='-mb-8'>
        {_map(filteredPages, ({ value, created, type, metadata }, index) => {
          const displayCreated = new Date(created).toLocaleDateString(language, {
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hourCycle: timeFormat === '12-hour' ? 'h12' : 'h23',
          })

          const isLastEvent = index === filteredPages.length - 1
          const timeDuration = !isLastEvent ? timeBetweenEvents[index] : null

          return (
            <PageflowItem
              key={`${value}${created}${index}`}
              value={value}
              created={created}
              type={type}
              metadata={metadata}
              displayCreated={displayCreated}
              timeDuration={timeDuration}
              isLastEvent={isLastEvent}
              t={t}
            />
          )
        })}

        {/* End of session marker */}
        {filteredPages.length > 0 ? (
          <li>
            <div className='relative pb-8'>
              <div className='relative flex space-x-3'>
                <div>
                  <span className='flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900'>
                    <CircleIcon
                      className='h-3 w-3 text-slate-400 dark:text-slate-500'
                      aria-hidden='true'
                      fill='currentColor'
                    />
                  </span>
                </div>
                <div className='flex min-w-0 flex-1 flex-col pt-1.5'>
                  <div className='flex justify-between space-x-4'>
                    <div className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                      {t('project.endOfSession')}
                    </div>
                  </div>
                  {/* Time after last event (only if sdur > 0) */}
                  {timeAfterLastEvent > 0 ? (
                    <div className='mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400'>
                      <svg
                        className='mr-1 h-3 w-3'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                        xmlns='http://www.w3.org/2000/svg'
                      >
                        <circle cx='12' cy='12' r='10' strokeWidth='2' />
                        <polyline points='12 6 12 12 16 14' strokeWidth='2' strokeLinecap='round' />
                      </svg>
                      {formatDuration(timeAfterLastEvent)}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        ) : null}
      </ul>
    </div>
  )
}
