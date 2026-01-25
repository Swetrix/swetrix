import dayjs from 'dayjs'
import _capitalize from 'lodash/capitalize'
import _isEmpty from 'lodash/isEmpty'
import {
  EyeIcon,
  SparklesIcon,
  ClockIcon,
  CalendarIcon,
  FileTextIcon,
  MonitorIcon,
  SmartphoneIcon,
  TabletIcon,
  GlobeIcon,
  DollarSignIcon,
} from 'lucide-react'
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
      <li className='mb-1 border-b border-gray-200 pb-1 font-semibold dark:border-gray-600'>
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
      <div
        className='mb-1 flex w-full gap-[2px]'
        style={{ paddingLeft: '18px' }}
      >
        {weeks.map((_, weekIdx) => (
          <div
            key={weekIdx}
            className='relative flex-1 text-[10px] text-gray-400'
          >
            {monthLabels.find((m) => m.weekIndex === weekIdx)?.month}
          </div>
        ))}
      </div>
      <div className='flex w-full gap-[2px]'>
        <div className='flex shrink-0 flex-col gap-[2px] pr-1 text-[9px] text-gray-400'>
          {dayLabels.map((d, i) => (
            <div key={i} className='flex h-3 w-3 items-center justify-end'>
              {i % 2 === 1 ? d : ''}
            </div>
          ))}
        </div>
        <div className='flex flex-1 gap-[2px]'>
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className='flex flex-1 flex-col gap-[2px]'>
              {week.map((day, dayIdx) => (
                <Tooltip
                  key={dayIdx}
                  text={<TooltipContent day={day} />}
                  tooltipNode={
                    <div
                      className={cn(
                        'h-3 w-full rounded-[2px]',
                        getColor(day.pageviews, day.events),
                      )}
                    />
                  }
                  delay={0}
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
  if (deviceLower === 'mobile') return <SmartphoneIcon className='h-4 w-4' />
  if (deviceLower === 'tablet') return <TabletIcon className='h-4 w-4' />
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

  const formatDate = (date: string | undefined) => {
    if (!date) return 'N/A'
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
    : 'N/A'

  return (
    <div className='flex flex-col gap-3 lg:flex-row'>
      <div className='space-y-3 lg:w-[380px]'>
        <div className='rounded-lg border border-gray-300 bg-white px-4 py-5 dark:border-slate-800/60 dark:bg-slate-800/25'>
          <div className='flex items-center gap-4'>
            <ProfileAvatar
              className='-mr-0.75 -mb-0.75'
              profileId={details.profileId}
              size={42}
            />
            <div className='flex flex-col gap-0.5'>
              <Text size='base' weight='bold' colour='primary'>
                {displayName}
              </Text>
              <Text size='xs' colour='muted' code>
                {details.profileId}
              </Text>
            </div>
          </div>
          <div className='mt-4 grid grid-cols-2 gap-y-5'>
            <StatItem
              icon={<FileTextIcon className='h-3.5 w-3.5' />}
              label={t('project.sessions')}
              value={details.sessionsCount || 0}
            />
            <StatItem
              icon={<EyeIcon className='h-3.5 w-3.5' />}
              label={t('dashboard.pageviews')}
              value={details.pageviewsCount || 0}
            />
            <StatItem
              icon={<SparklesIcon className='h-3.5 w-3.5' />}
              label={t('dashboard.events')}
              value={details.eventsCount || 0}
            />
            <StatItem
              icon={<ClockIcon className='h-3.5 w-3.5' />}
              label={t('project.avgDuration')}
              value={avgDurationStr}
            />
            <StatItem
              icon={<CalendarIcon className='h-3.5 w-3.5' />}
              label={t('project.firstSeen')}
              value={formatDate(details.firstSeen)}
            />
            <StatItem
              icon={<CalendarIcon className='h-3.5 w-3.5' />}
              label={t('project.lastSeen')}
              value={formatDate(details.lastSeen)}
            />
            {details.totalRevenue !== undefined && details.totalRevenue > 0 ? (
              <StatItem
                icon={<DollarSignIcon className='h-3.5 w-3.5 text-green-500' />}
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

        <div className='rounded-lg border border-gray-300 bg-white px-4 py-5 dark:border-slate-800/60 dark:bg-slate-800/25'>
          <Text
            as='h3'
            size='xs'
            weight='semibold'
            colour='primary'
            className='mb-2 uppercase'
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

        <div className='rounded-lg border border-gray-300 bg-white px-4 py-5 dark:border-slate-800/60 dark:bg-slate-800/25'>
          <Text
            as='h3'
            size='xs'
            weight='semibold'
            colour='primary'
            className='mb-2 uppercase'
            tracking='wide'
          >
            {t('project.activityCalendar')}
          </Text>
          <ActivityCalendar data={details.activityCalendar || []} />
        </div>
      </div>

      <div className='flex-1 space-y-3'>
        {details.chart && !_isEmpty(details.chart.x) ? (
          <div className='max-h-max rounded-lg border border-gray-300 bg-white px-4 py-5 dark:border-slate-800/60 dark:bg-slate-800/25'>
            <Text
              as='h3'
              size='xs'
              weight='semibold'
              colour='primary'
              className='mb-2 uppercase'
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

        <div className='rounded-lg border border-gray-300 bg-white px-4 py-5 dark:border-slate-800/60 dark:bg-slate-800/25'>
          <Text
            as='h3'
            size='xs'
            weight='semibold'
            colour='primary'
            className='mb-2 uppercase'
            tracking='wide'
          >
            {t('project.userSessions')}
          </Text>
          {sessionsLoading && sessions.length === 0 ? (
            <Loader />
          ) : sessions.length === 0 ? (
            <p className='py-4 text-center text-sm text-gray-400'>
              {t('project.noSessions')}
            </p>
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
