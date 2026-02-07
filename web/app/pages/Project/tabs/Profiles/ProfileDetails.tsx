import cx from 'clsx'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import _capitalize from 'lodash/capitalize'
import _isEmpty from 'lodash/isEmpty'
import {
  ClockIcon,
  CalendarDotsIcon,
  FileTextIcon,
  MonitorIcon,
  DeviceMobileIcon,
  DeviceTabletIcon,
  GlobeIcon,
  CurrencyDollarIcon,
  UserListIcon,
  CursorClickIcon,
} from '@phosphor-icons/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import {
  BROWSER_LOGO_MAP,
  OS_LOGO_MAP,
  OS_LOGO_MAP_DARK,
} from '~/lib/constants'
import {
  ProfileDetails as ProfileDetailsType,
  Session,
} from '~/lib/models/Project'
import { useTheme } from '~/providers/ThemeProvider'
import Button from '~/ui/Button'
import Loader from '~/ui/Loader'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import {
  cn,
  getLocaleDisplayName,
  getStringFromTime,
  getTimeFromSeconds,
} from '~/utils/generic'
import { getProfileDisplayName, ProfileAvatar } from '~/utils/profileAvatars'

import CCRow from '../../View/components/CCRow'
import { SessionChart } from '../Sessions/SessionChart'
import { Sessions } from '../Sessions/Sessions'

dayjs.extend(relativeTime)

const ONLINE_THRESHOLD_MINUTES = 5
const RECENTLY_ACTIVE_THRESHOLD_MINUTES = 30

type OnlineStatus = 'online' | 'recently_active' | 'offline'

const getOnlineStatus = (lastSeen: string | undefined): OnlineStatus => {
  if (!lastSeen) return 'offline'

  const now = dayjs()
  const lastSeenTime = dayjs(lastSeen)
  const minutesAgo = now.diff(lastSeenTime, 'minute')

  if (minutesAgo < ONLINE_THRESHOLD_MINUTES) {
    return 'online'
  }

  if (minutesAgo < RECENTLY_ACTIVE_THRESHOLD_MINUTES) {
    return 'recently_active'
  }

  return 'offline'
}

interface ProfileDetailsProps {
  details: ProfileDetailsType | null
  sessions: Session[]
  sessionsLoading: boolean | null
  timeFormat: '12-hour' | '24-hour'
  onLoadMoreSessions: () => void
  canLoadMoreSessions: boolean
  currency?: string
}

interface ActivityDay {
  date: string
  pageviews: number
  events: number
}

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
    <ul className='min-w-[120px] text-xs'>
      <li className='mb-1 border-b border-gray-200 pb-1 font-semibold dark:border-slate-600'>
        {dayjs(day.date).format('MMM D, YYYY')}
      </li>
      <li className='flex items-center justify-between py-px leading-snug'>
        <div className='flex items-center'>
          <span>{t('dashboard.pageviews')}</span>
        </div>
        <span className='ml-4 font-mono'>{day.pageviews}</span>
      </li>
      <li className='flex items-center justify-between py-px leading-snug'>
        <div className='flex items-center'>
          <span>{t('dashboard.events')}</span>
        </div>
        <span className='ml-4 font-mono'>{day.events}</span>
      </li>
    </ul>
  )

  return (
    <div className='w-full'>
      <div className='mb-1 flex gap-[3px] pl-4'>
        {weeks.map((week, weekIdx) => {
          const monthLabel = monthLabels.find((m) => m.weekIndex === weekIdx)
          return (
            <div
              key={weekIdx}
              className='flex-1 text-[10px] leading-none text-gray-400 dark:text-gray-500'
            >
              {monthLabel?.month}
            </div>
          )
        })}
      </div>
      <div className='flex gap-[3px]'>
        <div className='flex w-3 shrink-0 flex-col gap-[3px] text-[9px] leading-none text-gray-400 dark:text-gray-500'>
          {dayLabels.map((d, i) => (
            <div
              key={i}
              className='flex aspect-square items-center justify-end'
            >
              {i % 2 === 1 ? d : ''}
            </div>
          ))}
        </div>
        <div className='flex flex-1 gap-[3px]'>
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className='flex flex-1 flex-col gap-[3px]'>
              {week.map((day, dayIdx) => (
                <Tooltip
                  key={dayIdx}
                  text={<TooltipContent day={day} />}
                  tooltipNode={
                    <div
                      className={cn(
                        'aspect-square w-full rounded-[2px] transition-opacity hover:opacity-80',
                        getColor(day.pageviews, day.events),
                      )}
                    />
                  }
                  delay={100}
                  disableHoverableContent
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const StatItem = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) => (
  <div>
    <Text
      size='xxs'
      weight='medium'
      colour='muted'
      className='mb-0.5 flex items-center gap-1.5 uppercase'
    >
      {icon}
      {label}
    </Text>
    <Text size='lg' weight='semibold' colour='primary'>
      {value}
    </Text>
  </div>
)

const InfoRow = ({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) => (
  <div className='flex items-center justify-between border-b border-gray-100 py-2 last:border-0 dark:border-slate-700/50'>
    <Text size='sm' colour='muted'>
      {label}
    </Text>
    <Text
      size='sm'
      weight='medium'
      colour='primary'
      className='flex items-center gap-1'
    >
      {value}
    </Text>
  </div>
)

const DeviceIcon = ({ device }: { device: string | null }) => {
  const deviceLower = device?.toLowerCase() || ''
  if (deviceLower === 'mobile') return <DeviceMobileIcon className='h-4 w-4' />
  if (deviceLower === 'tablet') return <DeviceTabletIcon className='h-4 w-4' />
  return <MonitorIcon className='h-4 w-4' />
}

const BrowserIcon = ({ browser }: { browser: string | null }) => {
  if (!browser) return <GlobeIcon className='h-4 w-4' />

  const logoUrl = BROWSER_LOGO_MAP[browser as keyof typeof BROWSER_LOGO_MAP]

  if (!logoUrl) return <GlobeIcon className='h-4 w-4' />

  return <img src={logoUrl} className='h-4 w-4' alt='' />
}

const OSIcon = ({ os, theme }: { os: string | null; theme: string }) => {
  if (!os) return <GlobeIcon className='h-4 w-4' />

  const logoUrlLight = OS_LOGO_MAP[os as keyof typeof OS_LOGO_MAP]
  const logoUrlDark = OS_LOGO_MAP_DARK[os as keyof typeof OS_LOGO_MAP_DARK]

  let logoUrl = theme === 'dark' ? logoUrlDark : logoUrlLight
  logoUrl ||= logoUrlLight

  if (!logoUrl) return <GlobeIcon className='h-4 w-4' />

  return <img src={logoUrl} className='h-4 w-4' alt='' />
}

export const ProfileDetails = ({
  details,
  sessions,
  sessionsLoading,
  timeFormat,
  onLoadMoreSessions,
  canLoadMoreSessions,
  currency,
}: ProfileDetailsProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
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
    () => (details?.lastSeen ? dayjs(details.lastSeen).fromNow() : ''),
    [details?.lastSeen],
  )

  const formatDate = (date: string | undefined) => {
    if (!date) return '-'
    return dayjs(date).format('MMM D, YYYY')
  }

  const dataNames = useMemo(
    () => ({
      pageviews: t('dashboard.pageviews'),
      customEvents: t('dashboard.events'),
      errors: t('dashboard.errors'),
    }),
    [t],
  )

  if (!details) return <Loader />

  const avgDurationStr = details.avgDuration
    ? getStringFromTime(getTimeFromSeconds(details.avgDuration))
    : '-'

  return (
    <div className='flex flex-col gap-3 lg:flex-row'>
      <div className='space-y-3 lg:w-[380px]'>
        <div className='rounded-lg border border-gray-200 bg-white p-5 dark:border-slate-800/60 dark:bg-slate-900/25'>
          <div className='flex items-center gap-4'>
            <div className='relative shrink-0'>
              <ProfileAvatar profileId={details.profileId} size={42} />
              {onlineStatus !== 'offline' && (
                <Tooltip
                  text={t('project.lastSeenAgo', { time: lastSeenAgo })}
                  className='absolute -right-0.5 -bottom-0.5'
                  tooltipNode={
                    <span
                      className={cx(
                        'block h-3 w-3 rounded-full ring-2 ring-white dark:ring-slate-800',
                        onlineStatus === 'online' && 'bg-green-500',
                        onlineStatus === 'recently_active' && 'bg-yellow-500',
                      )}
                    />
                  }
                />
              )}
            </div>
            <div className='flex flex-col gap-0.5'>
              <Text size='base' weight='bold' colour='primary'>
                {displayName}
              </Text>
              <Text size='xs' colour='muted' code>
                {details.profileId}
              </Text>
            </div>
          </div>
          <div className='mt-5 grid grid-cols-2 gap-x-4 gap-y-5'>
            <StatItem
              icon={<UserListIcon className='h-3.5 w-3.5' />}
              label={t('project.sessions')}
              value={details.sessionsCount || 0}
            />
            <StatItem
              icon={<FileTextIcon className='h-3.5 w-3.5' />}
              label={t('dashboard.pageviews')}
              value={details.pageviewsCount || 0}
            />
            <StatItem
              icon={<CursorClickIcon className='h-3.5 w-3.5' />}
              label={t('dashboard.events')}
              value={details.eventsCount || 0}
            />
            <StatItem
              icon={<ClockIcon className='h-3.5 w-3.5' />}
              label={t('project.avgDuration')}
              value={avgDurationStr}
            />
            <StatItem
              icon={<CalendarDotsIcon className='h-3.5 w-3.5' />}
              label={t('project.firstSeen')}
              value={formatDate(details.firstSeen)}
            />
            <StatItem
              icon={<CalendarDotsIcon className='h-3.5 w-3.5' />}
              label={t('project.lastSeen')}
              value={formatDate(details.lastSeen)}
            />
            {details.totalRevenue !== undefined && details.totalRevenue > 0 ? (
              <StatItem
                icon={
                  <CurrencyDollarIcon className='h-3.5 w-3.5 text-emerald-500' />
                }
                label={t('dashboard.revenue')}
                value={new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: details.revenueCurrency || 'USD',
                  minimumFractionDigits: 2,
                }).format(details.totalRevenue)}
              />
            ) : null}
          </div>
        </div>

        <div className='rounded-lg border border-gray-200 bg-white p-5 dark:border-slate-800/60 dark:bg-slate-900/25'>
          <Text
            as='h3'
            size='xs'
            weight='semibold'
            colour='primary'
            className='mb-3 uppercase'
            tracking='wide'
          >
            {t('project.locationAndDevice')}
          </Text>
          <div>
            <InfoRow
              label={t('project.mapping.cc')}
              value={
                details.cc ? (
                  <CCRow size={16} cc={details.cc} language={language} />
                ) : (
                  '-'
                )
              }
            />
            {details.rg ? (
              <InfoRow label={t('project.mapping.rg')} value={details.rg} />
            ) : null}
            <InfoRow
              label={t('project.mapping.lc')}
              value={
                details.lc ? getLocaleDisplayName(details.lc, language) : '-'
              }
            />
            <InfoRow
              label={t('project.mapping.dv')}
              value={
                details.dv ? (
                  <>
                    <DeviceIcon device={details.dv} />
                    {_capitalize(details.dv)}
                  </>
                ) : (
                  '-'
                )
              }
            />
            <InfoRow
              label={t('project.mapping.br')}
              value={
                details.br ? (
                  <>
                    <BrowserIcon browser={details.br} />
                    {details.br}
                    {details.brv ? ` v${details.brv}` : ''}
                  </>
                ) : (
                  '-'
                )
              }
            />
            <InfoRow
              label={t('project.mapping.os')}
              value={
                details.os ? (
                  <>
                    <OSIcon os={details.os} theme={theme} />
                    {details.os}
                    {details.osv ? ` v${details.osv}` : ''}
                  </>
                ) : (
                  '-'
                )
              }
            />
          </div>
        </div>

        <div className='rounded-lg border border-gray-200 bg-white p-5 dark:border-slate-800/60 dark:bg-slate-900/25'>
          <Text
            as='h3'
            size='xs'
            weight='semibold'
            colour='primary'
            className='mb-3 uppercase'
            tracking='wide'
          >
            {t('project.activityCalendar')}
          </Text>
          <ActivityCalendar data={details.activityCalendar || []} />
        </div>
      </div>

      <div className='flex-1 space-y-3'>
        {details.chart && !_isEmpty(details.chart.x) ? (
          <div className='rounded-lg border border-gray-200 bg-white p-5 dark:border-slate-800/60 dark:bg-slate-900/25'>
            <Text
              as='h3'
              size='xs'
              weight='semibold'
              colour='primary'
              className='mb-3 uppercase'
              tracking='wide'
            >
              {t('dashboard.pageviews')}
            </Text>
            <SessionChart
              chart={details.chart}
              timeBucket={details.timeBucket}
              timeFormat={timeFormat}
              rotateXAxis={false}
              dataNames={dataNames}
              className='h-[300px] [&_svg]:overflow-visible!'
            />
          </div>
        ) : null}

        <div className='rounded-lg border border-gray-200 bg-white p-5 dark:border-slate-800/60 dark:bg-slate-900/25'>
          <Text
            as='h3'
            size='xs'
            weight='semibold'
            colour='primary'
            className='mb-3 uppercase'
            tracking='wide'
          >
            {t('project.userSessions')}
          </Text>
          {sessionsLoading && sessions.length === 0 ? (
            <Loader />
          ) : sessions.length === 0 ? (
            <Text size='sm' colour='muted' className='py-4 text-center'>
              {t('project.noSessions')}
            </Text>
          ) : (
            <>
              <Sessions
                sessions={sessions}
                timeFormat={timeFormat}
                hideNewReturnBadge
                hideUserDetails
                currency={currency}
              />
              {canLoadMoreSessions ? (
                <Button
                  onClick={onLoadMoreSessions}
                  disabled={!!sessionsLoading}
                  loading={!!sessionsLoading}
                  className='mt-4 w-full'
                  primary
                  regular
                >
                  {t('project.loadMore')}
                </Button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
