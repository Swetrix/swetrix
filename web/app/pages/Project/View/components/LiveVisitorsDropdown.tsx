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
            'scrollbar-thin absolute top-full right-0 z-40 mt-1 max-w-[calc(100vw-1rem)] origin-top-right transform cursor-auto overflow-hidden rounded-md border border-black/10 bg-white text-xs text-gray-900 shadow-md transition duration-150 ease-out outline-none max-sm:fixed max-sm:top-20 max-sm:right-2 max-sm:left-2 max-sm:w-auto max-sm:max-w-none sm:w-[250px] dark:border-slate-700/50 dark:bg-slate-950 dark:text-gray-50',
            liveInfo.length === 0 || isLoading ? 'min-w-[200px]' : 'min-w-0',
            isDropdownVisible
              ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
              : 'pointer-events-none -translate-y-1 scale-95 opacity-0',
          )}
          aria-hidden={!isDropdownVisible}
        >
          <div className='flex w-full flex-col'>
            <div className='flex items-center justify-between border-b border-black/10 bg-white px-2 py-1.5 dark:border-slate-700/50 dark:bg-slate-950'>
              <Text as='p' size='xs' weight='semibold'>
                {t('dashboard.liveVisitors')}
              </Text>

              <button
                className='-m-1 rounded-md p-1 transition-colors hover:bg-gray-200 dark:hover:bg-slate-800'
                type='button'
                onClick={() => setIsDropdownVisible(false)}
              >
                <XIcon className='h-4 w-4 cursor-pointer rounded-md text-gray-900 dark:text-gray-50' />
              </button>
            </div>
            <div className='scrollbar-thin max-h-72 overflow-y-auto px-1.5 max-sm:max-h-[calc(100dvh-7rem)] sm:max-h-80'>
              {isLoading ? (
                <Text as='p' size='xs' className='flex items-center py-2'>
                  <Spin className='ml-0' />

                  {t('common.loading')}
                </Text>
              ) : liveInfo.length === 0 ? (
                <Text as='p' size='xs' className='py-2'>
                  {t('project.noData')}
                </Text>
              ) : (
                <div className='flex w-full min-w-0 flex-col gap-1.5 py-1.5'>
                  {_map(liveInfo, ({ psid, dv, br, os, cc }) => {
                    const params = new URLSearchParams(location.search)
                    params.set('psid', psid)
                    params.set('tab', PROJECT_TABS.sessions)

                    return (
                      <Link
                        key={psid}
                        className='group grid min-w-0 cursor-pointer grid-cols-[auto_4.75rem_minmax(0,1fr)_4.25rem] items-center gap-x-2 overflow-hidden rounded-md bg-gray-100 px-2 py-1.5 text-xs leading-5 text-gray-900 transition-colors hover:bg-gray-200 dark:bg-slate-900 dark:text-gray-50 dark:hover:bg-slate-700'
                        to={{ search: params.toString() }}
                      >
                        <div className='flex w-5 shrink-0 items-center'>
                          <Flag
                            className='rounded-xs'
                            country={cc}
                            size={18}
                            alt=''
                            aria-hidden='true'
                          />
                        </div>
                        <div className='min-w-0 truncate'>{os}</div>
                        <div className='min-w-0 truncate'>{br}</div>
                        <div className='min-w-0 truncate capitalize'>{dv}</div>
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
