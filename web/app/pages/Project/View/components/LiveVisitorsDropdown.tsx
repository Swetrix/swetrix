import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline'
import _map from 'lodash/map'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { getLiveVisitorsInfo, GetLiveVisitorsInfo } from '~/api'
import { PROJECT_TABS } from '~/lib/constants'
import Flag from '~/ui/Flag'
import PulsatingCircle from '~/ui/icons/PulsatingCircle'
import Spin from '~/ui/icons/Spin'
import OutsideClickHandler from '~/ui/OutsideClickHandler'

import { useCurrentProject, useProjectPassword } from '../../../../providers/CurrentProjectProvider'

const LiveVisitorsDropdown = () => {
  const { id, liveVisitors, updateLiveVisitors } = useCurrentProject()
  const projectPassword = useProjectPassword(id)
  const { t } = useTranslation()
  const [isDropdownVisible, setIsDropdownVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [liveInfo, setLiveInfo] = useState<GetLiveVisitorsInfo[]>([])

  const getLiveVisitors = async () => {
    setIsLoading(true)

    try {
      // Getting live sessions list and updating live visitors count to make sure it matches the list length
      const [info] = await Promise.all([getLiveVisitorsInfo(id, projectPassword), updateLiveVisitors()])
      setLiveInfo(info)
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
      <div
        className='relative flex h-5 cursor-pointer items-center text-base text-gray-900 dark:text-gray-50'
        onClick={onOpen}
      >
        <PulsatingCircle className='mr-1.5' type='small' />
        <span>
          {t('dashboard.xLiveVisitors', {
            amount: liveVisitors,
          })}{' '}
        </span>
        {isDropdownVisible ? (
          <ChevronUpIcon className='ml-1 inline h-4 w-4' />
        ) : (
          <ChevronDownIcon className='ml-1 inline h-4 w-4' />
        )}
        {isDropdownVisible ? (
          <div
            className={`scrollbar-thin absolute top-3 right-0 z-10 mt-2 max-h-[200px] cursor-auto overflow-y-auto rounded-md border border-black/10 bg-white text-gray-900 dark:border-slate-700/50 dark:bg-slate-900 ${
              liveInfo.length === 0 || isLoading ? 'min-w-[200px]' : 'min-w-max'
            }`}
          >
            <div className='flex w-full flex-col p-2'>
              <p className='text-sm font-semibold text-gray-900 dark:text-gray-50'>{t('dashboard.liveVisitors')}</p>
              {isLoading ? (
                <p className='mt-2 flex items-center text-sm text-gray-900 dark:text-gray-50'>
                  <Spin className='ml-0' />

                  {t('common.loading')}
                </p>
              ) : liveInfo.length === 0 ? (
                <p className='mt-2 text-sm text-gray-900 dark:text-gray-50'>{t('project.noData')}</p>
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
                          <div className='table-cell rounded-l-lg bg-gray-100 pr-2 align-middle group-hover:bg-gray-200 dark:bg-slate-800 dark:group-hover:bg-slate-700'>
                            <Flag className='m-2 rounded-xs' country={cc} size={21} alt='' aria-hidden='true' />
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
              className='absolute top-2 right-2 h-5 w-5 cursor-pointer text-gray-900 dark:text-gray-50'
              onClick={() => setIsDropdownVisible(false)}
            />
          </div>
        ) : null}
      </div>
    </OutsideClickHandler>
  )
}

export default LiveVisitorsDropdown
