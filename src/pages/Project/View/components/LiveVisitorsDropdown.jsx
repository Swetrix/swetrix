import React, { useState, useEffect } from 'react'
import _map from 'lodash/map'
import { useTranslation } from 'react-i18next'
import OutsideClickHandler from 'react-outside-click-handler'
import {
  ChevronDownIcon, ChevronUpIcon, XMarkIcon,
} from '@heroicons/react/24/outline'
import Flag from 'react-flagkit'

import { getLiveVisitorsInfo } from 'api'

const LiveVisitorsDropdown = ({ live, projectId }) => {
  const { t } = useTranslation()
  const [show, setShow] = useState(false)
  const [liveInfo, setLiveInfo] = useState([])
  const [loading, setLoading] = useState(true)

  const getLiveVisitors = async () => {
    await getLiveVisitorsInfo(projectId)
      .then((res) => {
        setLiveInfo(res)
      })
      .catch((err) => {
        console.log(err)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    if (show) {
      getLiveVisitors()
    }
  }, [show]) // eslint-disable-line react-hooks/exhaustive-deps

  console.log(liveInfo)

  return (
    <OutsideClickHandler
      onOutsideClick={() => setShow(false)}
    >
      <p className='h-5 mr-2 text-gray-900 dark:text-gray-50 text-xl cursor-pointer' onClick={() => setShow(!show)}>
        {live}
        {' '}
        {show ? <ChevronUpIcon className='inline w-5 h-5' /> : <ChevronDownIcon className='inline w-5 h-5' />}
      </p>
      {show && (
        <div className='absolute z-10 mt-2 right-0 top-20 text-gray-900 bg-white border border-gray-200 rounded-md shadow-lg dark:bg-gray-800 dark:border-gray-700 min-w-[150px] max-h-[200px] overflow-scroll'>
          <div className='flex flex-col w-full p-2'>
            <p className='text-sm font-semibold text-gray-900 dark:text-gray-50'>
              {t('dashboard.liveVisitors')}
            </p>
            {loading ? (
              <p className='text-sm text-gray-900 dark:text-gray-50'>
                {t('common.loading')}
              </p>
            ) : (
              _map(liveInfo, ({
                dv, br, os, cc,
              }, index) => (
                <div key={`${dv}${br}${os}${cc}${index}`} className='flex flex-row items-center justify-between w-full p-2 mt-2 text-sm text-gray-900 bg-gray-100 rounded-md dark:text-gray-50 dark:bg-gray-700'>
                  <div className='flex flex-row items-center'>
                    <Flag
                      className='rounded-sm mr-2'
                      country={cc}
                      size={21}
                      alt=''
                      aria-hidden='true'
                    />
                    <p className='mr-2'>{os}</p>
                    <p className='mr-2'>{br}</p>
                    <p className='mr-2 capitalize'>{dv}</p>
                  </div>
                  <p className='text-xs font-semibold text-green-500'>
                    {t('dashboard.live')}
                  </p>
                </div>
              ))
            )}
          </div>
          <XMarkIcon className='absolute top-2 right-2 w-5 h-5 text-gray-900 cursor-pointer dark:text-gray-50' onClick={() => setShow(!show)} />
        </div>
      )}
    </OutsideClickHandler>
  )
}

export default LiveVisitorsDropdown
