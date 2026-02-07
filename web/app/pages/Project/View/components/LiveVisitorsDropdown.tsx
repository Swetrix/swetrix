import { CaretDownIcon, XIcon } from '@phosphor-icons/react'
import _map from 'lodash/map'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import type { LiveVisitorInfo } from '~/api/api.server'
import { useLiveVisitorsProxy } from '~/hooks/useAnalyticsProxy'
import { PROJECT_TABS } from '~/lib/constants'
import Flag from '~/ui/Flag'
import PulsatingCircle from '~/ui/icons/PulsatingCircle'
import Spin from '~/ui/icons/Spin'
import OutsideClickHandler from '~/ui/OutsideClickHandler'
import { cn } from '~/utils/generic'

import { useCurrentProject } from '../../../../providers/CurrentProjectProvider'

const LiveVisitorsDropdown = () => {
  const { id, liveVisitors, updateLiveVisitors } = useCurrentProject()
  const { t } = useTranslation()
  const [isDropdownVisible, setIsDropdownVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [liveInfo, setLiveInfo] = useState<LiveVisitorInfo[]>([])
  const { fetchLiveVisitorsInfo } = useLiveVisitorsProxy()

  const getLiveVisitors = async () => {
    setIsLoading(true)

    try {
      // Getting live sessions list and updating live visitors count to make sure it matches the list length
      const [info] = await Promise.all([
        fetchLiveVisitorsInfo(id),
        updateLiveVisitors(),
      ])
      setLiveInfo(info || [])
    } catch (reason) {
      console.error('[LiveVisitorsDropdown] getLiveVisitors:', reason)
    }

    setIsLoading(false)
  }

  const onOpen = async () => {
    if (isDropdownVisible) {
      setIsDropdownVisible(false)
      return
    }

    setIsDropdownVisible(true)
    await getLiveVisitors()
  }

  return (
    <OutsideClickHandler onOutsideClick={() => setIsDropdownVisible(false)}>
      <div className='relative'>
        <button
          type='button'
          aria-expanded={isDropdownVisible}
          aria-controls='live-visitors-dropdown'
          className={cn(
            'flex cursor-pointer items-center rounded-md border border-transparent p-2 text-sm font-medium text-gray-900 transition-colors ring-inset hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-900 focus:dark:ring-gray-200',
          )}
          onClick={onOpen}
        >
          <PulsatingCircle className='mr-1.5' type='small' />
          <span>
            {t('dashboard.xLiveVisitors', {
              amount: liveVisitors,
            })}{' '}
          </span>
          <CaretDownIcon
            className={cn(
              'ml-1 inline h-4 w-4 transition-transform duration-150 ease-out',
              {
                'rotate-180': isDropdownVisible,
              },
            )}
          />
        </button>

        <div
          id='live-visitors-dropdown'
          className={cn(
            'scrollbar-thin absolute top-5 right-0 z-40 mt-2 origin-top-right transform cursor-auto overflow-hidden rounded-md border border-black/10 bg-white text-gray-900 shadow-lg transition duration-150 ease-out outline-none dark:border-slate-700/50 dark:bg-slate-950',
            liveInfo.length === 0 || isLoading ? 'min-w-[200px]' : 'min-w-max',
            isDropdownVisible
              ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
              : 'pointer-events-none -translate-y-1 scale-95 opacity-0',
          )}
          aria-hidden={!isDropdownVisible}
        >
          <div className='flex w-full flex-col'>
            <div className='flex items-center justify-between border-b border-black/10 bg-white p-2 dark:border-slate-700/50 dark:bg-slate-950'>
              <p className='text-sm font-semibold text-gray-900 dark:text-gray-50'>
                {t('dashboard.liveVisitors')}
              </p>

              <button
                className='-m-1 rounded-md p-1 transition-colors hover:bg-gray-200 dark:hover:bg-slate-700'
                type='button'
                onClick={() => setIsDropdownVisible(false)}
              >
                <XIcon className='h-5 w-5 cursor-pointer rounded-md text-gray-900 dark:text-gray-50' />
              </button>
            </div>
            <div className='scrollbar-thin max-h-[200px] overflow-y-auto px-2'>
              {isLoading ? (
                <p className='flex items-center py-2 text-sm text-gray-900 dark:text-gray-50'>
                  <Spin className='ml-0' />

                  {t('common.loading')}
                </p>
              ) : liveInfo.length === 0 ? (
                <p className='py-2 text-sm text-gray-900 dark:text-gray-50'>
                  {t('project.noData')}
                </p>
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
                          to={stringifiedUrl}
                        >
                          <div className='table-cell rounded-l-lg bg-gray-100 pr-2 align-middle transition-colors group-hover:bg-gray-200 dark:bg-slate-900 dark:group-hover:bg-slate-700'>
                            <Flag
                              className='m-2 rounded-xs'
                              country={cc}
                              size={21}
                              alt=''
                              aria-hidden='true'
                            />
                          </div>
                          <div className='table-cell bg-gray-100 pr-2 align-middle transition-colors group-hover:bg-gray-200 dark:bg-slate-900 dark:group-hover:bg-slate-700'>
                            {os}
                          </div>
                          <div className='table-cell bg-gray-100 pr-2 align-middle transition-colors group-hover:bg-gray-200 dark:bg-slate-900 dark:group-hover:bg-slate-700'>
                            {br}
                          </div>
                          <div className='table-cell rounded-r-lg bg-gray-100 pr-2 align-middle transition-colors group-hover:bg-gray-200 dark:bg-slate-900 dark:group-hover:bg-slate-700'>
                            <p className='capitalize'>{dv}</p>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </OutsideClickHandler>
  )
}

export default LiveVisitorsDropdown
