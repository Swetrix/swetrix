import cx from 'clsx'
import _filter from 'lodash/filter'
import _isEmpty from 'lodash/isEmpty'
import {
  BookmarkSimpleIcon,
  DownloadSimpleIcon,
  PencilIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams, useFetcher } from 'react-router'
import { toast } from 'sonner'

import { ProjectViewActionData } from '~/routes/projects.$id'
import Dropdown from '~/ui/Dropdown'
import { Text } from '~/ui/Text'
import { trackCustom } from '~/utils/analytics'

import { getFiltersUrlParams } from '../../View/components/SearchFilters'
import {
  Filter,
  ProjectView,
  ProjectViewCustomEvent,
} from '../../View/interfaces/traffic'

interface ExportType {
  label: string
  onClick: () => void
}

interface TrafficHeaderActionsProps {
  // Segments dropdown props
  projectViews: ProjectView[]
  projectViewsLoading: boolean | null
  loadProjectViews: (forced?: boolean) => void
  setProjectViewToUpdate: (view: ProjectView | undefined) => void
  setIsAddAViewOpened: (value: boolean) => void
  onCustomMetric: (metrics: ProjectViewCustomEvent[]) => void
  filters: Filter[]
  allowedToManage: boolean
  dataLoading: boolean

  // Export dropdown props
  exportTypes: ExportType[]
  panelsData: any
}

const TrafficHeaderActions = ({
  projectViews,
  projectViewsLoading,
  loadProjectViews,
  setProjectViewToUpdate,
  setIsAddAViewOpened,
  onCustomMetric,
  filters,
  allowedToManage,
  dataLoading,
  exportTypes,
}: TrafficHeaderActionsProps) => {
  const { t } = useTranslation('common')
  const [searchParams, setSearchParams] = useSearchParams()
  const deleteFetcher = useFetcher<ProjectViewActionData>()
  const isDeleting = deleteFetcher.state !== 'idle'
  const hasHandledDelete = useRef(false)

  useEffect(() => {
    if (deleteFetcher.state === 'submitting') {
      hasHandledDelete.current = false
    }
  }, [deleteFetcher.state])

  useEffect(() => {
    if (
      deleteFetcher.state === 'idle' &&
      deleteFetcher.data?.intent === 'delete-project-view' &&
      !hasHandledDelete.current
    ) {
      hasHandledDelete.current = true
      if (deleteFetcher.data.success) {
        toast.success(t('apiNotifications.segmentDeleted'))
        loadProjectViews(true)
      } else if (deleteFetcher.data.error) {
        toast.error(deleteFetcher.data.error)
      }
    }
  }, [deleteFetcher.state, deleteFetcher.data, loadProjectViews, t])

  return (
    <>
      {/* Segments Dropdown */}
      <Dropdown
        header={t('project.segments')}
        onClick={() => loadProjectViews()}
        loading={projectViewsLoading || projectViewsLoading === null}
        items={_filter(
          [
            ...projectViews,
            allowedToManage && {
              id: 'add-a-view',
              name: t('project.addASegment'),
              createView: true,
            },
            !allowedToManage &&
              _isEmpty(projectViews) && {
                id: 'no-views',
                name: t('project.noSegmentsYet'),
                notClickable: true,
              },
          ],
          (x) => !!x,
        )}
        title={[<BookmarkSimpleIcon key='bookmark-icon' className='h-5 w-5' />]}
        labelExtractor={(item, close) => {
          // @ts-expect-error
          if (item.createView) {
            return item.name
          }

          if (item.id === 'no-views') {
            return <Text colour='secondary'>{item.name}</Text>
          }

          return (
            <div
              className={cx('flex items-center justify-between space-x-4', {
                'cursor-wait': dataLoading,
              })}
            >
              <span>{item.name}</span>
              {allowedToManage ? (
                <div className='flex cursor-pointer space-x-1'>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setProjectViewToUpdate(item)
                      close()
                      setIsAddAViewOpened(true)
                    }}
                    aria-label={t('common.settings')}
                    className='rounded-md p-1 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                  >
                    <PencilIcon className='size-3' />
                  </button>
                  <deleteFetcher.Form method='post' className='inline'>
                    <input
                      type='hidden'
                      name='intent'
                      value='delete-project-view'
                    />
                    <input type='hidden' name='viewId' value={item.id} />
                    <button
                      type='submit'
                      onClick={(e) => {
                        e.stopPropagation()
                        close()
                      }}
                      disabled={isDeleting}
                      aria-label={t('common.delete')}
                      className={cx(
                        'rounded-md p-1 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 dark:hover:text-slate-200',
                        {
                          'cursor-not-allowed opacity-50': isDeleting,
                        },
                      )}
                    >
                      <TrashIcon className='size-3' />
                    </button>
                  </deleteFetcher.Form>
                </div>
              ) : null}
            </div>
          )
        }}
        keyExtractor={(item) => item.id}
        onSelect={(item: ProjectView, e) => {
          // @ts-expect-error
          if (item.createView) {
            e?.stopPropagation()
            setIsAddAViewOpened(true)

            return
          }

          if (item.filters && !_isEmpty(item.filters)) {
            const newUrlParams = getFiltersUrlParams(
              filters,
              item.filters,
              true,
              searchParams,
            )
            setSearchParams(newUrlParams)
          }

          if (item.customEvents && !_isEmpty(item.customEvents)) {
            onCustomMetric(item.customEvents)
          }
        }}
        chevron='mini'
        buttonClassName='!p-2 rounded-md hover:bg-white border border-gray-50/0 hover:border-gray-300 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:z-10 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200'
        headless
      />

      {/* Export Dropdown */}
      <Dropdown
        header={t('project.exportData')}
        items={exportTypes}
        title={[<DownloadSimpleIcon key='download-icon' className='h-5 w-5' />]}
        labelExtractor={(item) => item.label}
        keyExtractor={(item) => item.label}
        onSelect={(item) => {
          trackCustom('DASHBOARD_EXPORT', {
            type: 'csv',
          })

          item.onClick()
        }}
        chevron='mini'
        buttonClassName='!p-2 rounded-md hover:bg-white border border-gray-50/0 hover:border-gray-300 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:z-10 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:dark:ring-gray-200'
        headless
      />
    </>
  )
}

export default TrafficHeaderActions
