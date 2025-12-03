import cx from 'clsx'
import dayjs from 'dayjs'
import _capitalize from 'lodash/capitalize'
import _isEmpty from 'lodash/isEmpty'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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

import { ProfileDetails as ProfileDetailsType, Session } from '~/lib/models/Project'
import { getLocaleDisplayName, getStringFromTime, getTimeFromSeconds } from '~/utils/generic'
import Loader from '~/ui/Loader'

import CCRow from './CCRow'
import { Sessions } from './Sessions'
import { SessionChart } from './SessionChart'

// Generate display names for anonymous users
const ADJECTIVES = [
  'Amber',
  'Azure',
  'Beige',
  'Black',
  'Blue',
  'Bronze',
  'Brown',
  'Coral',
  'Crimson',
  'Cyan',
  'Emerald',
  'Fuchsia',
  'Gold',
  'Gray',
  'Green',
  'Indigo',
  'Ivory',
  'Jade',
  'Lavender',
  'Lime',
  'Magenta',
  'Maroon',
  'Mint',
  'Navy',
  'Olive',
  'Orange',
  'Peach',
  'Pink',
  'Plum',
  'Purple',
  'Red',
  'Rose',
  'Ruby',
  'Salmon',
  'Sapphire',
  'Scarlet',
  'Silver',
  'Slate',
  'Teal',
  'Turquoise',
  'Violet',
  'White',
  'Yellow',
]

const NOUNS = [
  'Albatross',
  'Ant',
  'Badger',
  'Bear',
  'Beaver',
  'Bison',
  'Butterfly',
  'Camel',
  'Cardinal',
  'Cat',
  'Cheetah',
  'Cobra',
  'Condor',
  'Coyote',
  'Crane',
  'Crow',
  'Deer',
  'Dolphin',
  'Dove',
  'Dragon',
  'Eagle',
  'Elephant',
  'Elk',
  'Falcon',
  'Ferret',
  'Finch',
  'Flamingo',
  'Fox',
  'Frog',
  'Gazelle',
  'Giraffe',
  'Goat',
  'Goose',
  'Gorilla',
  'Hamster',
  'Hare',
  'Hawk',
  'Hedgehog',
  'Heron',
  'Hippo',
  'Horse',
  'Hummingbird',
  'Hyena',
  'Iguana',
  'Jaguar',
  'Jay',
  'Kangaroo',
  'Koala',
  'Lemur',
  'Leopard',
  'Lion',
  'Llama',
  'Lobster',
  'Lynx',
  'Macaw',
  'Meerkat',
  'Mongoose',
  'Moose',
  'Moth',
  'Mouse',
  'Narwhal',
  'Newt',
  'Octopus',
  'Orca',
  'Ostrich',
  'Otter',
  'Owl',
  'Panda',
  'Panther',
  'Parrot',
  'Peacock',
  'Pelican',
  'Penguin',
  'Phoenix',
  'Pig',
  'Pigeon',
  'Piranha',
  'Pony',
  'Porcupine',
  'Puma',
  'Quail',
  'Rabbit',
  'Raccoon',
  'Raven',
  'Rhino',
  'Robin',
  'Salamander',
  'Salmon',
  'Seal',
  'Shark',
  'Sheep',
  'Sloth',
  'Snail',
  'Snake',
  'Sparrow',
  'Spider',
  'Squirrel',
  'Stork',
  'Swan',
  'Tiger',
  'Toucan',
  'Trout',
  'Turtle',
  'Viper',
  'Vulture',
  'Walrus',
  'Weasel',
  'Whale',
  'Wolf',
  'Wombat',
  'Woodpecker',
  'Yak',
  'Zebra',
]

const generateDisplayName = (profileId: string): string => {
  let hash = 0
  for (let i = 0; i < profileId.length; i++) {
    const char = profileId.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  hash = Math.abs(hash)
  const adjIndex = hash % ADJECTIVES.length
  const nounIndex = Math.floor(hash / ADJECTIVES.length) % NOUNS.length
  return `${ADJECTIVES[adjIndex]} ${NOUNS[nounIndex]}`
}

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

  return (
    <div className='overflow-x-auto'>
      <div className='mb-1 flex text-[10px] text-gray-400' style={{ marginLeft: '14px' }}>
        {monthLabels.map(({ month, weekIndex }, idx) => (
          <span
            key={idx}
            style={{
              marginLeft:
                weekIndex === 0 ? 0 : `${(weekIndex - (idx > 0 ? monthLabels[idx - 1].weekIndex : 0)) * 10}px`,
            }}
          >
            {month}
          </span>
        ))}
      </div>
      <div className='flex gap-[2px]'>
        <div className='flex flex-col gap-[2px] pr-1 text-[9px] text-gray-400'>
          {['', 'M', '', 'W', '', 'F', ''].map((d, i) => (
            <span key={i} className='h-2 leading-2'>
              {d}
            </span>
          ))}
        </div>
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className='flex flex-col gap-[2px]'>
            {week.map((day, dayIdx) => (
              <div
                key={dayIdx}
                className={cx('h-2 w-2 rounded-[2px]', getColor(day.count))}
                title={`${day.date}: ${day.count} ${t('dashboard.pageviews').toLowerCase()}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// Stat Item Component
const StatItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) => (
  <div>
    <div className='mb-0.5 flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-gray-400 uppercase'>
      {icon}
      {label}
    </div>
    <div className='text-lg font-semibold text-gray-900 dark:text-white'>{value}</div>
  </div>
)

// Info Row Component for Location & Device
const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className='flex items-center justify-between border-b border-gray-100 py-2 last:border-0 dark:border-slate-700/50'>
    <span className='text-sm text-gray-500 dark:text-gray-400'>{label}</span>
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

// Browser Icon Component (simplified - using globe as fallback)
const BrowserIcon = ({ browser }: { browser: string | null }) => {
  // Could add specific browser icons here
  return <GlobeIcon className='h-4 w-4' />
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

  const displayName = useMemo(() => {
    if (!details) return ''
    if (details.isIdentified) {
      const userId = details.profileId.replace('usr_', '')
      return userId.length <= 20 ? userId : `${userId.substring(0, 17)}...`
    }
    return generateDisplayName(details.profileId)
  }, [details])

  const avatarColor = useMemo(() => {
    if (!details) return 'hsl(0, 0%, 50%)'
    let hash = 0
    for (let i = 0; i < details.profileId.length; i++) {
      hash = details.profileId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return `hsl(${Math.abs(hash) % 360}, 55%, 50%)`
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
        <div
          className='flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl'
          style={{ backgroundColor: avatarColor }}
        >
          <span className='text-white'>:)</span>
        </div>
        <div>
          <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>{displayName}</h2>
          <code className='text-sm text-gray-400'>{details.profileId.substring(0, 12)}</code>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className='flex flex-col gap-6 lg:flex-row'>
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
            <h3 className='mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400'>
              {t('project.locationAndDevice')}
            </h3>
            <div>
              <InfoRow
                label={t('project.mapping.cc')}
                value={details.cc ? <CCRow size={16} cc={details.cc} language={language} /> : '-'}
              />
              {details.rg && <InfoRow label={t('project.mapping.rg')} value={details.rg} />}
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
                value={details.os ? `${details.os}${details.osv ? ` v${details.osv}` : ''}` : '-'}
              />
            </div>
          </div>

          {/* Activity Calendar Card */}
          <div className='rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800'>
            <h3 className='mb-4 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400'>
              {t('project.activityCalendar')}
            </h3>
            <ActivityCalendar data={details.activityCalendar || []} />
          </div>
        </div>

        {/* Right Column - Chart */}
        <div className='flex-1'>
          {details.chart && !_isEmpty(details.chart.x) && (
            <div className='h-full rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800'>
              <h3 className='mb-4 text-base font-semibold text-gray-900 dark:text-white'>{t('dashboard.pageviews')}</h3>
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
          )}
        </div>
      </div>

      {/* Sessions - Full Width */}
      <div className='rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800'>
        <h3 className='mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400'>
          {t('project.userSessions')}
        </h3>
        {sessionsLoading && sessions.length === 0 ? (
          <Loader />
        ) : sessions.length === 0 ? (
          <p className='py-4 text-center text-sm text-gray-400'>{t('project.noSessions')}</p>
        ) : (
          <>
            <Sessions sessions={sessions} timeFormat={timeFormat} />
            {canLoadMoreSessions && (
              <button
                type='button'
                onClick={onLoadMoreSessions}
                disabled={!!sessionsLoading}
                className={cx(
                  'mt-4 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600',
                  sessionsLoading && 'cursor-not-allowed opacity-50',
                )}
              >
                {t('project.loadMore')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
