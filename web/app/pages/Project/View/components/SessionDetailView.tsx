import dayjs from 'dayjs'
import _capitalize from 'lodash/capitalize'
import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _truncate from 'lodash/truncate'
import {
  GlobeIcon,
  MonitorIcon,
  SmartphoneIcon,
  TabletIcon,
  ClockIcon,
  MapPinIcon,
  LanguagesIcon,
  LinkIcon,
  TagIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BROWSER_LOGO_MAP, OS_LOGO_MAP, OS_LOGO_MAP_DARK } from '~/lib/constants'
import { SessionDetails as SessionDetailsType } from '~/lib/models/Project'
import { useTheme } from '~/providers/ThemeProvider'
import Loader from '~/ui/Loader'
import { getLocaleDisplayName, getStringFromTime, getTimeFromSeconds } from '~/utils/generic'

import CCRow from './CCRow'
import NoSessionDetails from './NoSessionDetails'
import { Pageflow } from './Pageflow'
import { SessionChart } from './SessionChart'

interface PageflowItem {
  type: 'pageview' | 'event' | 'error'
  value: string
  created: string
  metadata?: { key: string; value: string }[]
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
  } | null
  sessionLoading: boolean
  timeFormat: '12-hour' | '24-hour'
  chartType: string
  rotateXAxis: boolean
  dataNames: Record<string, string>
}

// Info Row Component
const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
  <div className='flex items-center justify-between border-b border-gray-100 py-2.5 last:border-0 dark:border-slate-700/50'>
    <span className='flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400'>
      {icon}
      {label}
    </span>
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

export const SessionDetailView = ({
  activeSession,
  sessionLoading,
  timeFormat,
  chartType,
  rotateXAxis,
  dataNames,
}: SessionDetailViewProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { theme } = useTheme()
  const [zoomedTimeRange, setZoomedTimeRange] = useState<[Date, Date] | null>(null)

  // Calculate session duration from pages if sdur is 0 or not available
  const sessionDuration = useMemo(() => {
    if (!activeSession?.details) return 0

    if (activeSession.details.sdur && activeSession.details.sdur > 0) {
      return activeSession.details.sdur
    }

    // Fallback: calculate duration from pageview timestamps only
    if (!_isEmpty(activeSession.pages)) {
      const pageviews = activeSession.pages!.filter((p) => p.type === 'pageview')
      if (pageviews.length >= 1) {
        const firstPageview = pageviews[0]
        const lastPageview = pageviews[pageviews.length - 1]
        const diffSeconds = dayjs(lastPageview.created).diff(dayjs(firstPageview.created), 'seconds')
        if (diffSeconds > 0) {
          return diffSeconds
        }
      }
    }

    return 0
  }, [activeSession?.details?.sdur, activeSession?.pages])

  const resetZoom = () => {
    setZoomedTimeRange(null)
  }

  if (_isEmpty(activeSession) && sessionLoading) {
    return <Loader />
  }

  if (activeSession !== null && _isEmpty(activeSession?.chart) && _isEmpty(activeSession?.pages) && !sessionLoading) {
    return <NoSessionDetails />
  }

  const details = activeSession?.details

  if (!details) {
    return <Loader />
  }

  return (
    <div className='space-y-6'>
      {/* Main Content - Two Column Layout */}
      <div className='flex flex-col gap-6 lg:flex-row'>
        {/* Left Column - Session Details */}
        <div className='space-y-4 lg:w-[380px]'>
          {/* Session Info Card */}
          <div className='rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800'>
            <h3 className='mb-3 text-xs font-semibold tracking-wide text-gray-900 uppercase dark:text-gray-50'>
              {t('project.sessionInfo')}
            </h3>
            <div>
              {/* Session Duration */}
              <InfoRow
                icon={<ClockIcon className='h-4 w-4' />}
                label={t('dashboard.sessionDuration')}
                value={
                  details.isLive ? (
                    <span className='flex items-center font-semibold text-red-500'>
                      <span className='mr-1.5 h-2.5 w-2.5 animate-pulse rounded-full bg-red-500' />
                      {t('dashboard.live').toUpperCase()}
                    </span>
                  ) : sessionDuration > 0 ? (
                    getStringFromTime(getTimeFromSeconds(sessionDuration))
                  ) : (
                    'N/A'
                  )
                }
              />
              {/* Referrer */}
              <InfoRow
                icon={<LinkIcon className='h-4 w-4' />}
                label={t('project.mapping.ref')}
                value={
                  details.ref ? (
                    <span title={_size(details.ref) > 25 ? details.ref : undefined}>
                      {_truncate(details.ref, { length: 25 })}
                    </span>
                  ) : (
                    t('project.directNone')
                  )
                }
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
                icon={<MapPinIcon className='h-4 w-4' />}
                label={t('project.mapping.cc')}
                value={details.cc ? <CCRow size={16} cc={details.cc} language={language} /> : '-'}
              />
              {details.rg ? (
                <InfoRow icon={<MapPinIcon className='h-4 w-4' />} label={t('project.mapping.rg')} value={details.rg} />
              ) : null}
              {details.ct ? (
                <InfoRow icon={<MapPinIcon className='h-4 w-4' />} label={t('project.mapping.ct')} value={details.ct} />
              ) : null}
              <InfoRow
                icon={<LanguagesIcon className='h-4 w-4' />}
                label={t('project.mapping.lc')}
                value={details.lc ? getLocaleDisplayName(details.lc, language) : '-'}
              />
              <InfoRow
                icon={<DeviceIcon device={details.dv} />}
                label={t('project.mapping.dv')}
                value={details.dv ? _capitalize(details.dv) : '-'}
              />
              <InfoRow
                icon={<BrowserIcon browser={details.br} />}
                label={t('project.mapping.br')}
                value={
                  details.br ? (
                    <>
                      {details.br}
                      {details.brv ? ` v${details.brv}` : ''}
                    </>
                  ) : (
                    '-'
                  )
                }
              />
              <InfoRow
                icon={<OSIcon os={details.os} theme={theme} />}
                label={t('project.mapping.os')}
                value={
                  details.os ? (
                    <>
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

          {/* UTM Campaigns Card */}
          {details.so || details.me || details.ca || details.te || details.co ? (
            <div className='rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800'>
              <h3 className='mb-3 text-xs font-semibold tracking-wide text-gray-900 uppercase dark:text-gray-50'>
                {t('project.campaigns')}
              </h3>
              <div>
                {details.so ? (
                  <InfoRow icon={<TagIcon className='h-4 w-4' />} label={t('project.mapping.so')} value={details.so} />
                ) : null}
                {details.me ? (
                  <InfoRow icon={<TagIcon className='h-4 w-4' />} label={t('project.mapping.me')} value={details.me} />
                ) : null}
                {details.ca ? (
                  <InfoRow icon={<TagIcon className='h-4 w-4' />} label={t('project.mapping.ca')} value={details.ca} />
                ) : null}
                {details.te ? (
                  <InfoRow icon={<TagIcon className='h-4 w-4' />} label={t('project.mapping.te')} value={details.te} />
                ) : null}
                {details.co ? (
                  <InfoRow icon={<TagIcon className='h-4 w-4' />} label={t('project.mapping.co')} value={details.co} />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {/* Right Column - Chart */}
        <div className='flex-1'>
          {!_isEmpty(activeSession?.chart) ? (
            <div className='rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800'>
              <div className='mb-3 flex items-center justify-between'>
                <h3 className='text-xs font-semibold tracking-wide text-gray-900 uppercase dark:text-gray-50'>
                  {t('project.sessionActivity')}
                </h3>
                {zoomedTimeRange ? (
                  <button
                    onClick={resetZoom}
                    className='rounded border bg-white px-2 py-1 text-xs text-gray-800 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 hover:dark:bg-slate-700'
                  >
                    {t('project.resetZoom')}
                  </button>
                ) : null}
              </div>
              <SessionChart
                chart={activeSession?.chart}
                timeBucket={activeSession?.timeBucket}
                timeFormat={timeFormat}
                rotateXAxis={rotateXAxis}
                chartType={chartType}
                dataNames={dataNames}
                onZoom={setZoomedTimeRange}
                className='h-[300px] [&_svg]:overflow-visible!'
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Pageflow Section - Full Width Below */}
      <div className='rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800'>
        <h3 className='mb-4 text-xs font-semibold tracking-wide text-gray-900 uppercase dark:text-gray-50'>
          {t('project.pageflow')}
        </h3>
        <Pageflow
          pages={activeSession?.pages || []}
          timeFormat={timeFormat}
          zoomedTimeRange={zoomedTimeRange}
          sdur={activeSession?.details?.sdur}
        />
      </div>
    </div>
  )
}
