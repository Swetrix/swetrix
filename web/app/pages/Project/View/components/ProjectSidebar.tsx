import cx from 'clsx'
import _map from 'lodash/map'
import { ChevronDownIcon, ChevronRightIcon, SettingsIcon } from 'lucide-react'
import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, LinkProps } from 'react-router'

import { PROJECT_TABS } from '~/lib/constants'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import routes from '~/utils/routes'

type ProjectTabKey = keyof typeof PROJECT_TABS | 'settings'

const ICON_COLORS: Record<string, string> = {
  // Ask AI
  ai: 'text-violet-500',
  // Web Analytics
  traffic: 'text-blue-500',
  performance: 'text-amber-500',
  alerts: 'text-cyan-500',
  // Product Analytics
  profiles: 'text-indigo-500',
  sessions: 'text-indigo-500',
  errors: 'text-red-500',
  funnels: 'text-teal-500',
  goals: 'text-purple-500',
  // CAPTCHA
  captcha: 'text-emerald-500',
  // Settings
  settings: 'text-gray-500',
}

interface Tab {
  id: ProjectTabKey
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

interface TabGroup {
  id: string
  label: string
  tabs: Tab[]
}

interface ProjectSidebarProps {
  tabs: Tab[]
  activeTab: ProjectTabKey
  onTabChange: (tabId: keyof typeof PROJECT_TABS) => void
  projectId: string
  projectName: string
  dataLoading?: boolean
  searchParams: URLSearchParams
  allowedToManage?: boolean
}

const CollapsibleGroup: React.FC<{
  group: TabGroup
  activeTab: ProjectTabKey
  onTabChange: (tabId: keyof typeof PROJECT_TABS) => void
  projectId: string
  dataLoading?: boolean
  searchParams: URLSearchParams
}> = ({ group, activeTab, onTabChange, projectId, dataLoading, searchParams }) => {
  const [isExpanded, setIsExpanded] = useState(true)

  const hasActiveTab = useMemo(() => {
    return group.tabs.some((tab) => tab.id === activeTab)
  }, [group.tabs, activeTab])

  React.useEffect(() => {
    if (hasActiveTab && !isExpanded) {
      setIsExpanded(true)
    }
  }, [hasActiveTab]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className='mb-1'>
      <button
        type='button'
        onClick={() => setIsExpanded(!isExpanded)}
        className='group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/60'
      >
        <Text as='span' size='xs' colour='secondary' weight='semibold' truncate className='max-w-full'>
          {group.label}
        </Text>
        {isExpanded ? (
          <ChevronDownIcon className='size-3.5 text-gray-400' strokeWidth={2} />
        ) : (
          <ChevronRightIcon className='size-3.5 text-gray-400' strokeWidth={2} />
        )}
      </button>

      <div
        className={cx('overflow-hidden transition-all duration-200 ease-in-out', {
          'max-h-96 opacity-100': isExpanded,
          'max-h-0 opacity-0': !isExpanded,
        })}
      >
        <nav className='mt-1 flex flex-col gap-0.5 pl-2'>
          {_map(group.tabs, (tab) => {
            const isCurrent = tab.id === activeTab
            const TabIcon = tab.icon
            const iconColorClass = ICON_COLORS[tab.id] || 'text-gray-500'

            const handleClick = (e: React.MouseEvent) => {
              if (tab.id === 'settings') {
                return // Let the Link handle navigation
              }

              e.preventDefault()
              if (!dataLoading) {
                onTabChange(tab.id as keyof typeof PROJECT_TABS)
              }
            }

            const newSearchParams = new URLSearchParams(searchParams.toString())
            newSearchParams.set('tab', tab.id)
            const tabUrl: LinkProps['to'] =
              tab.id === 'settings'
                ? routes.project_settings.replace(':id', projectId)
                : { search: newSearchParams.toString() }

            return (
              <Link
                key={tab.id}
                to={tabUrl}
                onClick={handleClick}
                className={cx('group flex items-center gap-1.5 rounded-md px-2.5 py-2 transition-colors', {
                  'bg-gray-100 dark:bg-slate-800': isCurrent,
                  'hover:bg-gray-100 dark:hover:bg-slate-800/60': !isCurrent,
                  'cursor-wait': dataLoading && tab.id !== 'settings',
                })}
                aria-current={isCurrent ? 'page' : undefined}
              >
                <TabIcon className={cx('size-4 shrink-0', iconColorClass)} strokeWidth={1.5} aria-hidden='true' />
                <Text as='span' size='sm' weight='medium' truncate className='max-w-full'>
                  {tab.label}
                </Text>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  tabs,
  activeTab,
  onTabChange,
  projectId,
  projectName,
  dataLoading,
  searchParams,
  allowedToManage,
}) => {
  const { t } = useTranslation('common')

  // Find Ask AI tab (standalone, not in a group)
  const askAiTab = useMemo(() => {
    return tabs.find((tab) => tab.id === PROJECT_TABS.ai)
  }, [tabs])

  // Group tabs by category
  const tabGroups = useMemo<TabGroup[]>(() => {
    const groups: TabGroup[] = []

    const webAnalyticsTabs = tabs.filter((tab) =>
      [PROJECT_TABS.traffic, PROJECT_TABS.performance, PROJECT_TABS.alerts].includes(tab.id as any),
    )
    if (webAnalyticsTabs.length > 0) {
      groups.push({
        id: 'webAnalytics',
        label: t('dashboard.webAnalytics'),
        tabs: webAnalyticsTabs,
      })
    }

    const productAnalyticsTabs = tabs.filter((tab) =>
      [
        PROJECT_TABS.profiles,
        PROJECT_TABS.sessions,
        PROJECT_TABS.funnels,
        PROJECT_TABS.errors,
        PROJECT_TABS.goals,
      ].includes(tab.id as any),
    )
    if (productAnalyticsTabs.length > 0) {
      groups.push({
        id: 'productAnalytics',
        label: t('dashboard.productAnalytics'),
        tabs: productAnalyticsTabs,
      })
    }

    const securityTabs = tabs.filter((tab) => tab.id === PROJECT_TABS.captcha)
    if (securityTabs.length > 0) {
      groups.push({
        id: 'security',
        label: t('dashboard.security'),
        tabs: securityTabs,
      })
    }

    return groups
  }, [tabs, t])

  return (
    <aside className='flex h-full w-56 shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900'>
      {/* Project name at the top */}
      <div className='sticky top-0 z-10 flex items-center border-b border-gray-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900'>
        <Tooltip
          className='max-w-full'
          text={projectName}
          tooltipNode={
            <Text as='h2' size='lg' weight='semibold' truncate className='max-w-full'>
              {projectName}
            </Text>
          }
        />
      </div>

      {/* Tabs area */}
      <div className='flex-1 px-2 py-3'>
        {/* Ask AI - standalone tab above groups */}
        {askAiTab ? (
          <div className='mb-3'>
            {(() => {
              const isCurrent = askAiTab.id === activeTab
              const TabIcon = askAiTab.icon
              const iconColorClass = ICON_COLORS[askAiTab.id] || 'text-gray-500'

              const handleClick = (e: React.MouseEvent) => {
                e.preventDefault()
                if (!dataLoading) {
                  onTabChange(askAiTab.id as keyof typeof PROJECT_TABS)
                }
              }

              const newSearchParams = new URLSearchParams(searchParams.toString())
              newSearchParams.set('tab', askAiTab.id)

              return (
                <Link
                  to={{ search: newSearchParams.toString() }}
                  onClick={handleClick}
                  className={cx('group flex items-center gap-2 rounded-md px-2.5 py-2 transition-colors', {
                    'bg-linear-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20':
                      isCurrent,
                    'hover:bg-gray-100 dark:hover:bg-slate-800/60': !isCurrent,
                    'cursor-wait': dataLoading,
                  })}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  <TabIcon className={cx('size-4 shrink-0', iconColorClass)} strokeWidth={1.5} aria-hidden='true' />
                  <Text as='span' size='sm' weight='medium' truncate className='max-w-full'>
                    {askAiTab.label}
                  </Text>
                </Link>
              )
            })()}
          </div>
        ) : null}

        {_map(tabGroups, (group) => (
          <CollapsibleGroup
            key={group.id}
            group={group}
            activeTab={activeTab}
            onTabChange={onTabChange}
            projectId={projectId}
            dataLoading={dataLoading}
            searchParams={searchParams}
          />
        ))}
      </div>

      {/* Settings at the bottom - always show if user is allowed to manage */}
      {allowedToManage ? (
        <div className='sticky bottom-0 border-t border-gray-200 bg-white px-2 py-2 dark:border-slate-800 dark:bg-slate-900'>
          <Link
            to={routes.project_settings.replace(':id', projectId)}
            className={cx(
              'group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
              'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800/60 dark:hover:text-gray-200',
            )}
          >
            <SettingsIcon
              className={cx('h-5 w-5 shrink-0', ICON_COLORS.settings)}
              strokeWidth={1.5}
              aria-hidden='true'
            />
            <span className='truncate'>{t('common.settings')}</span>
          </Link>
        </div>
      ) : null}
    </aside>
  )
}

export default ProjectSidebar
