import React, { useState, useEffect, memo } from 'react'
import { Link } from 'react-router-dom'
import bb, { area, zoom } from 'billboard.js'
import * as d3 from 'd3'
import dayjs from 'dayjs'
import { useLocation } from 'react-router-dom'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _reduce from 'lodash/reduce'
import _size from 'lodash/size'
import _isNull from 'lodash/isNull'
import _isEmpty from 'lodash/isEmpty'
import _replace from 'lodash/replace'
import Spinner from 'react-bootstrap/Spinner'
// import PropTypes from 'prop-types'

import { Panel } from './Panels'
import routes from 'routes'
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

const ViewProject = () => {
  const location = useLocation()
  const { name, id } = location.state || {}
  const [panelsData, setPanelsData] = useState({})
  // const [bbChart, setBbChart] = useState([])

  useEffect(() => {
    (async function() {
      try {
        const data = await getProjectData(id)

        if (_isEmpty(data)) {
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
      } catch (e) {
        console.error(e)
      }
    })()
  }, [])
  
  const onSubmit = () => {
    // TODO
  }

  if (id && name) {
    return (
      <div className='container-fluid'>
        <div className='d-flex justify-content-between'>
          <h2>{name}</h2>
          <Link
            to={{
              pathname: _replace(routes.project_settings, ':id', id),
              state: {
                project: { name, id },
              },
            }}
            className='btn btn-outline-primary h-100'>
            Settings
          </Link>
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