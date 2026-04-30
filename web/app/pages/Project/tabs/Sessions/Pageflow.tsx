import { TFunction } from 'i18next'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _size from 'lodash/size'
import _toUpper from 'lodash/toUpper'
import _truncate from 'lodash/truncate'
import {
  WarningIcon,
  CaretDownIcon,
  CurrencyDollarIcon,
  FileTextIcon,
  CursorClickIcon,
  ArrowCounterClockwiseIcon,
  TagIcon,
  ClockIcon,
  ClockCounterClockwiseIcon,
} from '@phosphor-icons/react'
import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/ui/Text'
import { cn, getStringFromTime, getTimeFromSeconds } from '~/utils/generic'

interface Metadata {
  key: string
  value: string
}

type EventType = 'pageview' | 'event' | 'error' | 'sale' | 'refund'

interface PageflowProps {
  pages: {
    type: EventType
    value: string
    created: string
    metadata?: Metadata[]
    amount?: number
    currency?: string
  }[]
  timeFormat: '12-hour' | '24-hour'
  zoomedTimeRange?: [Date, Date] | null
  sdur?: number
  isLive?: boolean
  websiteUrl?: string | null
}

interface PageflowItemProps {
  index: number
  value: string
  created: string
  type: EventType
  metadata?: Metadata[]
  displayCreated: string
  timeDuration: number | null
  t: TFunction
  amount?: number
  currency?: string
  websiteUrl?: string | null
}

const ICON_BY_TYPE: Record<EventType, React.ElementType> = {
  pageview: FileTextIcon,
  event: CursorClickIcon,
  error: WarningIcon,
  sale: CurrencyDollarIcon,
  refund: ArrowCounterClockwiseIcon,
}

const ICON_COLOR_BY_TYPE: Record<EventType, string> = {
  pageview: 'text-yellow-500',
  event: 'text-green-500',
  error: 'text-red-500',
  sale: 'text-emerald-500',
  refund: 'text-orange-500',
}

const formatDuration = (seconds: number): string => {
  if (seconds <= 0) return ''
  if (seconds < 1) return '<1s'
  return getStringFromTime(getTimeFromSeconds(seconds))
}

const StepNumber = ({ number }: { number: number }) => (
  <Text
    size='xs'
    weight='semibold'
    colour='secondary'
    className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white tabular-nums ring-1 ring-gray-300 dark:bg-slate-900 dark:ring-slate-700/80'
  >
    {number}
  </Text>
)

const RailLine = () => (
  <div className='flex flex-1 justify-center pt-1.5'>
    <div
      className='w-px self-stretch bg-gray-200 dark:bg-slate-700/80'
      aria-hidden
    />
  </div>
)

const TypeIcon = ({
  type,
  className,
}: {
  type: EventType
  className?: string
}) => {
  const Icon = ICON_BY_TYPE[type]
  return (
    <Icon
      className={cn('h-4 w-4 shrink-0', ICON_COLOR_BY_TYPE[type], className)}
      weight='duotone'
      aria-hidden
    />
  )
}

const Duration = ({ seconds }: { seconds: number }) => (
  <Text
    size='xs'
    weight='medium'
    colour='muted'
    className='inline-flex items-center gap-1 tabular-nums'
  >
    <ClockIcon className='h-3 w-3' aria-hidden />
    {formatDuration(seconds)}
  </Text>
)

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
    <div className='mt-2 overflow-hidden rounded-md bg-gray-50/80 ring-1 ring-gray-200/80 dark:bg-slate-950/40 dark:ring-slate-700/60'>
      <dl className='divide-y divide-gray-200/70 dark:divide-slate-800/80'>
        {_map(displayedMetadata, ({ key, value }, index) => {
          const needsTruncation = _size(value) > 80
          const displayValue = needsTruncation
            ? _truncate(value, { length: 80 })
            : value

          return (
            <div
              key={`${key}${value}${index}`}
              className='grid grid-cols-1 gap-1 px-3 py-2 sm:grid-cols-[minmax(96px,160px)_1fr] sm:gap-4'
            >
              <Text
                as='dt'
                size='xs'
                weight='medium'
                colour='muted'
                tracking='tight'
                className='font-mono leading-5'
              >
                {key}
              </Text>
              <Text
                as='dd'
                size='xs'
                colour='secondary'
                className={cn(
                  'leading-5 wrap-break-word',
                  needsTruncation && 'cursor-help',
                )}
                title={needsTruncation ? value : undefined}
              >
                {displayValue}
              </Text>
            </div>
          )
        })}
      </dl>
      {hasMore ? (
        <Text
          as='button'
          size='xs'
          weight='medium'
          colour='muted'
          type='button'
          onClick={() => setShowAll(!showAll)}
          className='block w-full border-t border-gray-200/70 px-3 py-1.5 text-left transition-colors hover:bg-gray-100/70 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none focus-visible:ring-inset dark:border-slate-800/80 dark:hover:bg-slate-900/60 dark:hover:text-gray-200 dark:focus-visible:ring-slate-300'
        >
          {showAll
            ? t('project.showLess')
            : t('project.showMore', { count: remainingCount })}
        </Text>
      ) : null}
    </div>
  )
}

const formatAmount = (amount: number, currency?: string) => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(Math.abs(amount))
  } catch {
    return `${Math.abs(amount).toFixed(2)} ${currency || 'USD'}`
  }
}

const PageflowItem = ({
  index,
  value,
  created,
  type,
  metadata,
  displayCreated,
  timeDuration,
  t,
  amount,
  currency,
  websiteUrl,
}: PageflowItemProps) => {
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
  const hasMetadata = !!metadata && metadata.length > 0
  const isMonetary = type === 'sale' || type === 'refund'
  const hasDuration = timeDuration !== null && timeDuration > 0
  const showSubRow = hasDuration || hasMetadata

  return (
    <li className='grid grid-cols-[28px_1fr] gap-x-3.5'>
      <div className='flex flex-col items-center'>
        <StepNumber number={index} />
        <RailLine />
      </div>

      <div className='min-w-0 pb-6'>
        <div className='flex min-h-7 items-center justify-between gap-3'>
          <div className='flex min-w-0 items-center gap-2'>
            <TypeIcon type={type} />
            {isMonetary ? (
              <div className='flex flex-wrap items-baseline gap-x-2 leading-4'>
                <Text
                  size='sm'
                  weight='semibold'
                  colour={type === 'sale' ? 'success' : 'warning'}
                  className='leading-4 tabular-nums'
                >
                  {type === 'refund' ? '−' : '+'}
                  {formatAmount(amount || 0, currency)}
                </Text>
                {value ? (
                  <Text size='xs' colour='muted'>
                    · {value}
                  </Text>
                ) : null}
              </div>
            ) : fullPageUrl ? (
              <a
                href={fullPageUrl}
                target='_blank'
                rel='noopener noreferrer nofollow'
                className='leading-4 underline decoration-gray-300 decoration-dashed underline-offset-2 transition-colors hover:decoration-gray-500 dark:decoration-slate-600 dark:hover:decoration-slate-400'
              >
                <Text
                  size='sm'
                  weight='medium'
                  colour='primary'
                  className='leading-4 wrap-break-word'
                >
                  {value}
                </Text>
              </a>
            ) : (
              <Text
                size='sm'
                weight='medium'
                colour='primary'
                className='leading-4 wrap-break-word'
              >
                {value || _toUpper(t('common.notSet'))}
              </Text>
            )}
          </div>
          <time dateTime={created} className='hidden shrink-0 sm:inline-block'>
            <Text size='xs' colour='muted' className='tabular-nums'>
              {displayCreated}
            </Text>
          </time>
        </div>

        {showSubRow ? (
          <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-6'>
            {hasDuration ? <Duration seconds={timeDuration!} /> : null}
            {hasMetadata ? (
              <Text
                as='button'
                size='xs'
                weight='medium'
                colour='muted'
                type='button'
                aria-expanded={isExpanded}
                onClick={() => setIsExpanded(!isExpanded)}
                className='inline-flex items-center gap-1.5 rounded-md transition-colors hover:text-gray-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:hover:text-gray-200 dark:focus-visible:ring-slate-300 dark:focus-visible:ring-offset-slate-900'
              >
                <span className='inline-flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 ring-1 ring-gray-200/80 dark:bg-slate-800 dark:ring-slate-700/70'>
                  <TagIcon className='h-2.5 w-2.5' aria-hidden />
                  <Text
                    as='span'
                    size='xxs'
                    colour='secondary'
                    className='tabular-nums'
                  >
                    {metadata!.length}
                  </Text>
                </span>
                <span>{t('project.properties')}</span>
                <CaretDownIcon
                  className={cn(
                    'h-3 w-3 transition-transform duration-200 ease-out motion-reduce:transition-none',
                    isExpanded && 'rotate-180',
                  )}
                  aria-hidden
                />
              </Text>
            ) : null}
          </div>
        ) : null}

        {hasMetadata && isExpanded ? (
          <div className='pl-6'>
            <MetadataPanel metadata={metadata!} t={t} />
          </div>
        ) : null}
      </div>
    </li>
  )
}

const Terminator = ({ isLive, t }: { isLive?: boolean; t: TFunction }) => (
  <li className='grid grid-cols-[28px_1fr] gap-x-3.5'>
    <div className='flex flex-col items-center'>
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1',
          isLive
            ? 'bg-red-50 ring-red-200 dark:bg-red-500/10 dark:ring-red-500/30'
            : 'bg-gray-50 ring-gray-300 dark:bg-slate-900 dark:ring-slate-700/80',
        )}
      >
        {isLive ? (
          <span className='relative flex h-2 w-2'>
            <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75' />
            <span className='relative inline-flex h-2 w-2 rounded-full bg-red-500' />
          </span>
        ) : (
          <span className='h-1.5 w-1.5 rounded-full bg-gray-400 dark:bg-slate-500' />
        )}
      </span>
    </div>
    <div className='flex min-h-7 min-w-0 items-center'>
      <Text
        size='xs'
        weight='medium'
        tracking='tight'
        colour={isLive ? 'error' : 'muted'}
      >
        {isLive ? t('project.sessionInProgress') : t('project.endOfSession')}
      </Text>
    </div>
  </li>
)

export const Pageflow = ({
  pages,
  timeFormat,
  zoomedTimeRange,
  sdur = 0,
  isLive,
  websiteUrl,
}: PageflowProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  const filteredPages = useMemo(() => {
    if (!pages) return []
    if (!zoomedTimeRange) return pages

    return pages.filter((page) => {
      const pageTime = new Date(page.created).getTime()
      return (
        pageTime >= zoomedTimeRange[0].getTime() &&
        pageTime <= zoomedTimeRange[1].getTime()
      )
    })
  }, [pages, zoomedTimeRange])

  const timeBetweenEvents = useMemo(() => {
    if (filteredPages.length < 2) return []
    const times: number[] = []
    for (let i = 0; i < filteredPages.length - 1; i++) {
      const currentTime = new Date(filteredPages[i].created).getTime()
      const nextTime = new Date(filteredPages[i + 1].created).getTime()
      times.push(Math.round((nextTime - currentTime) / 1000))
    }
    return times
  }, [filteredPages])

  const timeAfterLastEvent = useMemo(() => {
    if (sdur <= 0 || filteredPages.length === 0) return 0
    const firstEventTime = new Date(filteredPages[0].created).getTime()
    const lastEventTime = new Date(
      filteredPages[filteredPages.length - 1].created,
    ).getTime()
    const remaining = sdur - Math.round((lastEventTime - firstEventTime) / 1000)
    return remaining > 0 ? remaining : 0
  }, [filteredPages, sdur])

  if (zoomedTimeRange && _isEmpty(filteredPages)) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 px-6 py-10 text-center'>
        <ClockCounterClockwiseIcon
          className='h-6 w-6 text-gray-400 dark:text-slate-500'
          aria-hidden
        />
        <Text as='p' size='sm' colour='secondary' className='max-w-xs'>
          {t('project.noEventsForSelectedPeriod')}
        </Text>
      </div>
    )
  }

  if (_isEmpty(filteredPages)) {
    return null
  }

  return (
    <ol className='relative'>
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
          const timeDuration = !isLastEvent
            ? timeBetweenEvents[index]
            : timeAfterLastEvent > 0
              ? timeAfterLastEvent
              : null

          return (
            <PageflowItem
              key={`${value}${created}${index}`}
              index={index + 1}
              value={value}
              created={created}
              type={type}
              metadata={metadata}
              displayCreated={displayCreated}
              timeDuration={timeDuration}
              t={t}
              amount={amount}
              currency={currency}
              websiteUrl={websiteUrl}
            />
          )
        },
      )}
      <Terminator isLive={isLive} t={t} />
    </ol>
  )
}
