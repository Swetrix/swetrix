import React, { useState, useEffect, useMemo, memo, useRef } from 'react'
import { useHistory, useParams, Link } from 'react-router-dom'
import domToImage from 'dom-to-image'
import { saveAs } from 'file-saver'
import bb, { area } from 'billboard.js'
import Flag from 'react-flagkit'
import countries from 'i18n-iso-countries'
import countriesEn from 'i18n-iso-countries/langs/en.json'
import countriesDe from 'i18n-iso-countries/langs/de.json'
import countriesEl from 'i18n-iso-countries/langs/el.json'
import countriesHi from 'i18n-iso-countries/langs/hi.json'
import countriesUk from 'i18n-iso-countries/langs/uk.json'
import countriesZh from 'i18n-iso-countries/langs/zh.json'
import countriesRu from 'i18n-iso-countries/langs/ru.json'
import countriesSv from 'i18n-iso-countries/langs/sv.json'
import {
  GlobeIcon, TranslateIcon, DocumentTextIcon, DeviceMobileIcon, ArrowCircleRightIcon, SearchIcon, ServerIcon,
} from '@heroicons/react/outline'
import cx from 'clsx'
import * as d3 from 'd3'
import dayjs from 'dayjs'
import { useTranslation, Trans } from 'react-i18next'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _includes from 'lodash/includes'
import _last from 'lodash/last'
import _isEmpty from 'lodash/isEmpty'
import _replace from 'lodash/replace'
import _find from 'lodash/find'
import _size from 'lodash/size'
import _filter from 'lodash/filter'
import _truncate from 'lodash/truncate'
import PropTypes from 'prop-types'

import Title from 'components/Title'
import EventsRunningOutBanner from 'components/EventsRunningOutBanner'
import {
  tbPeriodPairs, tbsFormatMapper, getProjectCacheKey, LIVE_VISITORS_UPDATE_INTERVAL, DEFAULT_TIMEZONE, timeBucketToDays,
} from 'redux/constants'
import Button from 'ui/Button'
import Loader from 'ui/Loader'
import Dropdown from 'ui/Dropdown'
import Checkbox from 'ui/Checkbox'
import FlatPicker from 'ui/Flatpicker'
import {
  Panel, Overview, CustomEvents,
} from './Panels'
import routes from 'routes'
import {
  getProjectData, getProject, getOverallStats, getLiveVisitors,
} from 'api'
import './styles.css'

countries.registerLocale(countriesEn)
countries.registerLocale(countriesDe)
countries.registerLocale(countriesEl)
countries.registerLocale(countriesRu)
countries.registerLocale(countriesHi)
countries.registerLocale(countriesUk)
countries.registerLocale(countriesZh)
countries.registerLocale(countriesSv)

const getColumns = (chart, showTotal, t) => {
  if (showTotal) {
    return [
      ['x', ..._map(chart.x, el => dayjs(el).toDate())],
      [t('project.unique'), ...chart.uniques],
      [t('project.total'), ...chart.visits],
    ]
  }

  return [
    ['x', ..._map(chart.x, el => dayjs(el).toDate())],
    [t('project.unique'), ...chart.uniques],
  ]
}

const getSettings = (chart, timeBucket, showTotal = true, t) => {
  const xAxisSize = _size(chart.x)
  let regionStart

  if (xAxisSize > 1) {
    regionStart = dayjs(chart.x[xAxisSize - 2]).toDate()
  } else {
    regionStart = dayjs(chart.x[xAxisSize - 1]).toDate()
  }

  return {
    data: {
      x: 'x',
      columns: getColumns(chart, showTotal, t),
      type: area(),
      colors: {
        [t('project.unique')]: '#2563EB',
        [t('project.total')]: '#D97706',
      },
      regions: {
          [t('project.unique')]: [
            {
              start: regionStart,
              style: {
                dasharray: '6 2',
              },
            },
          ],
          [t('project.total')]: [
            {
              start: regionStart,
              style: {
                dasharray: '6 2',
              },
            },
          ]
      },
    },
    axis: {
      x: {
        tick: {
          fit: true,
        },
        type: 'timeseries',
      },
    },
    tooltip: {
      format: {
        title: (x) => d3.timeFormat(tbsFormatMapper[timeBucket])(x),
      },
      contents: {
        template: `
          <ul class='bg-gray-100 rounded-md shadow-md px-3 py-1'>
            <li class='font-semibold'>{=TITLE}</li>
            <hr />
            {{
              <li class='flex justify-between'>
                <div class='flex justify-items-start'>
                  <div class='w-3 h-3 rounded-sm mt-1.5 mr-2' style=background-color:{=COLOR}></div>
                  <span>{=NAME}</span>
                </div>
                <span class='pl-4'>{=VALUE}</span>
              </li>
            }}
          </ul>`,
      },
    },
    point: {
      focus: {
        only: true,
      },
      pattern: [
        'circle',
      ],
      r: 3,
    },
    legend: {
      usePoint: true,
      item: {
        tile: {
          width: 10,
        },
      },
    },
    bindto: '#dataChart',
  }
}

const typeNameMapping = (t) => ({
  cc: t('project.mapping.cc'),
  pg: t('project.mapping.pg'),
  lc: t('project.mapping.lc'),
  ref: t('project.mapping.ref'),
  dv: t('project.mapping.dv'),
  br: t('project.mapping.br'),
  os: t('project.mapping.os'),
  so: 'utm_source',
  me: 'utm_medium',
  ca: 'utm_campaign',
  lt: t('project.mapping.lt'),
})

export const iconClassName = 'w-6 h-6'
const panelIconMapping = {
  cc: <GlobeIcon className={iconClassName} />,
  pg: <DocumentTextIcon className={iconClassName} />,
  lc: <TranslateIcon className={iconClassName} />,
  ref: <ArrowCircleRightIcon className={iconClassName} />,
  dv: <DeviceMobileIcon className={iconClassName} />,
  br: <SearchIcon className={iconClassName} />,
  os: <ServerIcon className={iconClassName} />,
}

const NoEvents = ({ t }) => (
  <div className='flex flex-col py-6 sm:px-6 lg:px-8 mt-5'>
    <div className='max-w-7xl w-full mx-auto text-gray-900 dark:text-gray-50'>
      <h2 className='text-4xl text-center leading-tight my-3'>
        {t('project.noEvTitle')}
      </h2>
      <h2 className='text-2xl mb-8 text-center leading-snug'>
        <Trans
          t={t}
          i18nKey='project.noEvContent'
          components={{
            link: <Link to={routes.docs} className='hover:underline text-blue-600' />,
          }}
        />
      </h2>
    </div>
  </div>
)

const Filter = ({ column, filter, isExclusive, onRemoveFilter, onChangeExclusive, tnMapping, language, t }) => {
  const displayColumn = tnMapping[column]
  let displayFilter = filter

  if (column === 'cc') {
    displayFilter = countries.getName(filter, language)
  }

  displayFilter = _truncate(displayFilter)

  return (
    <span className='inline-flex rounded-md items-center py-0.5 pl-2.5 pr-1 mr-2 mt-2 text-sm font-medium bg-gray-200 text-gray-800 dark:text-gray-50 dark:bg-gray-700'>
      {displayColumn}
      &nbsp;
      <span className='text-blue-400 border-blue-400 border-b-2 border-dotted cursor-pointer' onClick={() => onChangeExclusive(column, filter, !isExclusive)}>
        {t(`common.${isExclusive ? 'isNot' : 'is'}`)}
      </span>
      &nbsp;
      &quot;
      {displayFilter}
      &quot;
      <button
        onClick={() => onRemoveFilter(column, filter)}
        type='button'
        className='flex-shrink-0 ml-0.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-gray-800 hover:text-gray-900 hover:bg-gray-300 focus:bg-gray-300 focus:text-gray-900 dark:text-gray-50 dark:bg-gray-700 dark:hover:text-gray-300 dark:hover:bg-gray-800 dark:focus:bg-gray-800 dark:focus:text-gray-300 focus:outline-none '
      >
        <span className='sr-only'>Remove filter</span>
        <svg className='h-2 w-2' stroke='currentColor' fill='none' viewBox='0 0 8 8'>
          <path strokeLinecap='round' strokeWidth='1.5' d='M1 1l6 6m0-6L1 7' />
        </svg>
      </button>
    </span>
  )
}

const Filters = ({ filters, onRemoveFilter, onChangeExclusive, language, t, tnMapping }) => (
  <div className='flex justify-center md:justify-start flex-wrap -mt-2'>
    {_map(filters, (props) => {
      const { column, filter } = props
      const key = `${column}${filter}`

      return (
        <Filter key={key} onRemoveFilter={onRemoveFilter} onChangeExclusive={onChangeExclusive} language={language} t={t} tnMapping={tnMapping} {...props} />
      )
    })}
  </div>
)

const ViewProject = ({
  projects, isLoading: _isLoading, showError, cache, setProjectCache, projectViewPrefs, setProjectViewPrefs, setPublicProject,
  setLiveStatsForProject, authenticated, timezone,
}) => {
  const { t, i18n: { language } } = useTranslation('common')
  const [periodPairs, setPeriodPairs] = useState(tbPeriodPairs(t))
  const dashboardRef = useRef(null)
  const { id } = useParams()
  const history = useHistory()
  const project = useMemo(() => _find(projects, p => p.id === id) || {}, [projects, id])
  const [isProjectPublic, setIsProjectPublic] = useState(false)
  const [panelsData, setPanelsData] = useState({})
  const [isPanelsDataEmpty, setIsPanelsDataEmpty] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [period, setPeriod] = useState(projectViewPrefs[id]?.period || periodPairs[3].period)
  const [timeBucket, setTimebucket] = useState(projectViewPrefs[id]?.timeBucket || periodPairs[3].tbs[1])
  const activePeriod = useMemo(() => _find(periodPairs, p => p.period === period), [period, periodPairs])
  const [showTotal, setShowTotal] = useState(false)
  const [chartData, setChartData] = useState({})
  const [mainChart, setMainChart] = useState(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [filters, setFilters] = useState([])
  // That is needed when using 'Export as image' feature
  // Because headless browser cannot do a request to the DDG API due to absense of The Same Origin Policy header
  const [showIcons, setShowIcons] = useState(true)
  const isLoading = authenticated ? _isLoading : false
  const tnMapping = typeNameMapping(t)
  const refCalendar = useRef(null)
  const localstorageRangeDate = projectViewPrefs[id]?.rangeDate
  const [rangeDate, setRangeDate] = useState(localstorageRangeDate ? [new Date(localstorageRangeDate[0]), new Date(localstorageRangeDate[1])] : null)

  const { name } = project

  const onErrorLoading = () => {
    showError(t('project.noExist'))
    history.push(routes.dashboard)
  }

  const getFormateDate = (date) => {
    const yyyy = date.getFullYear()
    let mm = date.getMonth() + 1
    let dd = date.getDate()
    if (dd < 10) dd = '0' + dd
    if (mm < 10) mm = '0' + mm
    return yyyy + '-' + mm + '-' + dd
  }

  const loadAnalytics = async (forced = false, newFilters = null) => {
    if (forced || (!isLoading && !_isEmpty(project))) {
      setDataLoading(true)
      try {
        let data
        const key = getProjectCacheKey(period, timeBucket)

        if (!forced && !_isEmpty(cache[id]) && !_isEmpty(cache[id][key])) {
          data = cache[id][key]
        } else {
          if (rangeDate) {
            const from = getFormateDate(rangeDate[0])
            const to = getFormateDate(rangeDate[1])
            data = await getProjectData(id, timeBucket, '', newFilters || filters, from, to, timezone)
          } else {
            data = await getProjectData(id, timeBucket, period, newFilters || filters, '', '', timezone)
          }
          setProjectCache(id, period, timeBucket, data || {})
        }

        if (_isEmpty(data)) {
          setAnalyticsLoading(false)
          setDataLoading(false)
          return
        }

        const { chart, params, customs } = data

        if (!_isEmpty(params)) {
          const bbSettings = getSettings(chart, timeBucket, showTotal, t)
          setChartData(chart)
          
          setPanelsData({
            types: _keys(params),
            data: params,
            customs,
          })

          if (!_isEmpty(mainChart)) {
            mainChart.destroy()
          }

          setMainChart(bb.generate(bbSettings))
          setIsPanelsDataEmpty(false)
        } else {
          setIsPanelsDataEmpty(true)
        }

        setAnalyticsLoading(false)
        setDataLoading(false)
      } catch (e) {
        console.error(e)
      }
    }
  }

  const filterHandler = (column, filter, isExclusive = false) => {
    let newFilters

    // temporarily apply only 1 filter per data type 
    if (_find(filters, (f) => f.column === column) /* && f.filter === filter) */) {
      // selected filter is already included into the filters array -> removing it
      newFilters = _filter(filters, (f) => f.column !== column)
      setFilters(newFilters)
    } else {
      // selected filter is not present in the filters array -> applying it
      newFilters = [
        ...filters,
        { column, filter, isExclusive },
      ]
      setFilters(newFilters)
    }

    loadAnalytics(true, newFilters)
  }

  const onChangeExclusive = (column, filter, isExclusive) => {
    const newFilters = _map(filters, (f) => {
      if (f.column === column && f.filter === filter) {
        return {
          ...f,
          isExclusive,
        }
      }

      return f
    })

    setFilters(newFilters)
    loadAnalytics(true, newFilters)
  }

  useEffect(() => {
    if (!isLoading && !_isEmpty(chartData) && !_isEmpty(mainChart)) {
      if (showTotal) {
        mainChart.load({
          columns: getColumns(chartData, true, t),
        })
      } else {
        mainChart.unload({
          ids: [t('project.total')],
        })
      }
    }
  }, [isLoading, showTotal, chartData, mainChart, t])

  useEffect(() => {
    if (period !== 'custom') {
      loadAnalytics()
    } else if (timeBucket !== 'custom') {
      loadAnalytics(true)
    }
  }, [project, period, timeBucket, periodPairs]) // eslint-disable-line

  useEffect(() => {
    if (rangeDate) {
      const days = Math.ceil(Math.abs(rangeDate[1].getTime() - rangeDate[0].getTime()) / (1000 * 3600 * 24))
      console.log(timeBucketToDays)

      for (let index in timeBucketToDays) {
        if (timeBucketToDays[index].lt >= days) {
          setTimebucket(timeBucketToDays[index].tb[0])
          setPeriodPairs(tbPeriodPairs(t, timeBucketToDays[index].tb, rangeDate))
          setPeriod('custom')
          setProjectViewPrefs(id, 'custom', timeBucketToDays[index].tb[0], rangeDate)
          break
        }
      }
    }
  }, [rangeDate, t]) // eslint-disable-line

  useEffect(() => {
    const updateLiveVisitors = async () => {
      const { id } = project
      const result = await getLiveVisitors([id])

      setLiveStatsForProject(id, result[id])
    }

    let interval
    if (project.uiHidden) {
      updateLiveVisitors()
      interval = setInterval(async () => {
        await updateLiveVisitors()
      }, LIVE_VISITORS_UPDATE_INTERVAL)
    }

    return () => clearInterval(interval)
  }, [project.id, setLiveStatsForProject]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isLoading && _isEmpty(project)) {
      getProject(id)
        .then(projectRes => {
          if (!_isEmpty(projectRes) && projectRes?.public) {
            getOverallStats([id])
              .then(res => {
                setPublicProject({
                  ...projectRes,
                  overall: res[id],
                  live: 'N/A',
                })
              })
              .catch(e => {
                console.error(e)
                onErrorLoading()
              })

            setIsProjectPublic(true)
          } else {
            onErrorLoading()
          }
        })
        .catch(e => {
          console.error(e)
          onErrorLoading()
        })
    }
  }, [isLoading, project, id, setPublicProject]) // eslint-disable-line

  const updatePeriod = (newPeriod) => {
    const newPeriodFull = _find(periodPairs, (el) => el.period === newPeriod.period)
    let tb = timeBucket
    if (_isEmpty(newPeriodFull)) return

    if (!_includes(newPeriodFull.tbs, timeBucket)) {
      tb = _last(newPeriodFull.tbs)
      setTimebucket(tb)
    }

    if (newPeriod.period !== 'custom') {
      setProjectViewPrefs(id, newPeriod.period, tb)
      setPeriod(newPeriod.period)
    }
  }

  const updateTimebucket = (newTimebucket) => {
    setTimebucket(newTimebucket)
    setProjectViewPrefs(id, period, newTimebucket, rangeDate) 
  }

  const openSettingsHandler = () => {
    history.push(_replace(routes.project_settings, ':id', id))
  }

  const exportAsImageHandler = async () => {
    setShowIcons(false)
    try {
      const blob = await domToImage.toBlob(dashboardRef.current)
      saveAs(blob, `swetrix-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.png`)
    } catch (e) {
      console.error('[ERROR] Error while generating export image.')
      console.error(e)
    } finally {
      setShowIcons(true)
    }
  }

  if (!isLoading) {
    return (
      <Title title={name}>
        <EventsRunningOutBanner />
        <div
          className={cx(
            'bg-gray-50 dark:bg-gray-800 py-6 px-4 sm:px-6 lg:px-8',
            {
              'min-h-min-footer': authenticated,
              'min-h-min-footer-ad': !authenticated,
            }
          )}
          ref={dashboardRef}
        >
          <div className='flex flex-col md:flex-row items-center md:items-start justify-between h-10'>
            <h2 className='text-3xl font-extrabold text-gray-900 dark:text-gray-50 break-words'>
              {name}
            </h2>
            <div className='flex mt-3 md:mt-0'>
              <div className='md:border-r border-gray-200 dark:border-gray-600 md:pr-3 mr-3'>
                <span className='relative z-0 inline-flex shadow-sm rounded-md'>
                  {_map(activePeriod.tbs, (tb, index, { length }) => (
                    <button
                      key={tb}
                      type='button'
                      onClick={() => updateTimebucket(tb)}
                      className={cx(
                        'relative capitalize inline-flex items-center px-3 md:px-4 py-2 border bg-white text-sm font-medium hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200 focus:dark:border-gray-200',
                        {
                          '-ml-px': index > 0,
                          'rounded-l-md': index === 0,
                          'rounded-r-md': 1 + index === length,
                          'z-10 border-indigo-500 text-indigo-600 dark:border-gray-200 dark:text-gray-50': timeBucket === tb,
                          'text-gray-700 dark:text-gray-50 border-gray-300 dark:border-gray-800 ': timeBucket !== tb,
                        }
                      )}
                    >
                      {t(`project.${tb}`)}
                    </button>
                  ))}
                </span>
              </div>
              <Dropdown
                items={periodPairs}
                title={activePeriod.label}
                labelExtractor={(pair) => pair.dropdownLabel || pair.label}
                keyExtractor={(pair) => pair.label}
                onSelect={(pair) => {
                  if (pair.isCustomDate) {
                    setTimeout(() => {
                      refCalendar.current.openCalendar()
                    }, 100)
                  } else {
                    setPeriodPairs(tbPeriodPairs(t))
                    setRangeDate(null)
                    updatePeriod(pair)
                  }
                }}
              />
              <FlatPicker ref={refCalendar} onChange={(date) => setRangeDate(date)} value={rangeDate} />
              {!isProjectPublic && (
                <div className='h-full ml-3'>
                  <Button
                    onClick={openSettingsHandler}
                    className='py-2.5 px-3 md:px-4 text-sm dark:text-gray-50 dark:border-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600'
                    secondary
                  >
                    {t('common.settings')}
                  </Button>
                </div>
              )}
            </div>
          </div>
          {isPanelsDataEmpty &&
            (analyticsLoading ? <Loader /> : <NoEvents t={t} />)
          }
          <div
            className={cx(
              'flex flex-row items-center justify-center md:justify-end h-10 mt-16 md:mt-5 mb-4',
              { hidden: isPanelsDataEmpty }
            )}
          >
            <Checkbox
              label={t('project.showAll')}
              id='views'
              checked={showTotal}
              onChange={(e) => setShowTotal(e.target.checked)}
            />
            <div className='h-full ml-3'>
              <Button
                onClick={exportAsImageHandler}
                className='py-2.5 px-3 md:px-4 text-sm dark:text-gray-50 dark:border-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600'
                secondary
              >
                {t('project.exportImg')}
              </Button>
            </div>
          </div>
          <div className={cx('pt-4 md:pt-0', { hidden: isPanelsDataEmpty })}>
            <div className='h-80' id='dataChart' />
            <Filters
              filters={filters}
              onRemoveFilter={filterHandler}
              onChangeExclusive={onChangeExclusive}
              language={language}
              t={t}
              tnMapping={tnMapping}
            />
            {dataLoading && (
              <div className='loader bg-transparent static mt-4' id='loader'>
                <div className='loader-head'>
                  <div className='first'></div>
                  <div className='second'></div>
                </div>
              </div>
            )}
            <div className='mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
              {!_isEmpty(project.overall) && (
                <Overview
                  t={t}
                  overall={project.overall}
                  chartData={chartData}
                  activePeriod={activePeriod}
                  live={project.live}
                />
              )}
              {_map(panelsData.types, (type) => {
                const panelName = tnMapping[type]
                const panelIcon = panelIconMapping[type]

                if (type === 'cc') {
                  return (
                    <Panel
                      t={t}
                      key={type}
                      icon={panelIcon}
                      id={type}
                      onFilter={filterHandler}
                      name={panelName}
                      data={panelsData.data[type]}
                      rowMapper={(name) => (
                        <>
                          <Flag
                            className='rounded-sm'
                            country={name}
                            size={21}
                            alt=''
                          />
                          &nbsp;&nbsp;
                          {countries.getName(name, language)}
                        </>
                      )}
                    />
                  )
                }

                if (type === 'dv') {
                  return (
                    <Panel
                      t={t}
                      key={type}
                      icon={panelIcon}
                      id={type}
                      onFilter={filterHandler}
                      name={panelName}
                      data={panelsData.data[type]}
                      capitalize
                    />
                  )
                }

                if (type === 'ref') {
                  return (
                    <Panel
                      t={t}
                      key={type}
                      icon={panelIcon}
                      id={type}
                      onFilter={filterHandler}
                      name={panelName}
                      data={panelsData.data[type]}
                      rowMapper={(name) => {
                        let isUrl = true
                        let url = name

                        try {
                          url = new URL(name)
                        } catch {
                          isUrl = false
                        }

                        return (
                          <div>
                            {showIcons && isUrl && !_isEmpty(url.hostname) && (
                              <img
                                className='w-5 h-5 mr-1.5 float-left'
                                src={`https://icons.duckduckgo.com/ip3/${url.hostname}.ico`}
                                alt=''
                              />
                            )}
                            {isUrl ? (
                              <a
                                className='flex label overflow-visible hover:underline text-blue-600 dark:text-blue-500'
                                href={name}
                                target='_blank'
                                rel='noopener noreferrer'
                              >
                                {name}
                              </a>
                            ) : (
                              <span className='flex label overflow-visible hover:underline text-blue-600 dark:text-blue-500'>
                                {name}
                              </span>
                            )}
                          </div>
                        )
                      }}
                    />
                  )
                }

                return (
                  <Panel
                    t={t}
                    key={type}
                    icon={panelIcon}
                    id={type}
                    onFilter={filterHandler}
                    name={panelName}
                    data={panelsData.data[type]}
                  />
                )
              })}
              {!_isEmpty(panelsData.customs) && (
                <CustomEvents
                  t={t}
                  customs={panelsData.customs}
                  chartData={chartData}
                />
              )}
            </div>
          </div>
        </div>
        {!authenticated && (
          <div className='bg-indigo-600'>
            <div className='w-11/12 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8 lg:flex lg:items-center lg:justify-between'>
              <h2 className='text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900'>
                <span className='block text-white'>{t('project.ad')}</span>
                <span className='block text-gray-300'>
                  {t('main.exploreService')}
                </span>
              </h2>
              <div className='mt-6 space-y-4 sm:space-y-0 sm:flex sm:space-x-5'>
                <Link
                  to={routes.signup}
                  className='flex items-center justify-center px-3 py-2 border border-transparent text-lg font-medium rounded-md shadow-sm text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
                >
                  {t('common.getStarted')}
                </Link>
                <Link
                  to={routes.main}
                  className='flex items-center justify-center px-3 py-2 border border-transparent text-lg font-medium rounded-md shadow-sm text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
                >
                  {t('common.explore')}
                </Link>
              </div>
            </div>
          </div>
        )}
      </Title>
    )
  }

  return (
    <Title title={name}>
      <div className='min-h-min-footer dark:bg-gray-800'>
        <Loader />
      </div>
    </Title>
  )
}

ViewProject.propTypes = {
  projects: PropTypes.arrayOf(PropTypes.object).isRequired,
  cache: PropTypes.objectOf(PropTypes.object).isRequired,
  projectViewPrefs: PropTypes.objectOf(PropTypes.object).isRequired,
  showError: PropTypes.func.isRequired,
  setProjectCache: PropTypes.func.isRequired,
  setProjectViewPrefs: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  setPublicProject: PropTypes.func.isRequired,
  setLiveStatsForProject: PropTypes.func.isRequired,
  authenticated: PropTypes.bool.isRequired,
  timezone: PropTypes.string,
}

ViewProject.defaultProps = {
  timezone: DEFAULT_TIMEZONE,
}

export default memo(ViewProject)
