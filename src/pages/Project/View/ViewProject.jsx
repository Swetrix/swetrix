import React, { useState, useEffect, memo } from 'react'
import bb, { area, zoom } from 'billboard.js'
import * as d3 from 'd3'
import moment from 'moment'
import { useLocation } from 'react-router-dom'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _reduce from 'lodash/reduce'
import _size from 'lodash/size'
import _isNull from 'lodash/isNull'
import _isEmpty from 'lodash/isEmpty'
import Spinner from 'react-bootstrap/Spinner'
// import PropTypes from 'prop-types'

import ProjectSettings from 'pages/Project/Create'
import { Locale, Panel } from './Panels'
import { getProjectData } from 'api'

const typeNameMapping = {
  tz: 'Timezone',
  pg: 'Page',
  lc: 'Locale',
  ref: 'Referrer',
  sw: 'Screen width',
  so: 'utm_source',
  me: 'utm_medium',
  ca: 'utm_campaign',
  lt: 'Load time',
}

// todo: refactor
const processData = (data) => {
  const res = {
    tz: {},
    pg: {}, 
    lc: {},
    ref: {},
    sw: {},
    so: {}, 
    me: {},
    ca: {}, 
    lt: {},
  }
  const whitelist = _keys(res)

  for (let i = 0; i < _size(data); ++i) {
    const tfData = data[i].data
    for (let j = 0; j < _size(tfData); ++j) {
      for (let z = 0; z < _size(whitelist); ++z) {
        const currWLItem = whitelist[z]
        const tfDataRecord = tfData[j][currWLItem]
        if (!_isNull(tfDataRecord)) {
          res[currWLItem][tfDataRecord] = 1 + (res[currWLItem][tfDataRecord] || 0)
        }
      }
    }
  }

  return res
}

const ViewProject = () => {
  const location = useLocation()
  const { name, id } = location.state || {}
  const [project, setProject] = useState({})
  const [settings, setSettings] = useState(false)
  const [data, setData] = useState([])
  const [panelsData, setPanelsData] = useState({})
  const [chart, setChart] = useState([])

  useEffect(() => {
    (async function() {
      try {
        const data = await getProjectData(id) || []
        setData(data)

        if (_isEmpty(data)) {
          return
        }

        const processedData = processData(data)
        console.log({
          types: _keys(processedData),
          data: processedData,
        })
        setPanelsData({
          types: _keys(processedData),
          data: processedData,
        })

        const settings = {
          data: {
            x: 'x',
            json: {
              x: _map(data, el => moment.utc(el.timeFrame).toDate()),
              visits: _map(data, el => el.total),
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
        console.log(settings.data)
        const chart = bb.generate(settings)
        setChart(chart)
      } catch (e) {
        console.error(e)
      }
    })()
  }, [])
  
  const onSubmit = () => {
    // TODO
  }

  const getProject = () => {
    // TODO
  }

  if (settings) {
    return (
      <ProjectSettings
        onCancel={() => setSettings(false)}
        project={{ id, name }}
      />
    )
  }

  if (id && name) {
  // if (Object.keys(project).length > 0) {
    return (
      <div className='container-fluid'>
        <div className='d-flex justify-content-between'>
          <h2>{name}</h2>
          <button
            onClick={() => setSettings(true)}
            className='btn btn-outline-primary h-100'>
            Settings
          </button>
        </div>
        <div className='d-flex flex-wrap'>
          <div id='dataChart' />
          {_map(panelsData.types, type => (
            <Panel key={type} name={typeNameMapping[type]} data={panelsData.data[type]} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className='container d-flex justify-content-center'>
      <Spinner animation='border' role='status' variant='primary' className='spinner-lg'>
        <span className='sr-only'>Loading...</span>
      </Spinner>
    </div>
  )
}

// ViewProject.propTypes = {
  // id: PropTypes.string.isRequired,
  // name: PropTypes.string.isRequired,
// }

export default memo(ViewProject)