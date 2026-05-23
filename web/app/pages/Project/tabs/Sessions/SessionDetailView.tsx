import dayjs from 'dayjs'
import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _truncate from 'lodash/truncate'
import { GlobeIcon, ClockIcon, LinkIcon, UserIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '~/ui/Link'

import {
  BROWSER_LOGO_MAP,
  OS_LOGO_MAP,
  OS_LOGO_MAP_DARK,
  PROJECT_TABS,
} from '~/lib/constants'
import { SessionDetails as SessionDetailsType } from '~/lib/models/Project'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import PulsatingCircle from '~/ui/icons/PulsatingCircle'
import Loader from '~/ui/Loader'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import {
  getLocaleDisplayName,
  getStringFromTime,
  getTimeFromSeconds,
  cn,
} from '~/utils/generic'

import Flag from '~/ui/Flag'
import countries from '~/utils/isoCountries'

import NoSessionDetails from './NoSessionDetails'
import { Pageflow } from './Pageflow'
import { SessionChart } from './SessionChart'

interface PageflowItem {
  type: 'pageview' | 'event' | 'error' | 'sale' | 'refund'
  value: string
  created: string
  metadata?: { key: string; value: string }[]
  amount?: number
  currency?: string
}

interface SessionDetailViewProps {
  activeSession: {
    details: SessionDetailsType
    chart?: {
      x: string[]
      pageviews?: number[]
      customEvents?: number[]
      errors?: number[]
    }
    pages?: PageflowItem[]
    timeBucket?: string
    sessionStart?: string
    lastActivity?: string
  } | null
  sessionLoading: boolean
  timeFormat: '12-hour' | '24-hour'
  rotateXAxis: boolean
  dataNames: Record<string, string>
  websiteUrl?: string | null
}

const RECENTLY_ACTIVE_THRESHOLD_SECONDS = 30 * 60

const InfoRow = ({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: React.ReactNode
  valueClassName?: string
}) => (
  <div className='grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] items-center gap-3 border-b border-gray-100 py-1.5 last:border-0 dark:border-slate-800/80'>
    <Text size='sm' colour='secondary' className='min-w-0'>
      {label}
    </Text>
    <Text
      as='div'
      size='sm'
      weight='medium'
      colour='primary'
      className={cn(
        'flex min-w-0 items-center justify-end gap-1 text-right wrap-break-word',
        valueClassName,
      )}
    >
      {value}
    </Text>
  </div>
)

const PanelSection = ({
  title,
  action,
  children,
}: {
  title: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
}) => (
  <section className='border-t border-gray-100 pt-3 first:border-t-0 first:pt-0 dark:border-slate-800/80'>
    <div className='mb-1.5 flex items-center justify-between gap-3'>
      <Text
        as='h3'
        size='xs'
        weight='semibold'
        colour='primary'
        className='uppercase'
        tracking='wide'
      >
        {title}
      </Text>
      {action}
    </div>
    {children}
  </section>
)

const BrowserIcon = ({
  browser,
  className,
}: {
  browser: string | null
  className?: string
}) => {
  if (!browser) return <GlobeIcon className={cn('h-4 w-4', className)} />

  const logoUrl = BROWSER_LOGO_MAP[browser as keyof typeof BROWSER_LOGO_MAP]

  if (!logoUrl) return <GlobeIcon className={cn('h-4 w-4', className)} />

  return <img src={logoUrl} className={cn('h-4 w-4', className)} alt='' />
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
  if (!os) return <GlobeIcon className={cn('h-4 w-4', className)} />

  const logoUrlLight = OS_LOGO_MAP[os as keyof typeof OS_LOGO_MAP]
  const logoUrlDark = OS_LOGO_MAP_DARK[os as keyof typeof OS_LOGO_MAP_DARK]

  let logoUrl = theme === 'dark' ? logoUrlDark : logoUrlLight
  logoUrl ||= logoUrlLight

  if (!logoUrl) return <GlobeIcon className={cn('h-4 w-4', className)} />

  return <img src={logoUrl} className={cn('h-4 w-4', className)} alt='' />
}

const formatCompactElapsed = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds)
  const minute = 60
  const hour = 60 * minute
  const day = 24 * hour
  const month = 30 * day
  const year = 365 * day

  if (safeSeconds < minute) return 'now'
  if (safeSeconds < hour) return `${Math.floor(safeSeconds / minute)}m`
  if (safeSeconds < day) return `${Math.floor(safeSeconds / hour)}h`
  if (safeSeconds < month) return `${Math.floor(safeSeconds / day)}d`
  if (safeSeconds < year) return `${Math.floor(safeSeconds / month)}mo`
  return `${Math.floor(safeSeconds / year)}y`
}

export const SessionDetailView = ({
  activeSession,
  sessionLoading,
  timeFormat,
  rotateXAxis,
  dataNames,
  websiteUrl,
}: SessionDetailViewProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { id: projectId } = useCurrentProject()
  const { theme } = useTheme()
  const [zoomedTimeRange, setZoomedTimeRange] = useState<[Date, Date] | null>(
    null,
  )

  const isTouchDevice = useMemo(() => {
    if (typeof window === 'undefined') return false
    const hasTouchEvent = 'ontouchstart' in window
    const hasMaxTouchPoints =
      typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0
    const coarsePointer = window.matchMedia
      ? window.matchMedia('(pointer: coarse)').matches
      : false
    return hasTouchEvent || hasMaxTouchPoints || coarsePointer
  }, [])

  const sessionDuration = useMemo(() => {
    if (!activeSession?.details) return 0

    if (activeSession.details.sdur && activeSession.details.sdur > 0) {
      return activeSession.details.sdur
    }

    if (!_isEmpty(activeSession.pages)) {
      const pageviews = activeSession.pages!.filter(
        (p) => p.type === 'pageview',
      )
      if (pageviews.length >= 1) {
        const firstPageview = pageviews[0]
        const lastPageview = pageviews[pageviews.length - 1]
        const diffSeconds = dayjs(lastPageview.created).diff(
          dayjs(firstPageview.created),
          'seconds',
        )
        if (diffSeconds > 0) {
          return diffSeconds
        }
      }
    }

    return 0
  }, [activeSession])

  const resetZoom = () => {
    setZoomedTimeRange(null)
  }

  if (_isEmpty(activeSession) && sessionLoading) {
    return <Loader />
  }

  if (
    activeSession !== null &&
    _isEmpty(activeSession?.chart) &&
    _isEmpty(activeSession?.pages) &&
    !sessionLoading
  ) {
    return <NoSessionDetails />
  }

  const details = activeSession?.details

  if (!details) {
    return <Loader />
  }

  const countryName = details.cc
    ? countries.getName(details.cc, language) || details.cc
    : null
  const locationSummary =
    [countryName, details.rg, details.ct].filter(Boolean).join(', ') ||
    t('project.unknown')
  const osLabel = details.os
    ? `${details.os}${details.osv ? ` ${details.osv}` : ''}`
    : null
  const browserLabel = details.br
    ? `${details.br}${details.brv ? ` ${details.brv}` : ''}`
    : null
  const platformSummary =
    [osLabel, browserLabel].filter(Boolean).join(', ') || t('project.unknown')
  const firstEventAt = activeSession.pages?.[0]?.created
  const lastEventAt =
    activeSession.pages && activeSession.pages.length > 0
      ? activeSession.pages[activeSession.pages.length - 1].created
      : null
  const sessionStartAt = activeSession.sessionStart || firstEventAt
  const lastActivityAt =
    activeSession.lastActivity || lastEventAt || sessionStartAt || null
  const secondsSinceLastActivity = lastActivityAt
    ? Math.max(0, dayjs().diff(dayjs(lastActivityAt), 'second'))
    : null
  const lastSeenTime =
    secondsSinceLastActivity !== null
      ? formatCompactElapsed(secondsSinceLastActivity)
      : null
  const sessionOnlineFor = sessionStartAt
    ? formatCompactElapsed(dayjs().diff(dayjs(sessionStartAt), 'second'))
    : sessionDuration > 0
      ? formatCompactElapsed(sessionDuration)
      : null
  const lastSeenDate = lastActivityAt
    ? new Date(lastActivityAt).toLocaleDateString(language, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hourCycle: timeFormat === '12-hour' ? 'h12' : 'h23',
      })
    : null
  const lastSeenLabel = lastSeenTime
    ? lastSeenTime === 'now'
      ? 'seen now'
      : `seen ${lastSeenTime} ago`
    : t('project.endOfSession')
  const isRecentlyActive =
    !details.isLive &&
    secondsSinceLastActivity !== null &&
    secondsSinceLastActivity < RECENTLY_ACTIVE_THRESHOLD_SECONDS
  const campaignRows = [
    { label: t('project.mapping.so'), value: details.so },
    { label: t('project.mapping.me'), value: details.me },
    { label: t('project.mapping.ca'), value: details.ca },
    { label: t('project.mapping.te'), value: details.te },
    { label: t('project.mapping.co'), value: details.co },
  ].filter(({ value }) => value)
  const durationValue = details.isLive ? (
    <>
      <ClockIcon className='h-4 w-4' />
      {sessionOnlineFor || t('dashboard.live')}
    </>
  ) : sessionDuration > 0 ? (
    <>
      <ClockIcon className='h-4 w-4' />
      {getStringFromTime(getTimeFromSeconds(sessionDuration))}
    </>
  ) : (
    'N/A'
  )
  const statusNode = details.isLive ? (
    <Tooltip
      asChild
      text={
        lastSeenDate
          ? t('project.lastSeenAt', { time: lastSeenDate })
          : t('project.online')
      }
      tooltipNode={
        <span className='grid grid-cols-[34px_minmax(0,1fr)] items-center gap-2'>
          <span className='flex h-6 items-center justify-center'>
            <PulsatingCircle type='small' />
          </span>
          <Text as='span' size='sm' colour='secondary' className='truncate'>
            {sessionOnlineFor
              ? `${t('project.online')} ${sessionOnlineFor}`
              : t('project.online')}
          </Text>
        </span>
      }
    />
  ) : isRecentlyActive ? (
    <Tooltip
      asChild
      text={
        lastSeenDate
          ? t('project.lastSeenAt', { time: lastSeenDate })
          : t('project.endOfSession')
      }
      tooltipNode={
        <span className='grid grid-cols-[34px_minmax(0,1fr)] items-center gap-2'>
          <span className='flex h-6 items-center justify-center'>
            <span className='h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900' />
          </span>
          <Text as='span' size='sm' colour='secondary' className='truncate'>
            {lastSeenLabel}
          </Text>
        </span>
      }
    />
  ) : (
    <Tooltip
      asChild
      text={
        lastSeenDate
          ? t('project.lastSeenAt', { time: lastSeenDate })
          : t('project.endOfSession')
      }
      tooltipNode={
        <span className='grid grid-cols-[34px_minmax(0,1fr)] items-center gap-2'>
          <span className='flex h-6 items-center justify-center'>
            <span className='h-2.5 w-2.5 rounded-full bg-gray-400 ring-2 ring-white dark:bg-slate-500 dark:ring-slate-900' />
          </span>
          <Text as='span' size='sm' colour='secondary' className='truncate'>
            {lastSeenLabel}
          </Text>
        </span>
      }
    />
  )

  return (
    <div className='grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start xl:grid-cols-[minmax(0,1fr)_390px]'>
      <section className='order-2 min-w-0 rounded-lg border border-gray-200 bg-white px-4 py-4 lg:order-1 dark:border-slate-800/60 dark:bg-slate-900/25'>
        <Text
          as='h3'
          size='xs'
          weight='semibold'
          tracking='wide'
          className='mb-3 uppercase'
        >
          {t('project.pageflow')}
        </Text>
        <Pageflow
          pages={activeSession?.pages || []}
          timeFormat={timeFormat}
          zoomedTimeRange={zoomedTimeRange}
          sdur={activeSession?.details?.sdur}
          isLive={activeSession?.details?.isLive}
          websiteUrl={websiteUrl}
        />
      </section>

      <aside className='order-1 lg:sticky lg:top-14 lg:order-2 lg:self-start'>
        <div className='h-fit space-y-3 rounded-lg border border-gray-200 bg-white px-4 py-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
          <div>
            <div className='min-w-0 space-y-1.5'>
              {statusNode}
              <div className='grid grid-cols-[34px_minmax(0,1fr)] items-center gap-2'>
                <span className='flex h-6 items-center justify-center'>
                  {details.cc ? (
                    <Flag
                      className='rounded-xs'
                      country={details.cc}
                      size={20}
                      alt=''
                      aria-hidden='true'
                    />
                  ) : (
                    <GlobeIcon className='h-5 w-5 text-gray-500 dark:text-gray-400' />
                  )}
                </span>
                <Text
                  as='span'
                  size='base'
                  weight='medium'
                  colour='primary'
                  className='truncate leading-6'
                  title={locationSummary}
                >
                  {locationSummary}
                </Text>
              </div>
              <div className='grid grid-cols-[34px_minmax(0,1fr)] items-center gap-2'>
                <span className='relative flex h-6 w-[34px] items-center justify-center'>
                  {details.os || details.br ? (
                    <>
                      <OSIcon
                        os={details.os}
                        theme={theme}
                        className='absolute left-1 h-4 w-4'
                      />
                      <BrowserIcon
                        browser={details.br}
                        className='absolute right-1 h-4 w-4'
                      />
                    </>
                  ) : (
                    <OSIcon
                      os={details.os}
                      theme={theme}
                      className='h-5 w-5 text-gray-500 dark:text-gray-400'
                    />
                  )}
                </span>
                <Text
                  as='span'
                  size='base'
                  weight='medium'
                  colour='primary'
                  className='truncate leading-6'
                  title={platformSummary}
                >
                  {platformSummary}
                </Text>
              </div>
            </div>

            {details.profileId ? (
              <Link
                to={`/projects/${projectId}?tab=${PROJECT_TABS.profiles}&profileId=${encodeURIComponent(details.profileId)}`}
                className='mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800'
              >
                <UserIcon className='h-4 w-4' />
                {t('project.goToProfile')}
              </Link>
            ) : null}
          </div>

          <PanelSection title={t('project.sessionInfo')}>
            <div>
              <InfoRow
                label={t('dashboard.sessionDuration')}
                value={durationValue}
              />
              <InfoRow
                label={t('project.mapping.ref')}
                value={
                  details.ref ? (
                    <Tooltip
                      text={details.ref}
                      tooltipNode={
                        <div className='flex min-w-0 items-center justify-end gap-1'>
                          <LinkIcon className='h-4 w-4 shrink-0' />
                          <span
                            className='truncate'
                            title={
                              _size(details.ref) > 34 ? details.ref : undefined
                            }
                          >
                            {_truncate(details.ref, { length: 34 })}
                          </span>
                        </div>
                      }
                    />
                  ) : (
                    t('project.directNone')
                  )
                }
              />
              <InfoRow
                label={t('project.mapping.lc')}
                value={
                  details.lc ? getLocaleDisplayName(details.lc, language) : '-'
                }
              />
            </div>
          </PanelSection>

          {campaignRows.length > 0 ? (
            <PanelSection title={t('project.campaigns')}>
              <div>
                {campaignRows.map(({ label, value }) => (
                  <InfoRow key={label} label={label} value={value} />
                ))}
              </div>
            </PanelSection>
          ) : null}

          {!_isEmpty(activeSession?.chart) ? (
            <PanelSection
              title={t('project.sessionActivity')}
              action={
                zoomedTimeRange && !isTouchDevice ? (
                  <button
                    onClick={resetZoom}
                    className='rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-800 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200 hover:dark:bg-slate-800'
                  >
                    {t('project.resetZoom')}
                  </button>
                ) : null
              }
            >
              <SessionChart
                chart={activeSession?.chart}
                timeBucket={activeSession?.timeBucket}
                timeFormat={timeFormat}
                rotateXAxis={rotateXAxis}
                dataNames={dataNames}
                onZoom={isTouchDevice ? undefined : setZoomedTimeRange}
                className='h-[190px] [&_svg]:overflow-visible!'
              />
            </PanelSection>
          ) : null}
        </div>
      </aside>
    </div>
  )
}
