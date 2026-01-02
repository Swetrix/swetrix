import { GlobeAltIcon } from '@heroicons/react/24/outline'
import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import { CompassIcon, MapPinIcon, MonitorCog, TabletSmartphoneIcon } from 'lucide-react'
import { useState, useEffect, useMemo, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { getCaptchaData } from '~/api'
import useSize from '~/hooks/useSize'
import { chartTypes, BROWSER_LOGO_MAP, OS_LOGO_MAP, OS_LOGO_MAP_DARK } from '~/lib/constants'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import Loader from '~/ui/Loader'
import LoadingBar from '~/ui/LoadingBar'

import CCRow from '../../View/components/CCRow'
import DashboardHeader from '../../View/components/DashboardHeader'
import Filters from '../../View/components/Filters'
import { Filter } from '../../View/interfaces/traffic'
import { Panel } from '../../View/Panels'
import { parseFilters } from '../../View/utils/filters'
import { ViewProjectContext } from '../../View/ViewProject'
import { deviceIconMapping } from '../../View/ViewProject.helpers'

import { CaptchaChart } from './CaptchaChart'
import NoCaptchaEvents from './NoCaptchaEvents'
import WaitingForCaptchaEvent from './WaitingForCaptchaEvent'

const PANELS_ORDER = ['cc', 'br', 'os', 'dv']

const iconClassName = 'w-6 h-6'
const panelIconMapping: Record<string, React.ReactNode> = {
  cc: <MapPinIcon className={iconClassName} strokeWidth={1.5} />,
  dv: <TabletSmartphoneIcon className={iconClassName} strokeWidth={1.5} />,
  br: <CompassIcon className={iconClassName} strokeWidth={1.5} />,
  os: <MonitorCog className={iconClassName} strokeWidth={1.5} />,
}

export const captchaTypeNameMapping = (t: any) => ({
  cc: t('project.mapping.cc'),
  dv: t('project.mapping.dv'),
  br: t('project.mapping.br'),
  os: t('project.mapping.os'),
})

interface CaptchaViewProps {
  projectId: string
}

const CaptchaView = ({ projectId }: CaptchaViewProps) => {
  const { theme } = useTheme()
  const { project } = useCurrentProject()
  const { period, timeBucket, dateRange, captchaRefreshTrigger, timeFormat, size } = useContext(ViewProjectContext)
  const [searchParams] = useSearchParams()
  const isEmbedded = searchParams.get('embedded') === 'true'

  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  const [panelsData, setPanelsData] = useState<any>({})
  const [chartData, setChartData] = useState<{ x: string[]; results: number[] } | null>(null)
  const [isPanelsDataEmpty, setIsPanelsDataEmpty] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)

  const rotateXAxis = useMemo(() => size.width > 0 && size.width < 500, [size])

  const dataNames = useMemo(
    () => ({
      results: t('project.captchaCompletions'),
    }),
    [t],
  )

  const filters = useMemo<Filter[]>(() => {
    return parseFilters(searchParams)
  }, [searchParams])

  const tnMapping = captchaTypeNameMapping(t)
  const [ref] = useSize() as any

  const getFormatDate = (date: Date) => {
    const yyyy = date.getFullYear()
    let mm: string | number = date.getMonth() + 1
    let dd: string | number = date.getDate()
    if (dd < 10) dd = `0${dd}`
    if (mm < 10) mm = `0${mm}`
    return `${yyyy}-${mm}-${dd}`
  }

  const loadCaptcha = async () => {
    setDataLoading(true)

    try {
      let data
      let from
      let to

      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
      }

      if (period === 'custom' && dateRange) {
        data = await getCaptchaData(projectId, timeBucket, '', filters, from, to)
      } else {
        data = await getCaptchaData(projectId, timeBucket, period, filters, '', '')
      }

      if (_isEmpty(data)) {
        setAnalyticsLoading(false)
        setDataLoading(false)
        setIsPanelsDataEmpty(true)
        setChartData(null)
        return
      }

      const { params, chart } = data

      if (chart && chart.x && chart.results) {
        setChartData(chart)
      } else {
        setChartData(null)
      }

      if (_isEmpty(params)) {
        setIsPanelsDataEmpty(true)
      } else {
        setPanelsData({
          types: _keys(params),
          data: params,
        })
        setIsPanelsDataEmpty(false)
      }

      setAnalyticsLoading(false)
      setDataLoading(false)
    } catch (reason) {
      setAnalyticsLoading(false)
      setDataLoading(false)
      setIsPanelsDataEmpty(true)
      setChartData(null)
      console.error('[ERROR](loadCaptcha) Loading captcha data failed:', reason)
    }
  }

  useEffect(() => {
    loadCaptcha()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, dateRange, period, timeBucket, projectId])

  // Refresh captcha data when refresh button is clicked
  useEffect(() => {
    if (captchaRefreshTrigger > 0) {
      loadCaptcha()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captchaRefreshTrigger])

  const getFilterLink = (column: string, value: string | null) => {
    const isFilterActive = filters.findIndex((filter) => filter.column === column && filter.filter === value) >= 0
    const newSearchParams = new URLSearchParams(searchParams.toString())

    if (isFilterActive) {
      newSearchParams.delete(column, value ?? 'null')
    } else {
      newSearchParams.append(column, value ?? 'null')
    }

    return { search: newSearchParams.toString() }
  }

  // Check if we have existing data
  const hasExistingData = chartData !== null || !_isEmpty(panelsData.types)

  // Show waiting state if project has no captcha data yet
  if (!_isEmpty(project) && !project?.isCaptchaDataExists) {
    return <WaitingForCaptchaEvent />
  }

  // Show Loader only on initial load (no existing data)
  if (analyticsLoading && !hasExistingData) {
    return (
      <div
        className={cx('flex flex-col bg-gray-50 dark:bg-slate-900', {
          'min-h-including-header': !isEmbedded,
          'min-h-screen': isEmbedded,
        })}
      >
        <Loader />
      </div>
    )
  }

  if (isPanelsDataEmpty && !dataLoading) {
    return (
      <>
        <DashboardHeader showLiveVisitors={false} />
        <NoCaptchaEvents filters={filters} />
      </>
    )
  }

  return (
    <>
      <DashboardHeader showLiveVisitors={false} />
      <div ref={ref}>
        {dataLoading && hasExistingData ? <LoadingBar /> : null}
        <div>
          <Filters className='mb-3' tnMapping={tnMapping} />
          {chartData ? (
            <CaptchaChart
              chart={chartData}
              timeBucket={timeBucket}
              timeFormat={timeFormat}
              rotateXAxis={rotateXAxis}
              chartType={chartTypes.line}
              dataNames={dataNames}
            />
          ) : null}
          <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
            {!_isEmpty(panelsData.types)
              ? _map(PANELS_ORDER, (type: keyof typeof tnMapping) => {
                  const panelName = tnMapping[type]
                  const panelIcon = panelIconMapping[type]

                  if (type === 'cc') {
                    const rowMapper = (entry: any) => {
                      const { name: entryName, cc } = entry
                      if (cc) {
                        return <CCRow cc={cc} name={entryName} language={language} />
                      }
                      return <CCRow cc={entryName} language={language} />
                    }

                    return (
                      <Panel
                        key={type}
                        icon={panelIcon}
                        id={type}
                        getFilterLink={getFilterLink}
                        name={panelName}
                        data={panelsData.data[type]}
                        rowMapper={rowMapper}
                        activeTabId={type}
                      />
                    )
                  }

                  if (type === 'dv') {
                    return (
                      <Panel
                        key={type}
                        icon={panelIcon}
                        id={type}
                        getFilterLink={getFilterLink}
                        name={panelName}
                        data={panelsData.data[type]}
                        rowMapper={(entry: { name: keyof typeof deviceIconMapping }) => {
                          const { name: entryName } = entry
                          const icon = deviceIconMapping[entryName]
                          if (!icon) {
                            return entryName
                          }
                          return (
                            <>
                              {icon}
                              &nbsp;
                              {entryName}
                            </>
                          )
                        }}
                        capitalize
                        activeTabId={type}
                      />
                    )
                  }

                  if (type === 'br') {
                    const rowMapper = (entry: any) => {
                      const { name: entryName } = entry
                      // @ts-expect-error
                      const logoUrl = BROWSER_LOGO_MAP[entryName]
                      if (!logoUrl) {
                        return (
                          <>
                            <GlobeAltIcon className='h-5 w-5' />
                            &nbsp;
                            {entryName}
                          </>
                        )
                      }
                      return (
                        <>
                          <img src={logoUrl} className='h-5 w-5' alt='' />
                          &nbsp;
                          {entryName}
                        </>
                      )
                    }

                    return (
                      <Panel
                        key={type}
                        icon={panelIcon}
                        id={type}
                        getFilterLink={getFilterLink}
                        name={panelName}
                        data={panelsData.data[type]}
                        rowMapper={rowMapper}
                        activeTabId={type}
                      />
                    )
                  }

                  if (type === 'os') {
                    const rowMapper = (entry: any) => {
                      const { name: entryName } = entry
                      // @ts-expect-error
                      const logoUrlLight = OS_LOGO_MAP[entryName]
                      // @ts-expect-error
                      const logoUrlDark = OS_LOGO_MAP_DARK[entryName]
                      let logoUrl = theme === 'dark' ? logoUrlDark : logoUrlLight
                      logoUrl ||= logoUrlLight

                      if (!logoUrl) {
                        return (
                          <>
                            <GlobeAltIcon className='h-5 w-5' />
                            &nbsp;
                            {entryName}
                          </>
                        )
                      }

                      return (
                        <>
                          <img src={logoUrl} className='h-5 w-5 dark:fill-gray-50' alt='' />
                          &nbsp;
                          {entryName}
                        </>
                      )
                    }

                    return (
                      <Panel
                        key={type}
                        icon={panelIcon}
                        id={type}
                        getFilterLink={getFilterLink}
                        name={panelName}
                        data={panelsData.data[type]}
                        rowMapper={rowMapper}
                        activeTabId={type}
                      />
                    )
                  }

                  return (
                    <Panel
                      key={type}
                      icon={panelIcon}
                      id={type}
                      getFilterLink={getFilterLink}
                      name={panelName}
                      data={panelsData.data[type]}
                      activeTabId={type}
                    />
                  )
                })
              : null}
          </div>
        </div>
      </div>
    </>
  )
}

export default CaptchaView
