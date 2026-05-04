import { CaretDownIcon, XIcon } from '@phosphor-icons/react'
import _map from 'lodash/map'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { Link } from '~/ui/Link'

import type { LiveVisitorInfo } from '~/api/api.server'
import { useLiveVisitorsProxy } from '~/hooks/useAnalyticsProxy'
import { PROJECT_TABS } from '~/lib/constants'
import Flag from '~/ui/Flag'
import PulsatingCircle from '~/ui/icons/PulsatingCircle'
import Spin from '~/ui/icons/Spin'
import OutsideClickHandler from '~/ui/OutsideClickHandler'
import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'

import { useCurrentProject } from '../../../../providers/CurrentProjectProvider'

const LiveVisitorsDropdown = () => {
  const { id, liveVisitors, updateLiveVisitors } = useCurrentProject()
  const { t } = useTranslation()
  const location = useLocation()
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
            'flex cursor-pointer items-center rounded-md border border-transparent p-2 text-sm font-medium text-gray-900 transition-colors ring-inset hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-slate-900 focus:outline-hidden dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-900 dark:focus:ring-slate-300',
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
            'scrollbar-thin absolute top-full right-0 z-40 mt-2 w-max max-w-[calc(100vw-1rem)] origin-top-right transform cursor-auto overflow-hidden rounded-md border border-black/10 bg-white text-sm text-gray-900 shadow-md transition duration-150 ease-out outline-none max-sm:fixed max-sm:top-20 max-sm:right-2 max-sm:left-2 max-sm:w-auto max-sm:max-w-none dark:border-slate-700/50 dark:bg-slate-950 dark:text-gray-50',
            liveInfo.length === 0 || isLoading ? 'min-w-[200px]' : 'min-w-0',
            isDropdownVisible
              ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
              : 'pointer-events-none -translate-y-1 scale-95 opacity-0',
          )}
          aria-hidden={!isDropdownVisible}
        >
          <div className='flex w-full flex-col'>
            <div className='flex items-center justify-between border-b border-black/10 bg-white p-2 dark:border-slate-700/50 dark:bg-slate-950'>
              <Text as='p' size='sm' weight='semibold'>
                {t('dashboard.liveVisitors')}
              </Text>

              <button
                className='-m-1 rounded-md p-1 transition-colors hover:bg-gray-200 dark:hover:bg-slate-800'
                type='button'
                onClick={() => setIsDropdownVisible(false)}
              >
                <XIcon className='h-5 w-5 cursor-pointer rounded-md text-gray-900 dark:text-gray-50' />
              </button>
            </div>
            <div className='scrollbar-thin max-h-[min(320px,calc(100dvh-7rem))] overflow-y-auto px-2'>
              {isLoading ? (
                <Text as='p' size='sm' className='flex items-center py-2'>
                  <Spin className='ml-0' />

                  {t('common.loading')}
                </Text>
              ) : liveInfo.length === 0 ? (
                <Text as='p' size='sm' className='py-2'>
                  {t('project.noData')}
                </Text>
              ) : (
                <div className='flex w-full min-w-0 flex-col gap-2 py-2'>
                  {_map(liveInfo, ({ psid, dv, br, os, cc }) => {
                    const params = new URLSearchParams(location.search)
                    params.set('psid', psid)
                    params.set('tab', PROJECT_TABS.sessions)

                    return (
                      <Link
                        key={psid}
                        className='group grid min-w-0 cursor-pointer grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center overflow-hidden rounded-lg bg-gray-100 text-sm text-gray-900 transition-colors hover:bg-gray-200 dark:bg-slate-900 dark:text-gray-50 dark:hover:bg-slate-700'
                        to={{ search: params.toString() }}
                      >
                        <div className='pr-2'>
                          <Flag
                            className='m-2 rounded-xs'
                            country={cc}
                            size={21}
                            alt=''
                            aria-hidden='true'
                          />
                        </div>
                        <div className='min-w-0 truncate pr-2'>{os}</div>
                        <div className='min-w-0 truncate pr-2'>{br}</div>
                        <div className='min-w-0 truncate pr-2 capitalize'>
                          {dv}
                        </div>
                      </Link>
                    )
                  })}
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
