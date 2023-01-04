import React, { useEffect, useState } from 'react'
import Button from 'ui/Button'
import _map from 'lodash/map'
import _isEmpty from 'lodash/isEmpty'
import _replace from 'lodash/replace'
import routes from 'routes'
import { useHistory } from 'react-router-dom'

const ProjectAlerts = ({
  projectId, alerts, loading,
}) => {
  const history = useHistory()

  return (
    <div>
      <div className='flex justify-between items-center'>
        <h2 className='text-2xl font-bold dark:text-white text-gray-800'>Alerts</h2>
        <Button
          className='mt-4'
          type='button'
          primary
          large
          onClick={() => {
            history.push(_replace(routes.create_alert, ':pid', projectId))
          }}
        >
          Add Alert
        </Button>
      </div>
      <div className='mt-4'>
        {loading && (
          <div>Loading...</div>
        )}
        {(!loading && !_isEmpty(alerts)) && (
          <div className='flex flex-col'>
            {_map(alerts, (alert) => (
              <div key={alert.id} className='flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4'>
                <div className='flex justify-between items-center'>
                  <div className='flex flex-col'>
                    <div className='text-lg font-bold dark:text-white text-gray-800'>{alert.name}</div>
                    <div className='text-sm dark:text-gray-400 text-gray-600'>{alert.queryMetric}</div>
                  </div>
                  <div className='flex flex-col'>
                    <div className='text-sm dark:text-gray-400 text-gray-600'>Last Triggered</div>
                    <div className='text-lg font-bold dark:text-white text-gray-800'>1 hour ago</div>
                  </div>
                  <Button
                    className='mt-4'
                    type='button'
                    secondary
                    large
                    onClick={() => {
                      history.push(_replace(_replace(routes.alert_settings, ':pid', projectId), ':id', alert.id))
                    }}
                  >
                    edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectAlerts
