import cx from 'clsx'
import {
  BookmarkSimpleIcon,
  DownloadSimpleIcon,
  PencilIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import React, { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { V2Filter } from '~/api/v2/types'
import { PROJECT_TABS } from '~/lib/constants'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { ProjectViewActionData } from '~/routes/projects.$id'
import Dropdown from '~/ui/Dropdown'
import { Text } from '~/ui/Text'
import { trackCustom } from '~/utils/analytics'

import { ProjectView } from '../interfaces/traffic'
import {
  projectViewFiltersToV2,
  splitProjectViewFiltersByTab,
  supportsProjectViewSegments,
} from '../utils/projectViewSegments'
import { useViewProjectContext } from '../ViewProject'

import { getFiltersUrlParams } from './SearchFilters'

interface ExportType {
  label: string
  onClick: () => void
}

interface ProjectViewHeaderActionsProps {
  tnMapping: Record<string, string>
  exportTypes?: ExportType[]
  extraActions?: React.ReactNode
}

type AddViewItem = {
  id: 'add-a-view'
  name: string
  createView: true
}

type EmptyViewItem = {
  id: 'no-views'
  name: string
  notClickable: true
}

type ProjectViewMenuItem = ProjectView | AddViewItem | EmptyViewItem

const isAddViewItem = (item: ProjectViewMenuItem): item is AddViewItem =>
  'createView' in item

const isEmptyViewItem = (item: ProjectViewMenuItem): item is EmptyViewItem =>
  'notClickable' in item

const iconButtonClassName =
  'rounded-md p-1 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-900 dark:hover:text-slate-200'

const dropdownButtonClassName =
  '!p-2 rounded-md hover:bg-white border border-gray-50/0 hover:border-gray-300 hover:dark:border-slate-700/80 dark:hover:bg-slate-900 focus:z-10 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300'

const ProjectViewHeaderActions = ({
  tnMapping,
  exportTypes = [],
  extraActions,
}: ProjectViewHeaderActionsProps) => {
  const { allowedToManage } = useCurrentProject()
  const {
    activeTab,
    dataLoading,
    filters,
    projectViews,
    projectViewsLoading,
    loadProjectViews,
    setProjectViewToUpdate,
    setIsAddAViewOpened,
  } = useViewProjectContext()
  const { t } = useTranslation('common')
  const [searchParams, setSearchParams] = useSearchParams()
  const deleteFetcher = useFetcher<ProjectViewActionData>()
  const hasHandledDelete = useRef(false)
  const showSegments = supportsProjectViewSegments(activeTab)
  const isDeleting = deleteFetcher.state !== 'idle'

  const segmentItems = useMemo<ProjectViewMenuItem[]>(() => {
    const items: ProjectViewMenuItem[] = [...projectViews]

    if (allowedToManage) {
      items.push({
        id: 'add-a-view',
        name: t('project.addASegment'),
        createView: true,
      })
    } else if (projectViews.length === 0) {
      items.push({
        id: 'no-views',
        name: t('project.noSegmentsYet'),
        notClickable: true,
      })
    }

    return items
  }, [allowedToManage, projectViews, t])

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

  const getFilterColumnLabel = (filter: V2Filter) => {
    if (filter.key) {
      return t(
        `project.metamapping.${filter.dimension === 'page_property' ? 'tag' : 'ev'}.dynamicKey`,
        {
          key: filter.key,
        },
      )
    }

    return (
      tnMapping[filter.dimension] ||
      t(`project.mapping.${filter.dimension}`, {
        defaultValue: filter.dimension,
      })
    )
  }

  return (
    <>
      {showSegments ? (
        <Dropdown
          header={t('project.segments')}
          onClick={() => loadProjectViews()}
          loading={projectViewsLoading || projectViewsLoading === null}
          items={segmentItems}
          title={[
            <BookmarkSimpleIcon key='bookmark-icon' className='h-5 w-5' />,
          ]}
          labelExtractor={(item, close) => {
            if (isAddViewItem(item)) {
              return item.name
            }

            if (isEmptyViewItem(item)) {
              return <Text colour='secondary'>{item.name}</Text>
            }

            const { supported, unsupported } = splitProjectViewFiltersByTab(
              projectViewFiltersToV2(item),
              activeTab,
            )
            const hasTrafficMetrics = (item.customEvents?.length || 0) > 0
            const trafficMetricsSkipped =
              activeTab !== PROJECT_TABS.traffic && hasTrafficMetrics
            const canApply =
              supported.length > 0 ||
              (activeTab === PROJECT_TABS.traffic && hasTrafficMetrics)
            const unsupportedTitle = unsupported
              .map(getFilterColumnLabel)
              .join(', ')

            return (
              <div
                className={cx(
                  'flex min-w-[230px] items-center justify-between gap-4',
                  {
                    'cursor-wait': dataLoading,
                  },
                )}
              >
                <div
                  className={cx('min-w-0', {
                    'opacity-60': !canApply,
                  })}
                >
                  <span className='block truncate'>{item.name}</span>
                  {unsupported.length > 0 || trafficMetricsSkipped ? (
                    <div className='mt-1 flex flex-wrap gap-1'>
                      {unsupported.length > 0 ? (
                        <span
                          title={unsupportedTitle}
                          className='rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200 ring-inset dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20'
                        >
                          {t('project.segmentUnsupportedFilters', {
                            count: unsupported.length,
                          })}
                        </span>
                      ) : null}
                      {trafficMetricsSkipped ? (
                        <span className='rounded-md bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200 ring-inset dark:bg-slate-800/60 dark:text-gray-300 dark:ring-slate-700/60'>
                          {t('project.segmentTrafficMetricsOnly')}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {!canApply && (item.filters?.length || 0) > 0 ? (
                    <span className='mt-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400'>
                      {t('project.segmentNoCompatibleFilters')}
                    </span>
                  ) : null}
                </div>
                {allowedToManage ? (
                  <div className='flex shrink-0 cursor-pointer space-x-1'>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setProjectViewToUpdate(item)
                        close()
                        setIsAddAViewOpened(true)
                      }}
                      aria-label={t('common.settings')}
                      className={iconButtonClassName}
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
                        className={cx(iconButtonClassName, {
                          'cursor-not-allowed opacity-50': isDeleting,
                        })}
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
          onSelect={(item, e) => {
            if (isAddViewItem(item)) {
              e?.stopPropagation()
              setIsAddAViewOpened(true)
              return
            }

            if (isEmptyViewItem(item)) {
              return
            }

            const { supported } = splitProjectViewFiltersByTab(
              projectViewFiltersToV2(item),
              activeTab,
            )
            const hasSupportedFilters = supported.length > 0
            const hasTrafficMetrics =
              activeTab === PROJECT_TABS.traffic &&
              (item.customEvents?.length || 0) > 0

            if (!hasSupportedFilters && !hasTrafficMetrics) {
              e?.preventDefault()
              return
            }

            let newParams = new URLSearchParams(searchParams)

            newParams.delete('metrics')

            newParams = getFiltersUrlParams(filters, supported, true, newParams)

            if (hasTrafficMetrics) {
              newParams.set('metrics', JSON.stringify(item.customEvents))
            } else {
              newParams.delete('metrics')
            }

            setSearchParams(newParams)
          }}
          chevron='mini'
          buttonClassName={dropdownButtonClassName}
          headless
        />
      ) : null}

      {extraActions}

      {exportTypes.length > 0 ? (
        <Dropdown
          header={t('project.exportData')}
          items={exportTypes}
          title={[
            <DownloadSimpleIcon key='download-icon' className='h-5 w-5' />,
          ]}
          labelExtractor={(item) => item.label}
          keyExtractor={(item) => item.label}
          onSelect={(item) => {
            trackCustom('DASHBOARD_EXPORT', {
              type: 'csv',
            })

            item.onClick()
          }}
          chevron='mini'
          buttonClassName={dropdownButtonClassName}
          headless
        />
      ) : null}
    </>
  )
}

export default ProjectViewHeaderActions
