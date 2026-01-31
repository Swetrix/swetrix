import { TFunction } from 'i18next'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _size from 'lodash/size'
import _toUpper from 'lodash/toUpper'
import _truncate from 'lodash/truncate'
import {
  BugIcon,
  CaretDownIcon,
  CircleIcon,
  CurrencyDollarIcon,
  FileTextIcon,
  CursorClickIcon,
  ArrowCounterClockwiseIcon,
  TagIcon,
} from '@phosphor-icons/react'
import React, { useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { cn, getStringFromTime, getTimeFromSeconds } from '~/utils/generic'

interface Metadata {
  key: string
  value: string
}

interface PageflowProps {
  pages: {
    type: 'pageview' | 'event' | 'error' | 'sale' | 'refund'
    value: string
    created: string
    metadata?: Metadata[]
    amount?: number
    currency?: string
  }[]
  timeFormat: '12-hour' | '24-hour'
  zoomedTimeRange?: [Date, Date] | null
  sdur?: number
  websiteUrl?: string | null
}

interface PageflowItemProps {
  value: string
  created: string
  type: 'pageview' | 'event' | 'error' | 'sale' | 'refund'
  metadata?: Metadata[]
  displayCreated: string
  timeDuration: number | null
  isLastEvent: boolean
  t: TFunction
  amount?: number
  currency?: string
  websiteUrl?: string | null
}

const MetadataPanel = ({
  metadata,
  t,
}: {
  metadata: Metadata[]
  t: TFunction
}) => {
  const [showAll, setShowAll] = useState(false)
  const INITIAL_SHOW_COUNT = 5
  const hasMore = metadata.length > INITIAL_SHOW_COUNT
  const displayedMetadata = showAll
    ? metadata
    : metadata.slice(0, INITIAL_SHOW_COUNT)
  const remainingCount = metadata.length - INITIAL_SHOW_COUNT

  return (
    <div className='mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white sm:ml-5 dark:border-slate-700 dark:bg-slate-900/50'>
      {/* Header */}
      <div className='border-b border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800/50'>
        <span className='text-[10px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400'>
          {t('project.properties')}
        </span>
      </div>

      {/* Table */}
      <div className='divide-y divide-slate-100 dark:divide-slate-800'>
        {_map(displayedMetadata, ({ key, value }, index) => {
          const needsTruncation = _size(value) > 60
          const displayValue = needsTruncation
            ? _truncate(value, { length: 60 })
            : value

          return (
            <div
              key={`${key}${value}${index}`}
              className='flex flex-col gap-1 px-3 py-2 transition-colors hover:bg-slate-50 sm:grid sm:grid-cols-[minmax(80px,auto)_1fr] sm:gap-3 dark:hover:bg-slate-800/30'
            >
              <div className='flex items-start'>
                <span className='font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400'>
                  {key}
                </span>
              </div>
              <div className='flex items-start'>
                <span
                  className={cn(
                    'text-xs break-all text-slate-700 dark:text-slate-300',
                    needsTruncation && 'cursor-help',
                  )}
                  title={needsTruncation ? value : undefined}
                >
                  {displayValue}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Show more button */}
      {hasMore ? (
        <button
          type='button'
          onClick={() => setShowAll(!showAll)}
          className='w-full border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-300'
        >
          {showAll
            ? t('project.showLess')
            : t('project.showMore', { count: remainingCount })}
        </button>
      ) : null}
    </div>
  )
}

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
  amount,
  currency,
  websiteUrl,
}: PageflowItemProps) => {
  // Construct full URL for pageview links
  const fullPageUrl = useMemo(() => {
    if (type !== 'pageview' || !value || !websiteUrl) return null
    try {
      const baseUrl = new URL(websiteUrl)
      return new URL(value, baseUrl.origin).toString()
    } catch {
      return null
    }
  }, [type, value, websiteUrl])
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
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full',
                {
                  'bg-slate-400 dark:bg-slate-800':
                    type === 'pageview' || type === 'event',
                  'bg-red-400 dark:bg-red-800': type === 'error',
                  'bg-green-500 dark:bg-green-700': type === 'sale',
                  'bg-orange-500 dark:bg-orange-700': type === 'refund',
                },
              )}
            >
              {type === 'pageview' ? (
                <FileTextIcon
                  className='h-5 w-5 text-white'
                  aria-hidden='true'
                  strokeWidth={1.5}
                />
              ) : null}
              {type === 'event' ? (
                <CursorClickIcon
                  className='h-5 w-5 text-white'
                  aria-hidden='true'
                  strokeWidth={1.5}
                />
              ) : null}
              {type === 'error' ? (
                <BugIcon
                  className='h-5 w-5 text-white'
                  aria-hidden='true'
                  strokeWidth={1.5}
                />
              ) : null}
              {type === 'sale' ? (
                <CurrencyDollarIcon
                  className='h-5 w-5 text-white'
                  aria-hidden='true'
                  strokeWidth={1.5}
                />
              ) : null}
              {type === 'refund' ? (
                <ArrowCounterClockwiseIcon
                  className='h-5 w-5 text-white'
                  aria-hidden='true'
                  strokeWidth={1.5}
                />
              ) : null}
            </span>
          </div>
          <div className='flex min-w-0 flex-1 flex-col pt-1.5'>
            <div className='flex flex-col gap-y-1 sm:flex-row sm:justify-between sm:space-x-4'>
              <div
                className={cn(
                  'flex flex-wrap items-center gap-x-1 text-sm text-gray-700 dark:text-gray-300',
                  {
                    'cursor-pointer': hasMetadata,
                  },
                )}
                onClick={
                  hasMetadata ? () => setIsExpanded(!isExpanded) : undefined
                }
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
                {type === 'sale' || type === 'refund' ? (
                  <span className='flex items-center'>
                    <span
                      className={cn('font-semibold', {
                        'text-green-600 dark:text-green-400': type === 'sale',
                        'text-orange-600 dark:text-orange-400':
                          type === 'refund',
                      })}
                    >
                      {type === 'refund' ? '-' : ''}
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currency || 'USD',
                      }).format(Math.abs(amount || 0))}
                    </span>
                    {value ? (
                      <span className='ml-2 text-gray-500 dark:text-gray-400'>
                        ({value})
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <Trans
                    t={t}
                    i18nKey={
                      type === 'pageview'
                        ? 'project.pageviewX'
                        : type === 'event'
                          ? 'project.eventX'
                          : 'project.errorX'
                    }
                    components={{
                      value: fullPageUrl ? (
                        <a
                          href={fullPageUrl}
                          target='_blank'
                          rel='noopener noreferrer nofollow'
                          onClick={(e) => e.stopPropagation()}
                          className='ml-1 font-medium break-all text-gray-900 underline decoration-dashed underline-offset-2 hover:decoration-solid dark:text-gray-50'
                        />
                      ) : (
                        <span className='ml-1 font-medium text-gray-900 dark:text-gray-50' />
                      ),
                      span: <span />,
                    }}
                    values={{
                      x: value || _toUpper(t('common.notSet')),
                    }}
                  />
                )}
                {hasMetadata ? (
                  <span className='ml-2 inline-flex shrink-0 items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400'>
                    <TagIcon className='h-2.5 w-2.5' />
                    {metadata!.length}
                  </span>
                ) : null}
                {hasMetadata ? (
                  <CaretDownIcon
                    className={cn(
                      'ml-1 h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 dark:text-gray-500',
                      isExpanded && 'rotate-180',
                    )}
                    aria-hidden='true'
                  />
                ) : null}
              </div>
              <div className='text-left text-xs whitespace-nowrap text-gray-500 sm:text-right sm:text-sm sm:text-gray-700 dark:text-gray-400 sm:dark:text-gray-300'>
                <time dateTime={created}>{displayCreated}</time>
              </div>
            </div>

            {/* Collapsible metadata */}
            {hasMetadata && isExpanded ? (
              <MetadataPanel metadata={metadata!} t={t} />
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
                  <polyline
                    points='12 6 12 12 16 14'
                    strokeWidth='2'
                    strokeLinecap='round'
                  />
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

export const Pageflow = ({
  pages,
  timeFormat,
  zoomedTimeRange,
  sdur = 0,
  websiteUrl,
}: PageflowProps) => {
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
      return (
        pageTime >= zoomedTimeRange[0].getTime() &&
        pageTime <= zoomedTimeRange[1].getTime()
      )
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
    const lastEventTime = new Date(
      filteredPages[filteredPages.length - 1].created,
    ).getTime()
    const timeBetweenFirstAndLast = Math.round(
      (lastEventTime - firstEventTime) / 1000,
    )
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
        {_map(
          filteredPages,
          ({ value, created, type, metadata, amount, currency }, index) => {
            const displayCreated = new Date(created).toLocaleDateString(
              language,
              {
                day: 'numeric',
                month: 'short',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hourCycle: timeFormat === '12-hour' ? 'h12' : 'h23',
              },
            )

            const isLastEvent = index === filteredPages.length - 1
            // For the last event, show the remaining time (sdur - time between first and last event)
            // as "time spent on the last event" under the last item rather than under "End of session".
            const timeDuration = !isLastEvent
              ? timeBetweenEvents[index]
              : timeAfterLastEvent > 0
                ? timeAfterLastEvent
                : null

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
                amount={amount}
                currency={currency}
                websiteUrl={websiteUrl}
              />
            )
          },
        )}

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
                </div>
              </div>
            </div>
          </li>
        ) : null}
      </ul>
    </div>
  )
}
