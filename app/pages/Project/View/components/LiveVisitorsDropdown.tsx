import React, { useState, useEffect } from 'react'
import _map from 'lodash/map'
import { useTranslation } from 'react-i18next'
// @ts-ignore
import OutsideClickHandler from 'react-outside-click-handler'
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Flag from 'react-flagkit'

import { getLiveVisitorsInfo, IGetLiveVisitorsInfo } from 'api'
import PulsatingCircle from 'ui/icons/PulsatingCircle'

interface ILiveVisitorsDropdown {
  live: number | string
  projectId: string
  projectPassword?: string
}

const LiveVisitorsDropdown = ({ live, projectId, projectPassword = '' }: ILiveVisitorsDropdown): JSX.Element => {
  const { t } = useTranslation()
  const [show, setShow] = useState<boolean>(false)
  const [liveInfo, setLiveInfo] = useState<IGetLiveVisitorsInfo[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const getLiveVisitors = async () => {
    try {
      const info = await getLiveVisitorsInfo(projectId, projectPassword)
      setLiveInfo(info)
    } catch (reason) {
      console.error('[LiveVisitorsDropdown] getLiveVisitors:', reason)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (show) {
      getLiveVisitors()
    }
  }, [show]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <OutsideClickHandler onOutsideClick={() => setShow(false)}>
      <p
        className='relative flex h-5 cursor-pointer items-center text-base text-gray-900 dark:text-gray-50'
        onClick={() => setShow(!show)}
      >
        <PulsatingCircle className='mr-1.5' type='small' />
        {t('dashboard.xLiveVisitors', {
          amount: live || 0,
        })}{' '}
        {show ? <ChevronUpIcon className='ml-1 inline h-4 w-4' /> : <ChevronDownIcon className='ml-1 inline h-4 w-4' />}
        {show && (
          <div
            className={`scrollbar-thin absolute right-0 top-3 z-10 mt-2 max-h-[200px] overflow-y-auto rounded-md border border-gray-200 bg-white text-gray-900 shadow-lg dark:border-slate-700/50 dark:bg-slate-900 ${
              liveInfo.length === 0 ? 'min-w-[200px]' : 'min-w-max'
            }`}
          >
            <div className='flex w-full flex-col p-2'>
              <p className='text-sm font-semibold text-gray-900 dark:text-gray-50'>{t('dashboard.liveVisitors')}</p>
              {loading ? (
                <p className='text-sm text-gray-900 dark:text-gray-50'>{t('common.loading')}</p>
              ) : (
                <table className='border-separate border-spacing-y-2'>
                  <tbody>
                    {_map(liveInfo, ({ dv, br, os, cc }, index) => (
                      <tr
                        key={`${dv}${br}${os}${cc}${index}`}
                        className='rounded-md text-sm text-gray-900 dark:text-gray-50'
                      >
                        <td className='rounded-l-lg bg-gray-100 pr-2 dark:bg-slate-800'>
                          <Flag className='m-2 rounded-sm' country={cc} size={21} alt='' aria-hidden='true' />
                        </td>
                        <td className='bg-gray-100 pr-2 dark:bg-slate-800'>{os}</td>
                        <td className='bg-gray-100 pr-2 dark:bg-slate-800'>{br}</td>
                        <td className='rounded-r-lg bg-gray-100 pr-2 dark:bg-slate-800'>
                          <p className='capitalize'>{dv}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <XMarkIcon
              className='absolute right-2 top-2 h-5 w-5 cursor-pointer text-gray-900 dark:text-gray-50'
              onClick={() => setShow(!show)}
            />
          </div>
        )}
      </p>
    </OutsideClickHandler>
  )
}

export default LiveVisitorsDropdown
