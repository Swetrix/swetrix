import dayjs from 'dayjs'
import _capitalize from 'lodash/capitalize'
import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _truncate from 'lodash/truncate'
import { GlobeIcon, MonitorIcon, SmartphoneIcon, TabletIcon, ClockIcon, LinkIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BROWSER_LOGO_MAP, OS_LOGO_MAP, OS_LOGO_MAP_DARK } from '~/lib/constants'
import { SessionDetails as SessionDetailsType } from '~/lib/models/Project'
import { useTheme } from '~/providers/ThemeProvider'
import Loader from '~/ui/Loader'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { getLocaleDisplayName, getStringFromTime, getTimeFromSeconds } from '~/utils/generic'

import CCRow from '../../View/components/CCRow'

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
  rotateXAxis: boolean
  dataNames: Record<string, string>
  websiteUrl?: string | null
}

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className='flex items-center justify-between border-b border-gray-100 py-2 last:border-0 dark:border-slate-700/50'>
    <Text size='sm' colour='muted'>
      {label}
    </Text>
    <Text size='sm' weight='medium' colour='primary' className='flex items-center gap-1'>
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
  const { theme } = useTheme()
  const [zoomedTimeRange, setZoomedTimeRange] = useState<[Date, Date] | null>(null)

  const sessionDuration = useMemo(() => {
    if (!activeSession?.details) return 0

    if (activeSession.details.sdur && activeSession.details.sdur > 0) {
      return activeSession.details.sdur
    }

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
  }, [activeSession])

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
    <div className='space-y-3'>
      <div className='flex flex-col gap-3 lg:flex-row'>
        <div className='space-y-4 lg:w-[380px]'>
          <div className='rounded-lg border border-gray-200 bg-white px-4 py-5 dark:border-slate-800/60 dark:bg-slate-800/25'>
            <Text as='h3' size='xs' weight='semibold' colour='primary' className='mb-2 uppercase' tracking='wide'>
              {t('project.sessionInfo')}
            </Text>
            <div>
              <InfoRow
                label={t('dashboard.sessionDuration')}
                value={
                  details.isLive ? (
                    <span className='flex items-center font-semibold text-red-500'>
                      <span className='mr-1.5 h-2.5 w-2.5 animate-pulse rounded-full bg-red-500' />
                      {t('dashboard.live').toUpperCase()}
                    </span>
                  ) : sessionDuration > 0 ? (
                    <>
                      <ClockIcon className='h-4 w-4' />
                      {getStringFromTime(getTimeFromSeconds(sessionDuration))}
                    </>
                  ) : (
                    'N/A'
                  )
                }
              />
              <InfoRow
                label={t('project.mapping.ref')}
                value={
                  details.ref ? (
                    <Tooltip
                      text={details.ref}
                      tooltipNode={
                        <div className='flex items-center gap-1'>
                          <LinkIcon className='h-4 w-4' />
                          <span title={_size(details.ref) > 25 ? details.ref : undefined}>
                            {_truncate(details.ref, { length: 25 })}
                          </span>
                        </div>
                      }
                    />
                  ) : (
                    t('project.directNone')
                  )
                }
              />
            </div>

            <Text as='h3' size='xs' weight='semibold' colour='primary' className='mt-5 mb-2 uppercase' tracking='wide'>
              {t('project.locationAndDevice')}
            </Text>
            <div>
              <InfoRow
                label={t('project.mapping.cc')}
                value={details.cc ? <CCRow size={16} cc={details.cc} language={language} /> : '-'}
              />
              {details.rg ? <InfoRow label={t('project.mapping.rg')} value={details.rg} /> : null}
              {details.ct ? <InfoRow label={t('project.mapping.ct')} value={details.ct} /> : null}
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

            {details.so || details.me || details.ca || details.te || details.co ? (
              <>
                <Text as='h3' size='xs' weight='semibold' colour='primary' className='mb-2 uppercase' tracking='wide'>
                  {t('project.campaigns')}
                </Text>
                <div>
                  {details.so ? <InfoRow label={t('project.mapping.so')} value={details.so} /> : null}
                  {details.me ? <InfoRow label={t('project.mapping.me')} value={details.me} /> : null}
                  {details.ca ? <InfoRow label={t('project.mapping.ca')} value={details.ca} /> : null}
                  {details.te ? <InfoRow label={t('project.mapping.te')} value={details.te} /> : null}
                  {details.co ? <InfoRow label={t('project.mapping.co')} value={details.co} /> : null}
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className='flex-1'>
          {!_isEmpty(activeSession?.chart) ? (
            <div className='rounded-lg border border-gray-200 bg-white px-4 py-5 dark:border-slate-800/60 dark:bg-slate-800/25'>
              <div className='mb-2 flex items-center justify-between'>
                <Text as='h3' size='xs' weight='semibold' colour='primary' className='uppercase' tracking='wide'>
                  {t('project.sessionActivity')}
                </Text>
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
                dataNames={dataNames}
                onZoom={setZoomedTimeRange}
                className='h-[300px] [&_svg]:overflow-visible!'
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className='rounded-lg border border-gray-200 bg-white px-4 py-5 dark:border-slate-800/60 dark:bg-slate-800/25'>
        <h3 className='mb-4 text-xs font-semibold tracking-wide text-gray-900 uppercase dark:text-gray-50'>
          {t('project.pageflow')}
        </h3>
        <Pageflow
          pages={activeSession?.pages || []}
          timeFormat={timeFormat}
          zoomedTimeRange={zoomedTimeRange}
          sdur={activeSession?.details?.sdur}
          websiteUrl={websiteUrl}
        />
      </div>
    </div>
  )
}
