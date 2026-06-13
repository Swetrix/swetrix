import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _truncate from 'lodash/truncate'
import {
  GlobeIcon,
  ClockIcon,
  LinkIcon,
  PlayIcon,
  UserIcon,
  SignInIcon,
} from '@phosphor-icons/react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '~/ui/Link'

import { BrowserIcon, OSIcon } from '../SharedIcons'
import { InfoRow, PanelSection } from '../components/DetailPanels'
import { PROJECT_TABS } from '~/lib/constants'
import {
  SessionDetails as SessionDetailsType,
  SessionReplayMetadata,
} from '~/lib/models/Project'
import { BackButton } from '~/pages/Project/View/components/BackButton'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import Button from '~/ui/Button'
import PulsatingCircle from '~/ui/icons/PulsatingCircle'
import Loader from '~/ui/Loader'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import {
  getLocaleDisplayName,
  getStringFromTime,
  getTimeFromSeconds,
} from '~/utils/generic'

import Flag from '~/ui/Flag'
import countries from '~/utils/isoCountries'

import NoSessionDetails from './NoSessionDetails'
import { Pageflow, type PageflowEvent } from './Pageflow'
import { SessionChart } from './SessionChart'

dayjs.extend(utc)

const SessionReplayModal = lazy(() => import('./SessionReplayModal'))

interface SessionDetailViewProps {
  activeSession: {
    details: SessionDetailsType
    chart?: {
      x: string[]
      pageviews?: number[]
      customEvents?: number[]
      errors?: number[]
    }
    pages?: PageflowEvent[]
    timeBucket?: string
    sessionStart?: string
    lastActivity?: string
    replay?: SessionReplayMetadata | null
  } | null
  sessionId?: string | null
  sessionLoading: boolean
  timeFormat: '12-hour' | '24-hour'
  rotateXAxis: boolean
  dataNames: Record<string, string>
  websiteUrl?: string | null
  backLink?: string
  backButtonLabel?: string
}

interface PlatformPart {
  key: string
  label: string
  tooltip: string
  icon?: React.ReactNode
}

const ONLINE_THRESHOLD_MINUTES = 5
const RECENTLY_ACTIVE_THRESHOLD_MINUTES = 30
const ONLINE_THRESHOLD_SECONDS = ONLINE_THRESHOLD_MINUTES * 60
const RECENTLY_ACTIVE_THRESHOLD_SECONDS = RECENTLY_ACTIVE_THRESHOLD_MINUTES * 60

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

const parseDateTime = (value: string | null | undefined) => {
  if (!value) return null

  const date = dayjs.utc(value)
  if (!date.isValid()) return null

  return date
}

const formatDateTime = (
  value: string | null | undefined,
  language: string,
  timeFormat: '12-hour' | '24-hour',
  timezone: string,
) => {
  const date = parseDateTime(value)
  if (!date) return null

  return date.toDate().toLocaleDateString(language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: timeFormat === '12-hour' ? 'h12' : 'h23',
    timeZone: timezone,
  })
}

const formatVersionLabel = (name: string | null, version: string | null) => {
  if (!name) return null
  return `${name}${version ? ` ${version}` : ''}`
}

const formatSessionId = (id: string | null | undefined) => {
  if (!id) return null
  if (id.length <= 13) return id
  return `${id.slice(0, 6)}...${id.slice(-5)}`
}

export const SessionDetailView = ({
  activeSession,
  sessionId,
  sessionLoading,
  timeFormat,
  rotateXAxis,
  dataNames,
  websiteUrl,
  backLink,
  backButtonLabel,
}: SessionDetailViewProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { id: projectId, projectPath } = useCurrentProject()
  const { timezone } = useViewProjectContext()
  const { theme } = useTheme()
  const [zoomedTimeRange, setZoomedTimeRange] = useState<[Date, Date] | null>(
    null,
  )
  const [isReplayOpen, setIsReplayOpen] = useState(false)
  const [isReplayDeleted, setIsReplayDeleted] = useState(false)

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
        const firstPageviewDate = parseDateTime(firstPageview.created)
        const lastPageviewDate = parseDateTime(lastPageview.created)
        const diffSeconds =
          firstPageviewDate && lastPageviewDate
            ? lastPageviewDate.diff(firstPageviewDate, 'seconds')
            : 0
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

  useEffect(() => {
    setIsReplayDeleted(false)
  }, [activeSession?.replay?.replayId, sessionId])

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
  const osTooltipLabel = formatVersionLabel(details.os, details.osv)
  const browserTooltipLabel = formatVersionLabel(details.br, details.brv)
  const platformParts: PlatformPart[] = [
    ...(details.os
      ? [
          {
            key: 'os',
            label: details.os,
            tooltip: osTooltipLabel || details.os,
            icon: <OSIcon os={details.os} theme={theme} className='size-4' />,
          },
        ]
      : []),
    ...(details.br
      ? [
          {
            key: 'browser',
            label: details.br,
            tooltip: browserTooltipLabel || details.br,
            icon: <BrowserIcon browser={details.br} className='size-4' />,
          },
        ]
      : []),
  ]
  const visiblePlatformParts =
    platformParts.length > 0
      ? platformParts
      : [
          {
            key: 'unknown',
            label: t('project.unknown'),
            tooltip: t('project.unknown'),
          },
        ]
  const compactSessionId = formatSessionId(sessionId)
  const firstEventAt = activeSession.pages?.[0]?.created
  const lastEventAt =
    activeSession.pages && activeSession.pages.length > 0
      ? activeSession.pages[activeSession.pages.length - 1].created
      : null
  const sessionStartAt = activeSession.sessionStart || firstEventAt
  const lastActivityAt =
    activeSession.lastActivity || lastEventAt || sessionStartAt || null
  const lastActivityDate = parseDateTime(lastActivityAt)
  const sessionStartDateTime = parseDateTime(sessionStartAt)
  const secondsSinceLastActivity = lastActivityDate
    ? Math.max(0, dayjs().diff(lastActivityDate, 'second'))
    : null
  const lastSeenTime =
    secondsSinceLastActivity !== null
      ? formatCompactElapsed(secondsSinceLastActivity)
      : null
  const sessionOnlineFor = sessionStartDateTime
    ? formatCompactElapsed(dayjs().diff(sessionStartDateTime, 'second'))
    : sessionDuration > 0
      ? formatCompactElapsed(sessionDuration)
      : null
  const lastSeenDate = formatDateTime(
    lastActivityAt,
    language,
    timeFormat,
    timezone,
  )
  const sessionStartDate = formatDateTime(
    sessionStartAt,
    language,
    timeFormat,
    timezone,
  )
  const sessionEndDate = details.isLive
    ? null
    : formatDateTime(lastActivityAt, language, timeFormat, timezone)
  const lastSeenLabel = lastSeenTime
    ? lastSeenTime === 'now'
      ? t('project.online')
      : t('project.lastSeenAgo', { time: lastSeenTime })
    : t('project.endOfSession')
  const isOnline =
    !details.isLive &&
    secondsSinceLastActivity !== null &&
    secondsSinceLastActivity < ONLINE_THRESHOLD_SECONDS
  const isRecentlyActive =
    !details.isLive &&
    secondsSinceLastActivity !== null &&
    secondsSinceLastActivity < RECENTLY_ACTIVE_THRESHOLD_SECONDS
  const statusTooltip = lastSeenDate
    ? t('project.lastSeenAt', { time: lastSeenDate })
    : details.isLive
      ? t('project.online')
      : t('project.endOfSession')
  const campaignRows = [
    { label: t('project.mapping.so'), value: details.so },
    { label: t('project.mapping.me'), value: details.me },
    { label: t('project.mapping.ca'), value: details.ca },
    { label: t('project.mapping.te'), value: details.te },
    { label: t('project.mapping.co'), value: details.co },
  ].filter(({ value }) => value)
  const durationText = details.isLive
    ? sessionOnlineFor || t('dashboard.live')
    : sessionDuration > 0
      ? getStringFromTime(getTimeFromSeconds(sessionDuration))
      : 'N/A'
  const durationTooltip = (
    <div className='grid min-w-48 gap-1.5'>
      <div className='grid grid-cols-[auto_minmax(0,1fr)] gap-4'>
        <Text className='flex items-center gap-1' size='xs' colour='inherit'>
          <SignInIcon className='size-3' />
          <span>{t('project.sessionStartedAt')}</span>
        </Text>
        <Text size='xs' colour='inherit' className='text-right'>
          {sessionStartDate || 'N/A'}
        </Text>
      </div>
      <div className='grid grid-cols-[auto_minmax(0,1fr)] gap-4'>
        <Text className='flex items-center gap-1' size='xs' colour='inherit'>
          <SignInIcon className='size-3 rotate-180' />
          <span>{t('project.sessionEndedAt')}</span>
        </Text>
        <Text size='xs' colour='inherit' className='text-right'>
          {details.isLive
            ? t('project.sessionInProgress')
            : sessionEndDate || 'N/A'}
        </Text>
      </div>
    </div>
  )
  const durationValue = (
    <Tooltip
      asChild
      text={durationTooltip}
      ariaLabel={t('dashboard.sessionDuration')}
      tooltipNode={
        <Text
          as='button'
          type='button'
          size='sm'
          weight='medium'
          colour='primary'
          className='inline-flex cursor-default items-center justify-end gap-1 rounded-sm bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-300'
        >
          <ClockIcon className='h-4 w-4' />
          {durationText}
        </Text>
      }
      disableHoverableContent
    />
  )
  const statusNode = (
    <Tooltip
      asChild
      text={
        <Text size='xs' colour='inherit'>
          {statusTooltip}
        </Text>
      }
      ariaLabel={lastSeenLabel}
      tooltipNode={
        <Text
          as='button'
          type='button'
          colour='muted'
          className='inline-flex h-6 w-6 shrink-0 cursor-default items-center justify-center rounded-md bg-transparent p-0 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-300'
        >
          {details.isLive ? (
            <PulsatingCircle className='relative' type='small' />
          ) : isOnline ? (
            <span className='block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900' />
          ) : isRecentlyActive ? (
            <span className='block h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900' />
          ) : (
            <span className='block h-2 w-2 rounded-full border-2 border-gray-300 dark:border-slate-600' />
          )}
        </Text>
      }
      disableHoverableContent
    />
  )
  const hasReplay = Boolean(
    activeSession.replay?.hasReplay && sessionId && !isReplayDeleted,
  )

  return (
    <div className='grid gap-x-3 gap-y-2 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start xl:grid-cols-[minmax(0,1fr)_390px]'>
      {backLink ? (
        <div className='order-1 lg:hidden'>
          <BackButton to={backLink} label={backButtonLabel} className='w-fit' />
        </div>
      ) : null}

      <div className='order-3 min-w-0 space-y-2 lg:order-1'>
        {backLink ? (
          <div className='hidden lg:block'>
            <BackButton
              to={backLink}
              label={backButtonLabel}
              className='w-fit'
            />
          </div>
        ) : null}
        <section className='min-w-0 rounded-lg border border-gray-200 bg-white px-4 py-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
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
      </div>

      <aside className='order-2 mb-1 lg:sticky lg:top-14 lg:mb-0 lg:self-start'>
        <div className='space-y-3 rounded-lg border border-gray-200 bg-white px-4 py-4 lg:min-h-[calc(100dvh-3.5rem)] dark:border-slate-800/60 dark:bg-slate-900/25'>
          <div className='pb-1'>
            <div className='min-w-0'>
              <div className='mb-1 flex min-w-0 items-center gap-2'>
                {compactSessionId ? (
                  <h2 className='min-w-0'>
                    <Tooltip
                      asChild
                      text={
                        <Text size='xs' colour='inherit'>
                          {sessionId}
                        </Text>
                      }
                      ariaLabel={sessionId || undefined}
                      tooltipNode={
                        <Text
                          as='button'
                          type='button'
                          size='lg'
                          weight='bold'
                          colour='primary'
                          truncate
                          className='block min-w-0 cursor-default rounded-sm bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-300'
                        >
                          {compactSessionId}
                        </Text>
                      }
                    />
                  </h2>
                ) : (
                  <Text
                    as='h2'
                    size='xl'
                    weight='bold'
                    colour='primary'
                    className='min-w-0'
                    truncate
                  >
                    {t('project.viewSession')}
                  </Text>
                )}
                {statusNode}
              </div>

              <div className='space-y-1'>
                <div className='flex items-center gap-1'>
                  <Text
                    as='span'
                    colour='primary'
                    className='flex h-6 items-center justify-center'
                  >
                    {details.cc ? (
                      <Flag
                        className='rounded-xs'
                        country={details.cc}
                        size={16}
                        alt=''
                        aria-hidden='true'
                      />
                    ) : (
                      <GlobeIcon className='size-4' />
                    )}
                  </Text>
                  <Text
                    as='span'
                    size='sm'
                    weight='medium'
                    colour='primary'
                    truncate
                    title={locationSummary}
                  >
                    {locationSummary}
                  </Text>
                </div>

                <div className='flex min-h-6 min-w-0 items-center'>
                  {visiblePlatformParts.map(
                    ({ key, label, tooltip, icon }, index) => (
                      <span
                        key={key}
                        className='flex min-w-0 items-center gap-1'
                      >
                        {index > 0 ? (
                          <Text
                            as='span'
                            size='sm'
                            weight='medium'
                            colour='primary'
                            className='shrink-0'
                          >
                            ,
                          </Text>
                        ) : null}
                        {icon ? (
                          <Tooltip
                            asChild
                            text={
                              <Text size='xs' colour='inherit'>
                                {tooltip}
                              </Text>
                            }
                            ariaLabel={tooltip}
                            tooltipNode={
                              <Text
                                as='button'
                                type='button'
                                size='sm'
                                weight='medium'
                                colour='primary'
                                truncate
                                className='inline-flex max-w-full min-w-0 cursor-default items-center gap-1 rounded-sm bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-300'
                              >
                                <span className='flex size-4 shrink-0 items-center justify-center'>
                                  {icon}
                                </span>
                                <span className='min-w-0 truncate'>
                                  {label}
                                </span>
                              </Text>
                            }
                            disableHoverableContent
                          />
                        ) : (
                          <Text
                            as='span'
                            size='sm'
                            weight='medium'
                            colour='primary'
                            truncate
                          >
                            {label}
                          </Text>
                        )}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>

            {details.profileId ? (
              <Link
                to={`${projectPath}?tab=${PROJECT_TABS.profiles}&profileId=${encodeURIComponent(details.profileId)}`}
                className='mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-1.5 text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800'
              >
                <UserIcon className='h-4 w-4' />
                <Text size='sm' weight='medium' colour='secondary'>
                  {t('project.goToProfile')}
                </Text>
              </Link>
            ) : null}

            {hasReplay ? (
              <Button
                type='button'
                className='mt-2 w-full justify-center gap-2'
                onClick={() => setIsReplayOpen(true)}
              >
                <PlayIcon className='size-4' />
                {t('project.watchReplay')}
              </Button>
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
                      text={
                        <Text size='xs' colour='inherit'>
                          {details.ref}
                        </Text>
                      }
                      tooltipNode={
                        <div className='flex min-w-0 items-center justify-end gap-1'>
                          <LinkIcon className='h-4 w-4 shrink-0' />
                          <span
                            className='truncate'
                            title={
                              _size(details.ref) > 34 ? details.ref : undefined
                            }
                          >
                            <Text
                              as='span'
                              size='sm'
                              weight='medium'
                              colour='inherit'
                              truncate
                            >
                              {_truncate(details.ref, { length: 34 })}
                            </Text>
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
                    className='rounded border border-gray-200 bg-white px-2 py-1 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 hover:dark:bg-slate-800'
                  >
                    <Text size='xs' colour='primary'>
                      {t('project.resetZoom')}
                    </Text>
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
                className='session-detail-chart h-[190px] [&_svg]:overflow-visible!'
              />
            </PanelSection>
          ) : null}
        </div>
      </aside>

      {hasReplay && sessionId ? (
        <Suspense fallback={null}>
          <SessionReplayModal
            isOpen={isReplayOpen}
            onClose={() => setIsReplayOpen(false)}
            projectId={projectId}
            psid={sessionId}
            replay={activeSession.replay}
            pages={activeSession.pages || []}
            timeFormat={timeFormat}
            onDeleted={() => {
              setIsReplayDeleted(true)
              setIsReplayOpen(false)
            }}
          />
        </Suspense>
      ) : null}
    </div>
  )
}
