import React, { useState, useEffect, useMemo, memo, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import domToImage from 'dom-to-image'
import { saveAs } from 'file-saver'
import bb, { area, zoom } from 'billboard.js' // eslint-disable-line
import Flag from 'react-flagkit'
import countries from 'i18n-iso-countries'
import countriesEn from 'i18n-iso-countries/langs/en.json'
import countriesDe from 'i18n-iso-countries/langs/de.json'
import countriesHi from 'i18n-iso-countries/langs/hi.json'
import countriesUk from 'i18n-iso-countries/langs/uk.json'
import countriesZh from 'i18n-iso-countries/langs/zh.json'
import countriesRu from 'i18n-iso-countries/langs/ru.json'
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
import PropTypes from 'prop-types'

import Title from 'components/Title'
import {
  tbPeriodPairs, tbsFormatMapper, getProjectCacheKey, LIVE_VISITORS_UPDATE_INTERVAL,
} from 'redux/constants'
import Button from 'ui/Button'
import Loader from 'ui/Loader'
import Dropdown from 'ui/Dropdown'
import Checkbox from 'ui/Checkbox'
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
countries.registerLocale(countriesRu)
countries.registerLocale(countriesHi)
countries.registerLocale(countriesUk)
countries.registerLocale(countriesZh)

const getJSON = (chart, showTotal, t) => ({
  x: _map(chart.x, el => dayjs(el).toDate()),
  [t('project.unique')]: chart.uniques,
  ...(showTotal && { [t('project.total')]: chart.visits }),
})

const getSettings = (chart, timeBucket, showTotal = true, t) => ({
  data: {
    x: 'x',
    json: getJSON(chart, showTotal, t),
    type: area(),
    xFormat: '%y-%m-%d %H:%M:%S',
    colors: {
      [t('project.unique')]: '#2563EB',
      [t('project.total')]: '#D97706',
    }
  },
  axis: {
    x: {
      tick: {
        fit: false,
        count: 5,
      },
      type: 'timeseries',
    },
  },
  // zoom: {
  //   enabled: zoom(),
  //   type: 'drag',
  // },
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
})

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

const NoEvents = ({ t }) => (
  <div className='flex flex-col py-6 sm:px-6 lg:px-8 mt-5'>
    <div className='max-w-7xl w-full mx-auto'>
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

const ViewProject = ({
  projects, isLoading: _isLoading, showError, cache, setProjectCache, projectViewPrefs, setProjectViewPrefs, setPublicProject,
  setLiveStatsForProject, authenticated,
}) => {
  const { t, i18n: { language } } = useTranslation('common')
  const periodPairs = tbPeriodPairs(t)
  const dashboardRef = useRef(null)
  const { id } = useParams()
  const history = useNavigate()
  const project = useMemo(() => _find(projects, p => p.id === id) || {}, [projects, id])
  const [isProjectPublic, setIsProjectPublic] = useState(false)
  const [panelsData, setPanelsData] = useState({})
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [period, setPeriod] = useState(projectViewPrefs[id]?.period || periodPairs[1].period)
  const [timeBucket, setTimebucket] = useState(projectViewPrefs[id]?.timeBucket || periodPairs[1].tbs[1])
  const activePeriod = useMemo(() => _find(periodPairs, p => p.period === period), [period, periodPairs])
  const [showTotal, setShowTotal] = useState(false)
  const [chartData, setChartData] = useState({})
  const [mainChart, setMainChart] = useState(null)
  // That is needed when using 'Export as image' feature
  // Because headless browser cannot do a request to the DDG API due to absense of The Same Origin Policy header
  const [showIcons, setShowIcons] = useState(true)
  const isLoading = authenticated ? _isLoading : false 

  const tnMapping = typeNameMapping(t)

  const { name } = project

  const onErrorLoading = () => {
    showError(t('project.noExist'))
    history(routes.dashboard)
  }

  const loadAnalytics = async () => {
    if (!isLoading && !_isEmpty(project)) {
      try {
        let data
        const key = getProjectCacheKey(period, timeBucket)

        if (!_isEmpty(cache[id]) && !_isEmpty(cache[id][key])) {
          data = cache[id][key]
        } else {
          data = await getProjectData(id, timeBucket, period)
          setProjectCache(id, period, timeBucket, data || {})
        }

        if (_isEmpty(data)) {
          setAnalyticsLoading(false)
          return
        }

        const { chart, params, customs } = data

        if (!_isEmpty(params)) {
          setChartData(chart)

          setPanelsData({
            types: _keys(params),
            data: params,
            customs,
          })

          const bbSettings = getSettings(chart, timeBucket, showTotal, t)
          setMainChart(bb.generate(bbSettings))
        }

        setAnalyticsLoading(false)
      } catch (e) {
        console.error(e)
      }
    }
  }

  useEffect(() => {
    if (!isLoading && !_isEmpty(chartData) && !_isEmpty(mainChart)) {
      if (showTotal) {
        mainChart.load({
          json: getJSON(chartData, true, t),
        })
      } else {
        mainChart.unload({
          ids: [t('project.total')],
        })
      }
    }
  }, [isLoading, showTotal, chartData, mainChart, t])

  useEffect(() => {
    loadAnalytics()
  }, [project, period, timeBucket]) // eslint-disable-line

  useEffect(() => {
    let interval
    if (project.uiHidden) {
      interval = setInterval(async () => {
        const { id } = project
        const result = await getLiveVisitors([id])

        setLiveStatsForProject(id, result[id])
      }, LIVE_VISITORS_UPDATE_INTERVAL)
    }

    return () => clearInterval(interval)
  }, [project, setLiveStatsForProject])

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
    const newPeriodFull = _find(periodPairs, (el) => el.period === newPeriod)
    let tb = timeBucket
    if (_isEmpty(newPeriodFull)) return

    if (!_includes(newPeriodFull.tbs, timeBucket)) {
      tb = _last(newPeriodFull.tbs)
      setTimebucket(tb)
    }

    setPeriod(newPeriod)
    setProjectViewPrefs(id, newPeriod, tb)
  }

  const updateTimebucket = (newTimebucket) => {
    setTimebucket(newTimebucket)
    setProjectViewPrefs(id, period, newTimebucket)
  }

  const openSettingsHandler = () => {
    history(_replace(routes.project_settings, ':id', id))
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

  const isPanelsDataEmpty = _isEmpty(panelsData)

  if (!isLoading) {
    return (
      <Title title={name}>
        <div className={cx('bg-gray-50 dark:bg-gray-800 py-6 px-4 sm:px-6 lg:px-8', {
          'min-h-min-footer': authenticated,
          'min-h-min-footer-ad': !authenticated,
        })} ref={dashboardRef}>
          <div className='flex flex-col md:flex-row items-center md:items-start justify-between h-10'>
            <h2 className='text-3xl font-extrabold text-gray-900 dark:text-gray-50 break-words'>{name}</h2>
            <div className='flex mt-3 md:mt-0'>
              <div className='md:border-r border-gray-200 md:pr-3 mr-3'>
                <span className='relative z-0 inline-flex shadow-sm rounded-md'>
                  {_map(activePeriod.tbs, (tb, index, { length }) => (
                    <button
                      key={tb}
                      type='button'
                      onClick={() => updateTimebucket(tb)}
                      className={cx('relative capitalize inline-flex items-center px-3 md:px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500', {
                        '-ml-px': index > 0,
                        'rounded-l-md': index === 0,
                        'rounded-r-md': 1 + index === length,
                        'z-10 border-indigo-500 text-indigo-600': timeBucket === tb,
                      })}
                    >
                      {t(`project.${tb}`)}
                    </button>
                  ))}
                </span>
              </div>
              <Dropdown
                items={periodPairs}
                title={activePeriod.label}
                labelExtractor={pair => pair.label}
                keyExtractor={pair => pair.label}
                onSelect={pair => updatePeriod(pair.period)}
              />
              {!isProjectPublic && (
                <div className='h-full ml-3'>
                  <Button onClick={openSettingsHandler} className='py-2.5 px-3 md:px-4 text-sm' secondary>
                    {t('common.settings')}
                  </Button>
                </div>
              )}
            </div>
          </div>
          {isPanelsDataEmpty && (
            analyticsLoading ? (
              <Loader />
            ) : (
              <NoEvents t={t} />
            )
          )}
          <div className={cx('flex flex-row items-center justify-center md:justify-end h-10 mt-16 md:mt-5 mb-4', { hidden: isPanelsDataEmpty })}>
            <Checkbox label='Show all views' id='views' checked={showTotal} onChange={(e) => setShowTotal(e.target.checked)} />
            <div className='h-full ml-3'>
              <Button onClick={exportAsImageHandler} className='py-2.5 px-3 md:px-4 text-sm' secondary>
                {t('project.exportImg')}
              </Button>
            </div>
          </div>
          <div className={cx('pt-4 md:pt-0', { hidden: isPanelsDataEmpty })}>
            <div className='h-80' id='dataChart' />
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
              {_map(panelsData.types, type => {
                if (type === 'cc') {
                  return (
                    <Panel t={t} key={type} name={tnMapping[type]} data={panelsData.data[type]} rowMapper={(name) => (
                      <>
                        <Flag className='rounded-md' country={name} size={21} alt='' />
                        &nbsp;&nbsp;
                        {countries.getName(name, language)}
                      </>
                    )} />
                  )
                }

                if (type === 'dv') {
                  return (
                    <Panel t={t} key={type} name={tnMapping[type]} data={panelsData.data[type]} capitalize />
                  )
                }

                if (type === 'ref') {
                  return (
                    <Panel t={t} key={type} name={tnMapping[type]} data={panelsData.data[type]} rowMapper={(name) => {
                      const url = new URL(name)

                      return (
                        <a className='flex label hover:underline text-blue-600' href={name} target='_blank' rel='noopener noreferrer'>
                          {showIcons && !_isEmpty(url.hostname) && (
                            <img className='w-5 h-5 mr-1.5' src={`https://icons.duckduckgo.com/ip3/${url.hostname}.ico`} alt='' />
                          )}
                          {name}
                        </a>
                      )
                    }}
                    />
                  )
                }

                return (
                  <Panel t={t} key={type} name={tnMapping[type]} data={panelsData.data[type]} />
                )
              })}
              {!_isEmpty(panelsData.customs) && (
                <CustomEvents t={t} customs={panelsData.customs} chartData={chartData} />
              )}
            </div>
          </div>
        </div>
        {!authenticated && (
          <div className='bg-indigo-600'>
            <div className='w-11/12 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8 lg:flex lg:items-center lg:justify-between'>
              <h2 className='text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900'>
                <span className='block text-white'>
                  {t('project.ad')}
                </span>
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
  user: PropTypes.object.isRequired,
  setPublicProject: PropTypes.func.isRequired,
  setLiveStatsForProject: PropTypes.func.isRequired,
  authenticated: PropTypes.bool.isRequired,
}

export default memo(ViewProject)
