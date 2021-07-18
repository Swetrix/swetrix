import React, { useState, useEffect, useMemo, memo } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import bb, { area, zoom } from 'billboard.js'
import * as d3 from 'd3'
import dayjs from 'dayjs'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _reduce from 'lodash/reduce'
import _size from 'lodash/size'
import _isNull from 'lodash/isNull'
import _isEmpty from 'lodash/isEmpty'
import _replace from 'lodash/replace'
import _find from 'lodash/find'
import PropTypes from 'prop-types'

import { tbPeriodPairs } from 'redux/constants'
import Button from 'ui/Button'
import Loader from 'ui/Loader'
import Dropdown from 'ui/Dropdown'
import { Panel } from './Panels'
import routes from 'routes'
import { getProjectData } from 'api'

const typeNameMapping = {
  cc: 'Country',
  pg: 'Page',
  lc: 'Locale',
  ref: 'Referrer',
  sw: 'Screen width',
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
  projects, isLoading, showError,
}) => {
  const { id } = useParams()
  const history = useHistory()
  const project = useMemo(() => _find(projects, p => p.id === id) || {}, [projects])
  const [panelsData, setPanelsData] = useState({})
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [period, setPeriod] = useState(tbPeriodPairs[1].period)
  const [timeBucket, setTimebucket] = useState(tbPeriodPairs[1].tbs[1])
  const periodLabel = useMemo(() => _find(tbPeriodPairs, p => p.period === period).label, [period])
  // const [bbChart, setBbChart] = useState([])

  const { name } = project

  const loadAnalytics = async () => {
    if (!isLoading && !_isEmpty(project)) {
      try {
        const data = await getProjectData(id, timeBucket, period)
  
        if (_isEmpty(data)) {
          setAnalyticsLoading(false)
          return
        }
  
        const { chart, params } = data
  
        setPanelsData({
          types: _keys(params),
          data: params,
        })
  
        const bbSettings = {
          data: {
            x: 'x',
            json: {
              x: _map(chart.x, el => dayjs(el).toDate()),
              visits: chart.visits,
            },
            type: area(),
            xFormat: '%y-%m-%d %H:%M:%S',
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
          zoom: {
            enabled: zoom(),
            type: 'drag',
          },
          tooltip: {
            format: {
              title: (x) => d3.timeFormat('%Y-%m-%d %H:%M:%S')(x),
            }
          },
          point: {
            focus: {
              only: true,
            }
          },
          bindto: '#dataChart',
        }
  
        bb.generate(bbSettings)
        setAnalyticsLoading(false)
      } catch (e) {
        console.error(e)
      }
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [project, period])

  if (!isLoading && _isEmpty(project)) {
    showError('The selected project does not exist')
    history.push(routes.dashboard)
  }

  const openSettingsHandler = () => {
    history.push(_replace(routes.project_settings, ':id', id))
  }

  if (!isLoading) {
    return (
      <div className='min-h-page bg-gray-50 py-6 sm:px-6 lg:px-8'>
        <div className='flex justify-between h-10 mb-10'>
          <h2 className='text-3xl font-extrabold text-gray-900'>{name}</h2>
          <div className='flex'>
            <Dropdown
              items={tbPeriodPairs}
              title={periodLabel}
              labelExtractor={pair => pair.label}
              keyExtractor={pair => pair.label}
              onSelect={pair => setPeriod(pair.period)}
            />
            <div className='h-full ml-3'>
              <Button onClick={openSettingsHandler} className='py-2.5' secondary large>
                Settings
              </Button>
            </div>
          </div>
        </div>
        {_isEmpty(panelsData) ? (
          analyticsLoading ? (
            <Loader />
          ) : (
            <NoEvents />
          )
        ) : (
          <div>
            <div id='dataChart' className='h4' />
            <div className='mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
              {_map(panelsData.types, type => (
                <Panel key={type} name={typeNameMapping[type]} data={panelsData.data[type]} />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Loader />
  )
}

ViewProject.propTypes = {
  projects: PropTypes.arrayOf(PropTypes.object).isRequired,
  showError: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
}

export default memo(ViewProject)
