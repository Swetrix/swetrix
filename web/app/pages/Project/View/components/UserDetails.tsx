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
} from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { BROWSER_LOGO_MAP, OS_LOGO_MAP, OS_LOGO_MAP_DARK } from '~/lib/constants'
import { ProfileDetails as ProfileDetailsType, Session } from '~/lib/models/Project'
import { useTheme } from '~/providers/ThemeProvider'
import Button from '~/ui/Button'
import Loader from '~/ui/Loader'
import Tooltip from '~/ui/Tooltip'
import { cn, getLocaleDisplayName, getStringFromTime, getTimeFromSeconds } from '~/utils/generic'
import { getProfileDisplayName, ProfileAvatar } from '~/utils/profileAvatars'

import CCRow from './CCRow'
import { SessionChart } from './SessionChart'
import { Sessions } from './Sessions'

interface UserDetailsProps {
  details: ProfileDetailsType | null
  sessions: Session[]
  sessionsLoading: boolean | null
  timeFormat: '12-hour' | '24-hour'
  chartType: string
  onLoadMoreSessions: () => void
  canLoadMoreSessions: boolean
}

// Activity Calendar Component
const ActivityCalendar = ({ data }: { data: { date: string; count: number }[] }) => {
  const { t } = useTranslation('common')

  const countMap = useMemo(() => {
    const map = new Map<string, number>()
    data.forEach((item) => map.set(item.date, item.count))
    return map
  }, [data])

  const weeks = useMemo(() => {
    const result: { date: string; count: number }[][] = []
    const now = dayjs()
    const startDate = now.subtract(4, 'month').startOf('week')
    const endDate = now.endOf('week')

    let currentWeek: { date: string; count: number }[] = []
    let currentDay = startDate

    while (currentDay.isBefore(endDate) || currentDay.isSame(endDate, 'day')) {
      const dateStr = currentDay.format('YYYY-MM-DD')
      currentWeek.push({ date: dateStr, count: countMap.get(dateStr) || 0 })
      if (currentWeek.length === 7) {
        result.push(currentWeek)
        currentWeek = []
      }
      currentDay = currentDay.add(1, 'day')
    }
    if (currentWeek.length > 0) result.push(currentWeek)
    return result
  }, [countMap])

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

  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-slate-700/50'
    if (count <= 2) return 'bg-emerald-200 dark:bg-emerald-800'
    if (count <= 5) return 'bg-emerald-300 dark:bg-emerald-700'
    if (count <= 10) return 'bg-emerald-400 dark:bg-emerald-600'
    return 'bg-emerald-500'
  }

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  const TooltipContent = ({ day }: { day: { date: string; count: number } }) => (
    <div className='text-center'>
      <div className='font-medium'>{dayjs(day.date).format('MMM D, YYYY')}</div>
      <div className='text-gray-300'>
        {day.count} {t('dashboard.pageviews').toLowerCase()}
      </div>
    </div>
  )

  return (
    <div className='w-full'>
      <div className='mb-1 flex w-full gap-[2px]' style={{ paddingLeft: '18px' }}>
        {weeks.map((_, weekIdx) => (
          <div key={weekIdx} className='relative flex-1 text-[10px] text-gray-400'>
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
                  tooltipNode={<div className={cn('h-3 w-full rounded-[2px]', getColor(day.count))} />}
                  delay={0}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Stat Item Component
const StatItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) => (
  <div>
    <div className='mb-0.5 flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-gray-600 uppercase dark:text-gray-400'>
      {icon}
      {label}
    </div>
    <div className='text-lg font-semibold text-gray-900 dark:text-white'>{value}</div>
  </div>
)

// Info Row Component for Location & Device
const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className='flex items-center justify-between border-b border-gray-100 py-2 last:border-0 dark:border-slate-700/50'>
    <span className='text-sm text-gray-600 dark:text-gray-400'>{label}</span>
    <span className='flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white'>{value}</span>
  </div>
)

// Device Icon Component
const DeviceIcon = ({ device }: { device: string | null }) => {
  const deviceLower = device?.toLowerCase() || ''
  if (deviceLower === 'mobile') return <SmartphoneIcon className='h-4 w-4' />
  if (deviceLower === 'tablet') return <TabletIcon className='h-4 w-4' />
  return <MonitorIcon className='h-4 w-4' />
}

// Browser Icon Component
const BrowserIcon = ({ browser }: { browser: string | null }) => {
  if (!browser) return <GlobeIcon className='h-4 w-4' />

  const logoUrl = BROWSER_LOGO_MAP[browser as keyof typeof BROWSER_LOGO_MAP]

  if (!logoUrl) return <GlobeIcon className='h-4 w-4' />

  return <img src={logoUrl} className='h-4 w-4' alt='' />
}

// OS Icon Component
const OSIcon = ({ os, theme }: { os: string | null; theme: string }) => {
  if (!os) return <GlobeIcon className='h-4 w-4' />

  const logoPathLight = OS_LOGO_MAP[os as keyof typeof OS_LOGO_MAP]
  const logoPathDark = OS_LOGO_MAP_DARK[os as keyof typeof OS_LOGO_MAP_DARK]

  let logoPath = theme === 'dark' ? logoPathDark : logoPathLight
  logoPath ||= logoPathLight

  if (!logoPath) return <GlobeIcon className='h-4 w-4' />

  return <img src={`/${logoPath}`} className='h-4 w-4' alt='' />
}

export const UserDetails = ({
  details,
  sessions,
  sessionsLoading,
  timeFormat,
  chartType,
  onLoadMoreSessions,
  canLoadMoreSessions,
}: UserDetailsProps) => {
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

  const avgDurationStr = details.avgDuration ? getStringFromTime(getTimeFromSeconds(details.avgDuration)) : 'N/A'

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center gap-4'>
        <ProfileAvatar profileId={details.profileId} size={56} className='shrink-0' />
        <div>
          <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>{displayName}</h2>
          <code className='text-sm text-gray-400'>{details.profileId}</code>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className='flex flex-col gap-5 lg:flex-row'>
        {/* Left Column - Stats & Location/Device & Activity Calendar */}
        <div className='space-y-4 lg:w-[380px]'>
          {/* Stats Card */}
          <div className='rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800'>
            <div className='grid grid-cols-2 gap-y-5'>
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
            </div>
          </div>

          {/* Location & Device Card */}
          <div className='rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800'>
            <h3 className='mb-3 text-xs font-semibold tracking-wide text-gray-900 uppercase dark:text-gray-50'>
              {t('project.locationAndDevice')}
            </h3>
            <div>
              <InfoRow
                label={t('project.mapping.cc')}
                value={details.cc ? <CCRow size={16} cc={details.cc} language={language} /> : '-'}
              />
              {details.rg ? <InfoRow label={t('project.mapping.rg')} value={details.rg} /> : null}
              <InfoRow
                label={t('project.mapping.lc')}
                value={details.lc ? getLocaleDisplayName(details.lc, language) : '-'}
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

          {/* Activity Calendar Card */}
          <div className='rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800'>
            <h3 className='mb-3 text-xs font-semibold tracking-wide text-gray-900 uppercase dark:text-gray-50'>
              {t('project.activityCalendar')}
            </h3>
            <ActivityCalendar data={details.activityCalendar || []} />
          </div>
        </div>

        {/* Right Column - Chart & Sessions */}
        <div className='flex-1 space-y-4'>
          {details.chart && !_isEmpty(details.chart.x) ? (
            <div className='max-h-max rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800'>
              <h3 className='mb-3 text-xs font-semibold tracking-wide text-gray-900 uppercase dark:text-gray-50'>
                {t('dashboard.pageviews')}
              </h3>
              <SessionChart
                chart={details.chart}
                timeBucket={details.timeBucket}
                timeFormat={timeFormat}
                rotateXAxis={false}
                chartType={chartType}
                dataNames={dataNames}
                className='h-[300px] [&_svg]:overflow-visible!'
              />
            </div>
          ) : null}

          {/* Sessions */}
          <div className='rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800'>
            <h3 className='mb-3 text-xs font-semibold tracking-wide text-gray-900 uppercase dark:text-gray-50'>
              {t('project.userSessions')}
            </h3>
            {sessionsLoading && sessions.length === 0 ? (
              <Loader />
            ) : sessions.length === 0 ? (
              <p className='py-4 text-center text-sm text-gray-400'>{t('project.noSessions')}</p>
            ) : (
              <>
                <Sessions sessions={sessions} timeFormat={timeFormat} />
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
    </div>
  )
}
