import cx from 'clsx'
import _filter from 'lodash/filter'
import _isEmpty from 'lodash/isEmpty'
import { BookmarkIcon, DownloadIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { isSelfhosted, MARKETPLACE_URL } from '~/lib/constants'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import Dropdown from '~/ui/Dropdown'
import { Text } from '~/ui/Text'
import { trackCustom } from '~/utils/analytics'

import { Filter, ProjectView, ProjectViewCustomEvent } from '../interfaces/traffic'

import { getFiltersUrlParams } from './SearchFilters'

interface ExportType {
  label: string
  onClick: (data: any, tFunction: any) => void
}

interface TrafficHeaderActionsProps {
  // Segments dropdown props
  projectViews: ProjectView[]
  projectViewsLoading: boolean | null
  projectViewDeleting: boolean
  loadProjectViews: () => Promise<void>
  onProjectViewDelete: (viewId: string) => Promise<void>
  setProjectViewToUpdate: (view: ProjectView | undefined) => void
  setIsAddAViewOpened: (value: boolean) => void
  onCustomMetric: (metrics: ProjectViewCustomEvent[]) => void
  filters: Filter[]
  allowedToManage: boolean
  dataLoading: boolean

  // Export dropdown props
  exportTypes: ExportType[]
  customExportTypes: ExportType[]
  panelsData: any
}

export const TrafficHeaderActions = ({
  projectViews,
  projectViewsLoading,
  projectViewDeleting,
  loadProjectViews,
  onProjectViewDelete,
  setProjectViewToUpdate,
  setIsAddAViewOpened,
  onCustomMetric,
  filters,
  allowedToManage,
  dataLoading,
  exportTypes,
  customExportTypes,
  panelsData,
}: TrafficHeaderActionsProps) => {
  const { t } = useTranslation('common')
  const { id } = useCurrentProject()
  const [searchParams, setSearchParams] = useSearchParams()

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
        title={[<BookmarkIcon key='bookmark-icon' className='h-5 w-5' />]}
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      close()
                      onProjectViewDelete(item.id)
                    }}
                    aria-label={t('common.settings')}
                    className={cx(
                      'rounded-md p-1 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 dark:hover:text-slate-200',
                      {
                        'cursor-not-allowed': projectViewDeleting,
                      },
                    )}
                  >
                    <Trash2Icon className='size-3' />
                  </button>
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
            const newUrlParams = getFiltersUrlParams(filters, item.filters, true, searchParams)
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
        items={_filter(
          [
            ...exportTypes,
            ...customExportTypes,
            !isSelfhosted && {
              label: t('project.lookingForMore'),
              lookingForMore: true,
              onClick: () => {},
            },
          ],
          (el) => !!el,
        )}
        title={[<DownloadIcon key='download-icon' className='h-5 w-5' />]}
        labelExtractor={(item) => item.label}
        keyExtractor={(item) => item.label}
        onSelect={(item, e) => {
          // @ts-expect-error lookingForMore is defined as an exception above
          if (item.lookingForMore) {
            e?.stopPropagation()
            window.open(MARKETPLACE_URL, '_blank')

            return
          }

          trackCustom('DASHBOARD_EXPORT', {
            type: item.label === t('project.asCSV') ? 'csv' : 'extension',
          })

          item.onClick(panelsData, t)
        }}
        chevron='mini'
        buttonClassName='!p-2 rounded-md hover:bg-white border border-gray-50/0 hover:border-gray-300 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:z-10 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:dark:ring-gray-200'
        headless
      />
    </>
  )
}

export default TrafficHeaderActions
