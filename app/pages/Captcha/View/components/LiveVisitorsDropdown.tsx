import React, { useState, useEffect } from 'react'
import _map from 'lodash/map'
import { useTranslation } from 'react-i18next'
// @ts-ignore
import OutsideClickHandler from 'react-outside-click-handler'
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Flag from 'react-flagkit'

import { getLiveVisitorsInfo, IGetLiveVisitorsInfo } from 'api'

const LiveVisitorsDropdown = ({ live, projectId }: { live: number | string; projectId: string }): JSX.Element => {
  const { t } = useTranslation()
  const [show, setShow] = useState<boolean>(false)
  const [liveInfo, setLiveInfo] = useState<IGetLiveVisitorsInfo[]>([])
  const [loading, setLoading] = useState<boolean>(true)

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

  return (
    <OutsideClickHandler onOutsideClick={() => setShow(false)}>
      <p className='mr-2 h-5 cursor-pointer text-xl text-gray-900 dark:text-gray-50' onClick={() => setShow(!show)}>
        {live} {show ? <ChevronUpIcon className='inline h-5 w-5' /> : <ChevronDownIcon className='inline h-5 w-5' />}
      </p>
      {show && (
        <div className='absolute right-0 top-20 z-10 mt-2 max-h-[200px] min-w-[250px] overflow-auto rounded-md border border-gray-200 bg-white text-gray-900 shadow-lg dark:border-slate-700/50 dark:bg-slate-900'>
          <div className='flex w-full flex-col p-2'>
            <p className='text-sm font-semibold text-gray-900 dark:text-gray-50'>{t('dashboard.liveVisitors')}</p>
            {loading ? (
              <p className='text-sm text-gray-900 dark:text-gray-50'>{t('common.loading')}</p>
            ) : (
              _map(liveInfo, ({ dv, br, os, cc }, index) => (
                <div
                  key={`${dv}${br}${os}${cc}${index}`}
                  className='mt-2 flex w-full flex-row items-center justify-between rounded-md bg-gray-100 p-2 text-sm text-gray-900 dark:bg-slate-800 dark:text-gray-50'
                >
                  <div className='flex flex-row items-center'>
                    <Flag className='mr-2 rounded-sm' country={cc} size={21} alt='' aria-hidden='true' />
                    <p className='mr-2'>{os}</p>
                    <p className='mr-2'>{br}</p>
                    <p className='mr-2 capitalize'>{dv}</p>
                  </div>
                  <p className='text-xs font-semibold text-green-500'>{t('dashboard.live')}</p>
                </div>
              ))
            )}
          </div>
          <XMarkIcon
            className='absolute right-2 top-2 h-5 w-5 cursor-pointer rounded-md text-gray-900 hover:bg-gray-200 dark:text-gray-50 hover:dark:bg-slate-800 '
            onClick={() => setShow(!show)}
          />
        </div>
      )}
    </OutsideClickHandler>
  )
}

export default LiveVisitorsDropdown
