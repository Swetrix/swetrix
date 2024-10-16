import React, { useState, useEffect } from 'react'
import _map from 'lodash/map'
import { useTranslation } from 'react-i18next'
import OutsideClickHandler from 'react-outside-click-handler'
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline'

import { getLiveVisitorsInfo, IGetLiveVisitorsInfo } from 'api'
import PulsatingCircle from 'ui/icons/PulsatingCircle'
import Flag from 'ui/Flag'
import { useViewProjectContext } from '../ViewProject'
import { Link } from '@remix-run/react'
import { PROJECT_TABS } from 'redux/constants'

interface ILiveVisitorsDropdown {
  live: number | string
  onSessionSelect: (psid: string) => void
}

const LiveVisitorsDropdown = ({ live, onSessionSelect }: ILiveVisitorsDropdown): JSX.Element => {
  const { projectId, projectPassword } = useViewProjectContext()
  const { t } = useTranslation()
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(true)
  const [liveInfo, setLiveInfo] = useState<IGetLiveVisitorsInfo[]>([])

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
      <div
        className='relative flex h-5 cursor-pointer items-center text-base text-gray-900 dark:text-gray-50'
        onClick={() => setShow(!show)}
      >
        <PulsatingCircle className='mr-1.5' type='small' />
        {t('dashboard.xLiveVisitors', {
          amount: live || 0,
        })}{' '}
        {show ? <ChevronUpIcon className='ml-1 inline h-4 w-4' /> : <ChevronDownIcon className='ml-1 inline h-4 w-4' />}
        {show ? (
          <div
            className={`scrollbar-thin absolute right-0 top-3 z-10 mt-2 max-h-[200px] cursor-auto overflow-y-auto rounded-md border border-gray-200 bg-white text-gray-900 shadow-lg dark:border-slate-700/50 dark:bg-slate-900 ${
              liveInfo.length === 0 ? 'min-w-[200px]' : 'min-w-max'
            }`}
          >
            <div className='flex w-full flex-col p-2'>
              <p className='text-sm font-semibold text-gray-900 dark:text-gray-50'>{t('dashboard.liveVisitors')}</p>
              {loading ? (
                <p className='text-sm text-gray-900 dark:text-gray-50'>{t('common.loading')}</p>
              ) : (
                <div className='table w-full border-separate border-spacing-y-2'>
                  <div className='table-row-group'>
                    {_map(liveInfo, ({ psid, dv, br, os, cc }) => {
                      const psidUrl = new URL(window.location.href)
                      psidUrl.searchParams.set('psid', psid)
                      psidUrl.searchParams.set('tab', PROJECT_TABS.sessions)
                      const stringifiedUrl = psidUrl.toString()

                      return (
                        <Link
                          key={psid}
                          className='group table-row cursor-pointer text-sm text-gray-900 dark:text-gray-50'
                          onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                            e.preventDefault()
                            e.stopPropagation()
                            window.history.pushState({}, '', stringifiedUrl)

                            onSessionSelect(psid)
                          }}
                          to={stringifiedUrl}
                        >
                          <div className='table-cell rounded-l-lg bg-gray-100 pr-2 align-middle group-hover:bg-gray-200 dark:bg-slate-800 dark:group-hover:bg-slate-700'>
                            <Flag className='m-2 rounded-sm' country={cc} size={21} alt='' aria-hidden='true' />
                          </div>
                          <div className='table-cell bg-gray-100 pr-2 align-middle group-hover:bg-gray-200 dark:bg-slate-800 dark:group-hover:bg-slate-700'>
                            {os}
                          </div>
                          <div className='table-cell bg-gray-100 pr-2 align-middle group-hover:bg-gray-200 dark:bg-slate-800 dark:group-hover:bg-slate-700'>
                            {br}
                          </div>
                          <div className='table-cell rounded-r-lg bg-gray-100 pr-2 align-middle group-hover:bg-gray-200 dark:bg-slate-800 dark:group-hover:bg-slate-700'>
                            <p className='capitalize'>{dv}</p>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <XMarkIcon
              className='absolute right-2 top-2 h-5 w-5 cursor-pointer text-gray-900 dark:text-gray-50'
              onClick={() => setShow(!show)}
            />
          </div>
        ) : null}
      </div>
    </OutsideClickHandler>
  )
}

export default LiveVisitorsDropdown
