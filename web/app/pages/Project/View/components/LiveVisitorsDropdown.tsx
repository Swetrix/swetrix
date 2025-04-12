import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline'
import _map from 'lodash/map'
import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import OutsideClickHandler from 'react-outside-click-handler'
import { Link } from 'react-router'

import { getLiveVisitorsInfo, GetLiveVisitorsInfo } from '~/api'
import { PROJECT_TABS } from '~/lib/constants'
import Flag from '~/ui/Flag'
import PulsatingCircle from '~/ui/icons/PulsatingCircle'

import { useCurrentProject, useProjectPassword } from '../providers/CurrentProjectProvider'

interface LiveVisitorsDropdownProps {
  live: number | string
  onSessionSelect: (psid: string) => void
}

const LiveVisitorsDropdown = ({ live, onSessionSelect }: LiveVisitorsDropdownProps) => {
  const { id } = useCurrentProject()
  const projectPassword = useProjectPassword(id)
  const { t } = useTranslation()
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(true)
  const [liveInfo, setLiveInfo] = useState<GetLiveVisitorsInfo[]>([])

  const getLiveVisitors = async () => {
    try {
      const info = await getLiveVisitorsInfo(id, projectPassword)
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
        className='relative flex h-5 cursor-pointer items-center font-mono text-base text-gray-900 dark:text-gray-50'
        onClick={() => setShow(!show)}
      >
        <PulsatingCircle className='mr-1.5' type='small' />
        <span className='tracking-tighter'>
          {t('dashboard.xLiveVisitors', {
            amount: live || 0,
          })}{' '}
        </span>
        {show ? <ChevronUpIcon className='ml-1 inline h-4 w-4' /> : <ChevronDownIcon className='ml-1 inline h-4 w-4' />}
        {show ? (
          <div
            className={`scrollbar-thin absolute top-3 right-0 z-10 mt-2 max-h-[200px] cursor-auto overflow-y-auto rounded-md border border-black/10 bg-white text-gray-900 dark:border-slate-700/50 dark:bg-slate-900 ${
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
              onClick={() => setShow(!show)}
            />
          </div>
        ) : null}
      </div>
    </OutsideClickHandler>
  )
}

export default LiveVisitorsDropdown
