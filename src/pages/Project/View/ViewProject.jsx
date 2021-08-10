import React, { useState, useEffect, useMemo, memo, useRef } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import domToImage from 'dom-to-image'
import { saveAs } from 'file-saver'
import bb, { area, zoom } from 'billboard.js' // eslint-disable-line
import Flag from 'react-flagkit'
import countries from 'i18n-iso-countries'
import countriesEn from 'i18n-iso-countries/langs/en.json'
import cx from 'classnames'
import * as d3 from 'd3'
import dayjs from 'dayjs'
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
  tbPeriodPairs, tbsFormatMapper, getProjectCacheKey,
} from 'redux/constants'
import Button from 'ui/Button'
import Loader from 'ui/Loader'
import Dropdown from 'ui/Dropdown'
import Checkbox from 'ui/Checkbox'
import {
  Panel, Overview, CustomEvents,
} from './Panels'
import routes from 'routes'
import { getProjectData } from 'api'

countries.registerLocale(countriesEn)

const getJSON = (chart, showTotal) => ({
  x: _map(chart.x, el => dayjs(el).toDate()),
  'Unique visitors': chart.uniques,
  ...(showTotal && { 'Total page views': chart.visits }),
})

const getSettings = (chart, timeBucket, showTotal = true) => ({
  data: {
    x: 'x',
    json: getJSON(chart, showTotal),
    type: area(),
    xFormat: '%y-%m-%d %H:%M:%S',
    colors: {
      'Unique visitors': '#2563EB',
      'Total page views': '#D97706',
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

const typeNameMapping = {
  cc: 'Country',
  pg: 'Page',
  lc: 'Locale',
  ref: 'Referrer',
  dv: 'Device type',
  br: 'Browser',
  os: 'OS name',
  so: 'utm_source',
  me: 'utm_medium',
  ca: 'utm_campaign',
  lt: 'Load time',
}

const NoEvents = () => (
  <div className='flex flex-col py-6 sm:px-6 lg:px-8 mt-5'>
    <div className='max-w-7xl w-full mx-auto'>
      <h2 className='text-4xl text-center leading-tight my-3'>No events yet</h2>
      <h2 className='text-2xl mb-8 text-center leading-snug'>No events have been captured yet.</h2>
      {/* todo: detailed description on how to create event, code example; link to docs & cdn / npm library */}
    </div>
  </div>
)

const ViewProject = ({
  projects, isLoading, showError, cache, setProjectCache, projectViewPrefs, setProjectViewPrefs,
}) => {
  const dashboardRef = useRef(null)
  const { id } = useParams()
  const history = useHistory()
  const project = useMemo(() => _find(projects, p => p.id === id) || {}, [projects, id])
  const [panelsData, setPanelsData] = useState({})
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [period, setPeriod] = useState(projectViewPrefs[id]?.period || tbPeriodPairs[1].period)
  const [timeBucket, setTimebucket] = useState(projectViewPrefs[id]?.timeBucket || tbPeriodPairs[1].tbs[1])
  const activePeriod = useMemo(() => _find(tbPeriodPairs, p => p.period === period), [period])
  const [showTotal, setShowTotal] = useState(false)
  const [chartData, setChartData] = useState({})
  const [mainChart, setMainChart] = useState(null)

  const { name } = project

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
        setChartData(chart)

        setPanelsData({
          types: _keys(params),
          data: params,
          customs,
        })

        const bbSettings = getSettings(chart, timeBucket, showTotal)
        setMainChart(bb.generate(bbSettings))
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
          json: getJSON(chartData, true),
        })
      } else {
        mainChart.unload({
          ids: ['Total page views'],
        })
      }
    }
  }, [isLoading, showTotal, chartData, mainChart])

  useEffect(() => {
    loadAnalytics()
  }, [project, period, timeBucket]) // eslint-disable-line

  const updatePeriod = (newPeriod) => {
    const newPeriodFull = _find(tbPeriodPairs, (el) => el.period === newPeriod)
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

  if (!isLoading && _isEmpty(project)) {
    showError('The selected project does not exist')
    history.push(routes.dashboard)
  }

  const openSettingsHandler = () => {
    history.push(_replace(routes.project_settings, ':id', id))
  }

  const exportAsImageHandler = async () => {
    try {
      const blob = await domToImage.toBlob(dashboardRef.current)
      saveAs(blob, `swetrix-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.png`)
    } catch (e) {
      console.error('[ERROR] Error while generating export image.')
      console.error(e)
    }
  }

  const isPanelsDataEmpty = _isEmpty(panelsData)

  if (!isLoading) {
    return (
      <Title title={name}>
        <div className='min-h-min-footer bg-gray-50 py-6 px-4 sm:px-6 lg:px-8' ref={dashboardRef}>
          <div className='flex flex-col md:flex-row items-center md:items-start justify-between h-10'>
            <h2 className='text-3xl font-extrabold text-gray-900 break-words'>{name}</h2>
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
                      {tb}
                    </button>
                  ))}
                </span>
              </div>
              <Dropdown
                items={tbPeriodPairs}
                title={activePeriod.label}
                labelExtractor={pair => pair.label}
                keyExtractor={pair => pair.label}
                onSelect={pair => updatePeriod(pair.period)}
              />
              <div className='h-full ml-3'>
                <Button onClick={openSettingsHandler} className='py-2.5 px-3 md:px-4 text-sm' secondary>
                  Settings
                </Button>
              </div>
            </div>
          </div>
          {isPanelsDataEmpty && (
            analyticsLoading ? (
              <Loader />
            ) : (
              <NoEvents />
            )
          )}
          <div className={cx('flex flex-row items-center justify-center md:justify-end h-10 mt-16 md:mt-5 mb-4', { hidden: isPanelsDataEmpty })}>
            <Checkbox label='Show all views' id='views' checked={showTotal} onChange={(e) => setShowTotal(e.target.checked)} />
            <div className='h-full ml-3'>
              <Button onClick={exportAsImageHandler} className='py-2.5 px-3 md:px-4 text-sm' secondary>
                Export as image
              </Button>
            </div>
          </div>
          <div className={cx('pt-4 md:pt-0', { hidden: isPanelsDataEmpty })}>
            <div className='h-80' id='dataChart' />
            <div className='mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
              <Overview overall={project.overall} chartData={chartData} activePeriod={activePeriod} />
              {_map(panelsData.types, type => {
                if (type === 'cc') {
                  return (
                    <Panel key={type} name={typeNameMapping[type]} data={panelsData.data[type]} rowMapper={(name) => (
                      <>
                        <Flag className='rounded-md' country={name} size={21} alt='' />
                        &nbsp;&nbsp;
                        {countries.getName(name, 'en')}
                      </>
                    )} />
                  )
                }

                if (type === 'dv') {
                  return (
                    <Panel key={type} name={typeNameMapping[type]} data={panelsData.data[type]} capitalize />
                  )
                }

                if (type === 'ref') {
                  return (
                    <Panel key={type} name={typeNameMapping[type]} data={panelsData.data[type]} linkContent />
                  )
                }

                return (
                  <Panel key={type} name={typeNameMapping[type]} data={panelsData.data[type]} />
                )
              })}
              {!_isEmpty(panelsData.customs) && (
                <CustomEvents customs={panelsData.customs} chartData={chartData} />
              )}
            </div>
          </div>
        </div>
      </Title>
    )
  }

  return (
    <Title title={name}>
      <div className='min-h-min-footer'>
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
}

export default memo(ViewProject)
