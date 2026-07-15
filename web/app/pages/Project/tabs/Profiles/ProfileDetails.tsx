import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'
import _capitalize from 'lodash/capitalize'
import _isEmpty from 'lodash/isEmpty'
import {
  ArrowSquareOutIcon,
  CaretDownIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CursorClickIcon,
  DeviceMobileIcon,
  DeviceTabletIcon,
  FileTextIcon,
  GlobeIcon,
  MonitorIcon,
  SignInIcon,
  UserListIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { PROJECT_TABS } from '~/lib/constants'
import { ProfileDetails as ProfileDetailsType } from '~/lib/models/Project'
import { BackButton } from '~/pages/Project/View/components/BackButton'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import Button from '~/ui/Button'
import Flag from '~/ui/Flag'
import InfiniteScrollTrigger from '~/ui/InfiniteScrollTrigger'
import PulsatingCircle from '~/ui/icons/PulsatingCircle'
import Loader from '~/ui/Loader'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import {
  cn,
  getLocaleDisplayName,
  getStringFromTime,
  getTimeFromSeconds,
} from '~/utils/generic'
import countries from '~/utils/isoCountries'
import { getProfileDisplayName, ProfileAvatar } from '~/utils/profileAvatars'

import { BrowserIcon, OSIcon } from '../SharedIcons'
import { InfoRow, PanelSection } from '../components/DetailPanels'
import { Pageflow } from '../Sessions/Pageflow'

dayjs.extend(relativeTime)
dayjs.extend(utc)

const ONLINE_THRESHOLD_MINUTES = 5
const RECENTLY_ACTIVE_THRESHOLD_MINUTES = 30

type OnlineStatus = 'online' | 'recently_active' | 'offline'

interface PageflowItem {
  type: 'pageview' | 'event' | 'error' | 'sale' | 'subscription' | 'refund'
  value: string
  created: string
  metadata?: { key: string; value: string }[]
  amount?: number
  currency?: string
}

export interface ProfileSession {
  psid: string
  country: string | null
  os: string | null
  browser: string | null
  pageviews: number
  customEvents: number
  errors: number
  revenue?: number
  refunds?: number
  created?: string
  sessionStart?: string
  lastActivity?: string
  isLive?: 1 | 0 | boolean
  duration?: number | null
  pages?: PageflowItem[]
}

interface ProfileDetailsProps {
  details: ProfileDetailsType | null
  sessions: ProfileSession[]
  sessionsLoading: boolean | null
  timeFormat: '12-hour' | '24-hour'
  onLoadMoreSessions: () => void
  canLoadMoreSessions: boolean
  currency?: string
  websiteUrl?: string | null
  backLink?: string
  backButtonLabel?: string
}

interface ActivityDay {
  date: string
  pageviews: number
  events: number
}

interface PlatformPart {
  key: string
  label: string
  tooltip: string
  icon?: ReactNode
}

const getOnlineStatus = (lastSeen: string | undefined): OnlineStatus => {
  if (!lastSeen) return 'offline'

  const now = dayjs.utc()
  const lastSeenTime = dayjs.utc(lastSeen)
  const minutesAgo = now.diff(lastSeenTime, 'minute')

  if (minutesAgo < ONLINE_THRESHOLD_MINUTES) {
    return 'online'
  }

  if (minutesAgo < RECENTLY_ACTIVE_THRESHOLD_MINUTES) {
    return 'recently_active'
  }

  return 'offline'
}

const formatDateTime = (
  value: string | null | undefined,
  language: string,
  timeFormat: '12-hour' | '24-hour',
  timezone: string,
) => {
  if (!value) return null

  const date = dayjs.utc(value)
  if (!date.isValid()) return null

  return date.toDate().toLocaleDateString(language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: timeFormat === '12-hour' ? 'h12' : 'h23',
    timeZone: timezone,
  })
}

const formatVersionLabel = (name: string | null, version: string | null) => {
  if (!name) return null
  return `${name}${version ? ` ${version}` : ''}`
}

const getSessionDuration = (session: ProfileSession) => {
  if (session.duration != null) {
    return session.duration
  }

  const interactionPages = (session.pages || []).filter(
    ({ type }) =>
      type !== 'sale' && type !== 'subscription' && type !== 'refund',
  )
  if (interactionPages.length < 2) {
    return 0
  }

  const first = dayjs.utc(interactionPages[0].created)
  const last = dayjs.utc(interactionPages[interactionPages.length - 1].created)
  if (!first.isValid() || !last.isValid()) {
    return 0
  }

  return Math.max(0, last.diff(first, 'second'))
}

const isSessionLive = (value: ProfileSession['isLive']) =>
  value === true || value === 1

const ActivityCalendar = ({
  data,
}: {
  data: { date: string; pageviews: number; events: number }[]
}) => {
  const { t } = useTranslation('common')

  const dataMap = useMemo(() => {
    const map = new Map<string, { pageviews: number; events: number }>()
    data.forEach((item) =>
      map.set(item.date, { pageviews: item.pageviews, events: item.events }),
    )
    return map
  }, [data])

  const weeks = useMemo(() => {
    const result: ActivityDay[][] = []
    const now = dayjs()
    const startDate = now.subtract(4, 'month').startOf('week')
    const endDate = now.endOf('week')

    let currentWeek: ActivityDay[] = []
    let currentDay = startDate

    while (currentDay.isBefore(endDate) || currentDay.isSame(endDate, 'day')) {
      const dateStr = currentDay.format('YYYY-MM-DD')
      const dayData = dataMap.get(dateStr)
      currentWeek.push({
        date: dateStr,
        pageviews: dayData?.pageviews || 0,
        events: dayData?.events || 0,
      })
      if (currentWeek.length === 7) {
        result.push(currentWeek)
        currentWeek = []
      }
      currentDay = currentDay.add(1, 'day')
    }
    if (currentWeek.length > 0) result.push(currentWeek)
    return result
  }, [dataMap])

  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = []
    let lastMonth = ''
    weeks.forEach((week, weekIndex) => {
      const firstDay = dayjs(week[0].date)
      const month = firstDay.format('MMM')
      if (month !== lastMonth) {
        labels.push({ month, weekIndex })
        lastMonth = month
      }
    })
    return labels
  }, [weeks])

  const getColor = (pageviews: number, events: number) => {
    const total = pageviews + events
    if (total === 0) return 'bg-gray-100 dark:bg-slate-700/50'
    if (total <= 2) return 'bg-emerald-200 dark:bg-emerald-800'
    if (total <= 5) return 'bg-emerald-300 dark:bg-emerald-700'
    if (total <= 10) return 'bg-emerald-400 dark:bg-emerald-600'
    return 'bg-emerald-500'
  }

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  const TooltipContent = ({ day }: { day: ActivityDay }) => (
    <ul className='min-w-[120px]'>
      <Text
        as='li'
        size='xs'
        weight='semibold'
        colour='inherit'
        className='mb-1 border-b border-gray-200 pb-1 dark:border-slate-800'
      >
        {dayjs(day.date).format('ddd, MMM D, YYYY')}
      </Text>
      <Text
        as='li'
        size='xs'
        colour='inherit'
        className='flex items-center justify-between py-px leading-snug'
      >
        <Text as='span' size='xs' colour='inherit'>
          {t('dashboard.pageviews')}
        </Text>
        <Text as='span' size='xs' colour='inherit' className='ml-4 font-mono'>
          {day.pageviews}
        </Text>
      </Text>
      <Text
        as='li'
        size='xs'
        colour='inherit'
        className='flex items-center justify-between py-px leading-snug'
      >
        <Text as='span' size='xs' colour='inherit'>
          {t('dashboard.events')}
        </Text>
        <Text as='span' size='xs' colour='inherit' className='ml-4 font-mono'>
          {day.events}
        </Text>
      </Text>
    </ul>
  )

  return (
    <div
      className='grid w-full gap-[3px]'
      style={{
        gridTemplateColumns: `1rem repeat(${weeks.length}, minmax(0, 1fr))`,
      }}
    >
      <div />
      {weeks.map((week, weekIdx) => {
        const monthLabel = monthLabels.find((m) => m.weekIndex === weekIdx)
        return (
          <Text
            as='div'
            size='xxs'
            colour='muted'
            key={weekIdx}
            className='min-h-3 leading-none'
            style={{
              gridColumn: weekIdx + 2,
              gridRow: 1,
            }}
          >
            {monthLabel?.month}
          </Text>
        )
      })}

      {dayLabels.map((d, dayIdx) => (
        <Text
          as='div'
          size='xxs'
          colour='muted'
          key={dayIdx}
          className='flex h-full items-center justify-end pr-1 text-[9px] leading-none'
          style={{
            gridColumn: 1,
            gridRow: dayIdx + 2,
          }}
        >
          {dayIdx % 2 === 1 ? d : ''}
        </Text>
      ))}

      {weeks.map((week, weekIdx) =>
        week.map((day, dayIdx) => (
          <Tooltip
            asChild
            key={`${weekIdx}-${day.date}`}
            text={<TooltipContent day={day} />}
            contentVariant='chart'
            tooltipNode={
              <div
                className={cn(
                  'aspect-square w-full rounded-[2px] transition-opacity hover:opacity-80',
                  getColor(day.pageviews, day.events),
                )}
                style={{
                  gridColumn: weekIdx + 2,
                  gridRow: dayIdx + 2,
                }}
              />
            }
            delay={0}
            disableHoverableContent
          />
        )),
      )}
    </div>
  )
}

const DeviceIcon = ({ device }: { device: string | null }) => {
  const deviceLower = device?.toLowerCase() || ''
  if (deviceLower === 'mobile') return <DeviceMobileIcon className='h-4 w-4' />
  if (deviceLower === 'tablet') return <DeviceTabletIcon className='h-4 w-4' />
  return <MonitorIcon className='h-4 w-4' />
}

const SessionMetric = ({
  icon,
  label,
  value,
  colour = 'secondary',
}: {
  icon: ReactNode
  label: string
  value: number
  colour?: 'secondary' | 'error'
}) => (
  <Tooltip
    text={label}
    tooltipNode={
      <Text
        as='span'
        size='xs'
        colour={colour}
        weight='medium'
        className='flex items-center gap-1'
      >
        {icon}
        {value}
      </Text>
    }
  />
)

const ProfileSessionFlow = ({
  session,
  index,
  timeFormat,
  websiteUrl,
}: {
  session: ProfileSession
  index: number
  timeFormat: '12-hour' | '24-hour'
  websiteUrl?: string | null
}) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { projectPath } = useCurrentProject()
  const { timezone } = useViewProjectContext()
  const { theme } = useTheme()
  const [isExpanded, setIsExpanded] = useState(index === 0)

  const pages = session.pages || []
  const startedAt = session.sessionStart || session.created || null
  const duration = getSessionDuration(session)
  const durationLabel = getStringFromTime(getTimeFromSeconds(duration))
  const formattedStart =
    formatDateTime(startedAt, language, timeFormat, timezone) || '-'
  const sessionHref = `${projectPath}?tab=${PROJECT_TABS.sessions}&psid=${encodeURIComponent(session.psid)}`
  const live = isSessionLive(session.isLive)
  const platformParts: PlatformPart[] = [
    ...(session.os
      ? [
          {
            key: 'os',
            label: session.os,
            tooltip: session.os,
            icon: <OSIcon os={session.os} theme={theme} className='size-3.5' />,
          },
        ]
      : []),
    ...(session.browser
      ? [
          {
            key: 'browser',
            label: session.browser,
            tooltip: session.browser,
            icon: (
              <BrowserIcon browser={session.browser} className='size-3.5' />
            ),
          },
        ]
      : []),
  ]

  return (
    <article className='border-t border-gray-100 first:border-t-0 dark:border-slate-800/80'>
      <div className='flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
        <Button
          variant='ghost'
          size='sm'
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((value) => !value)}
          className='min-w-0 flex-1 justify-start gap-2 px-0 py-0 text-left hover:bg-transparent dark:hover:bg-transparent dark:hover:text-gray-300'
        >
          <CaretDownIcon
            className={cn(
              'size-4 shrink-0 text-gray-400 transition-transform duration-200 ease-out motion-reduce:transition-none dark:text-slate-500',
              isExpanded && 'rotate-180',
            )}
            aria-hidden
          />
          <span className='min-w-0 flex-1'>
            <span className='mb-0.5 flex min-w-0 flex-wrap items-center gap-1'>
              <Text
                as='span'
                size='sm'
                weight='semibold'
                colour='primary'
                truncate
                className='min-w-0'
              >
                {formattedStart}
              </Text>
              <Text as='span' size='xs' colour='secondary' className='shrink-0'>
                •
              </Text>
              <Text
                as='span'
                size='sm'
                weight='medium'
                colour='secondary'
                className='shrink-0'
              >
                {durationLabel}
              </Text>
              {live ? (
                <PulsatingCircle
                  className='relative ml-1 shrink-0'
                  type='small'
                />
              ) : null}
            </span>
            {platformParts.length > 0 ? (
              <span className='mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1'>
                {platformParts.map(({ key, label, tooltip, icon }) => (
                  <Text
                    key={key}
                    as='span'
                    size='xs'
                    colour='secondary'
                    weight='medium'
                    title={tooltip}
                    className='inline-flex min-w-0 items-center gap-1'
                  >
                    <span className='flex size-3.5 shrink-0 items-center justify-center'>
                      {icon}
                    </span>
                    <span className='min-w-0 truncate'>{label}</span>
                  </Text>
                ))}
              </span>
            ) : null}
          </span>
        </Button>

        <div className='flex shrink-0 flex-wrap items-center gap-3 pl-6 sm:pl-0'>
          <SessionMetric
            icon={<FileTextIcon className='size-3.5' />}
            label={t('dashboard.pageviews')}
            value={session.pageviews || 0}
          />
          <SessionMetric
            icon={<CursorClickIcon className='size-3.5' />}
            label={t('dashboard.events')}
            value={session.customEvents || 0}
          />
          {session.errors > 0 ? (
            <SessionMetric
              icon={<WarningIcon className='size-3.5' />}
              label={t('dashboard.errors')}
              value={session.errors}
              colour='error'
            />
          ) : null}
          <Tooltip
            asChild
            text={t('project.viewSession')}
            ariaLabel={t('project.viewSession')}
            tooltipNode={
              <Button
                to={sessionHref}
                variant='icon'
                aria-label={t('project.viewSession')}
                className='size-7 p-1.5'
              >
                <ArrowSquareOutIcon className='size-4' />
              </Button>
            }
            disableHoverableContent
          />
        </div>
      </div>

      {isExpanded ? (
        <div className='border-t border-gray-100 px-4 py-4 dark:border-slate-800/80'>
          {_isEmpty(pages) ? (
            <Text size='sm' colour='secondary' className='py-3 text-center'>
              {t('project.noSessionDetails')}
            </Text>
          ) : (
            <Pageflow
              pages={pages}
              timeFormat={timeFormat}
              sdur={duration}
              isLive={live}
              websiteUrl={websiteUrl}
            />
          )}
        </div>
      ) : null}
    </article>
  )
}

export const ProfileDetails = ({
  details,
  sessions,
  sessionsLoading,
  timeFormat,
  onLoadMoreSessions,
  canLoadMoreSessions,
  currency,
  websiteUrl,
  backLink,
  backButtonLabel,
}: ProfileDetailsProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { timezone } = useViewProjectContext()
  const { theme } = useTheme()

  const displayName = useMemo(() => {
    if (!details) return ''
    return getProfileDisplayName(details.profileId, details.isIdentified)
  }, [details])

  const onlineStatus = useMemo(
    () => getOnlineStatus(details?.lastSeen),
    [details?.lastSeen],
  )

  const lastSeenAgo = useMemo(
    () => (details?.lastSeen ? dayjs.utc(details.lastSeen).fromNow(true) : ''),
    [details?.lastSeen],
  )

  if (!details) return <Loader />

  const avgDurationStr = details.avgDuration
    ? getStringFromTime(getTimeFromSeconds(details.avgDuration))
    : '-'
  const revenueCurrency = details.revenueCurrency || currency || 'USD'
  const firstSeen =
    formatDateTime(details.firstSeen, language, timeFormat, timezone) || '-'
  const lastSeen =
    formatDateTime(details.lastSeen, language, timeFormat, timezone) || '-'
  const statusTooltip = details.lastSeen
    ? t('project.lastSeenAgo', { time: lastSeenAgo })
    : t('project.unknown')
  const countryName = details.country
    ? countries.getName(details.country, language) || details.country
    : null
  const locationSummary =
    [countryName, details.region, details.city].filter(Boolean).join(', ') ||
    t('project.unknown')
  const osTooltipLabel = formatVersionLabel(details.os, details.os_version)
  const browserTooltipLabel = formatVersionLabel(
    details.browser,
    details.browser_version,
  )
  const profilePlatformParts: PlatformPart[] = [
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
    ...(details.browser
      ? [
          {
            key: 'browser',
            label: details.browser,
            tooltip: browserTooltipLabel || details.browser,
            icon: <BrowserIcon browser={details.browser} className='size-4' />,
          },
        ]
      : []),
  ]
  const visibleProfilePlatformParts =
    profilePlatformParts.length > 0
      ? profilePlatformParts
      : [
          {
            key: 'unknown',
            label: t('project.unknown'),
            tooltip: t('project.unknown'),
          },
        ]

  const statusNode = (
    <Tooltip
      asChild
      text={
        <Text size='xs' colour='inherit'>
          {statusTooltip}
        </Text>
      }
      ariaLabel={statusTooltip}
      tooltipNode={
        <Text
          as='button'
          type='button'
          colour='secondary'
          className='inline-flex h-6 w-6 shrink-0 cursor-default items-center justify-center rounded-md bg-transparent p-0 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-300'
        >
          <span
            className={cn(
              'block rounded-full ring-2 ring-white dark:ring-slate-900',
              onlineStatus === 'online' && 'h-2.5 w-2.5 bg-green-500',
              onlineStatus === 'recently_active' && 'h-2.5 w-2.5 bg-yellow-500',
              onlineStatus === 'offline' &&
                'h-2 w-2 border-2 border-gray-300 dark:border-slate-600',
            )}
          />
        </Text>
      }
      disableHoverableContent
    />
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
        <section className='min-w-0 rounded-lg border border-gray-200 bg-white py-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
          <div className='mb-3 flex items-center justify-between gap-3 px-4'>
            <Text
              as='h3'
              size='xs'
              weight='semibold'
              tracking='wide'
              className='uppercase'
            >
              {t('project.userSessions')}
            </Text>
            {sessionsLoading && !_isEmpty(sessions) ? (
              <Text size='xs' colour='secondary'>
                {t('common.loading')}
              </Text>
            ) : null}
          </div>

          {sessionsLoading && sessions.length === 0 ? (
            <div className='py-8'>
              <Loader />
            </div>
          ) : sessions.length === 0 ? (
            <Text
              size='sm'
              colour='secondary'
              className='px-4 py-4 text-center'
            >
              {t('project.noSessions')}
            </Text>
          ) : (
            <>
              <div>
                {sessions.map((session, index) => (
                  <ProfileSessionFlow
                    key={session.psid}
                    session={session}
                    index={index}
                    timeFormat={timeFormat}
                    websiteUrl={websiteUrl}
                  />
                ))}
              </div>
              <InfiniteScrollTrigger
                hasMore={canLoadMoreSessions}
                isLoading={!!sessionsLoading}
                onLoadMore={onLoadMoreSessions}
                disabled={!!sessionsLoading}
                className='mt-2'
              />
            </>
          )}
        </section>
      </div>

      <aside className='order-2 mb-1 lg:sticky lg:top-14 lg:mb-0 lg:self-start'>
        <div className='space-y-3 rounded-lg border border-gray-200 bg-white px-4 py-4 lg:min-h-[calc(100dvh-3.5rem)] dark:border-slate-800/60 dark:bg-slate-900/25'>
          <div className='pb-1'>
            <div className='flex items-start gap-3'>
              <div className='relative mt-2 shrink-0'>
                <ProfileAvatar profileId={details.profileId} size={42} />
              </div>
              <div className='min-w-0 flex-1'>
                <div className='mb-0.5 flex min-w-0 items-center gap-2'>
                  <Text
                    as='h2'
                    size='lg'
                    weight='bold'
                    colour='primary'
                    truncate
                    className='min-w-0'
                  >
                    {displayName}
                  </Text>
                  {statusNode}
                </div>
                <Text
                  size='xs'
                  colour='secondary'
                  code
                  truncate
                  className='block min-w-0'
                >
                  {details.profileId}
                </Text>

                <div className='mt-2 space-y-1'>
                  <div className='flex items-center gap-1'>
                    <Text
                      as='span'
                      colour='primary'
                      className='flex h-6 items-center justify-center'
                    >
                      {details.country ? (
                        <Flag
                          className='rounded-xs'
                          country={details.country}
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
                    {visibleProfilePlatformParts.map(
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
            </div>
          </div>

          <PanelSection title={t('common.details')}>
            <div>
              <InfoRow
                label={t('project.firstSeen')}
                value={
                  <>
                    <SignInIcon className='h-4 w-4' />
                    {firstSeen}
                  </>
                }
              />
              <InfoRow
                label={t('project.lastSeen')}
                value={
                  <>
                    <SignInIcon className='h-4 w-4 rotate-180' />
                    {lastSeen}
                  </>
                }
              />
              <InfoRow
                label={t('project.avgDuration')}
                value={
                  <>
                    <ClockIcon className='h-4 w-4' />
                    {avgDurationStr}
                  </>
                }
              />
              <InfoRow
                label={t('project.sessions')}
                value={
                  <>
                    <UserListIcon className='h-4 w-4' />
                    {details.sessionsCount || 0}
                  </>
                }
              />
              <InfoRow
                label={t('dashboard.pageviews')}
                value={
                  <>
                    <FileTextIcon className='h-4 w-4' />
                    {details.pageviewsCount || 0}
                  </>
                }
              />
              <InfoRow
                label={t('dashboard.events')}
                value={
                  <>
                    <CursorClickIcon className='h-4 w-4' />
                    {details.eventsCount || 0}
                  </>
                }
              />
              <InfoRow
                label={t('dashboard.errors')}
                value={
                  <>
                    <WarningIcon className='h-4 w-4 text-red-500' />
                    {details.errorsCount || 0}
                  </>
                }
              />
              {details.totalRevenue !== undefined &&
              details.totalRevenue > 0 ? (
                <InfoRow
                  label={t('dashboard.revenue')}
                  value={
                    <>
                      <CurrencyDollarIcon className='h-4 w-4 text-emerald-500' />
                      {new Intl.NumberFormat(language || 'en-US', {
                        style: 'currency',
                        currency: revenueCurrency,
                        minimumFractionDigits: 2,
                      }).format(details.totalRevenue)}
                    </>
                  }
                />
              ) : null}
            </div>
          </PanelSection>

          <PanelSection title={t('project.locationAndDevice')}>
            <div>
              <InfoRow
                label={t('project.mapping.lc')}
                value={
                  details.locale
                    ? getLocaleDisplayName(details.locale, language)
                    : '-'
                }
              />
              <InfoRow
                label={t('project.mapping.dv')}
                value={
                  details.device ? (
                    <>
                      <DeviceIcon device={details.device} />
                      {_capitalize(details.device)}
                    </>
                  ) : (
                    '-'
                  )
                }
              />
            </div>
          </PanelSection>

          <PanelSection title={t('project.activityCalendar')}>
            <ActivityCalendar data={details.activityCalendar || []} />
          </PanelSection>
        </div>
      </aside>
    </div>
  )
}
