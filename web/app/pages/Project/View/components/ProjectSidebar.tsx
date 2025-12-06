import cx from 'clsx'
import _map from 'lodash/map'
import { ChevronDownIcon, ChevronRightIcon, GlobeIcon, BarChart3Icon, SettingsIcon } from 'lucide-react'
import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, LinkProps } from 'react-router'

import { PROJECT_TABS } from '~/lib/constants'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import routes from '~/utils/routes'

type ProjectTabKey = keyof typeof PROJECT_TABS | 'settings'

const ICON_COLORS: Record<string, string> = {
  // Web Analytics
  traffic: 'text-blue-500',
  performance: 'text-amber-500',
  alerts: 'text-cyan-500',
  // Product Analytics
  profiles: 'text-indigo-500',
  sessions: 'text-indigo-500',
  errors: 'text-red-500',
  funnels: 'text-teal-500',
  // Settings
  settings: 'text-gray-500',
}

// Group icon colors
const GROUP_ICON_COLORS: Record<string, string> = {
  webAnalytics: 'text-blue-500',
  productAnalytics: 'text-green-500',
}

interface Tab {
  id: ProjectTabKey
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

interface TabGroup {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  tabs: Tab[]
  defaultExpanded?: boolean
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
  const [isExpanded, setIsExpanded] = useState(group.defaultExpanded ?? true)

  const hasActiveTab = useMemo(() => {
    return group.tabs.some((tab) => tab.id === activeTab)
  }, [group.tabs, activeTab])

  React.useEffect(() => {
    if (hasActiveTab && !isExpanded) {
      setIsExpanded(true)
    }
  }, [hasActiveTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const GroupIcon = group.icon
  const groupColorClass = GROUP_ICON_COLORS[group.id] || 'text-gray-500'

  return (
    <div className='mb-1'>
      <button
        type='button'
        onClick={() => setIsExpanded(!isExpanded)}
        className={cx(
          'group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs font-semibold tracking-wide uppercase transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50',
          {
            'text-gray-700 dark:text-gray-300': !hasActiveTab,
            'text-gray-900 dark:text-gray-100': hasActiveTab,
          },
        )}
      >
        <div className='flex items-center gap-2'>
          <GroupIcon className={cx('h-4 w-4', groupColorClass)} strokeWidth={1.5} />
          <span>{group.label}</span>
        </div>
        {isExpanded ? (
          <ChevronDownIcon className='h-3.5 w-3.5 text-gray-400' strokeWidth={2} />
        ) : (
          <ChevronRightIcon className='h-3.5 w-3.5 text-gray-400' strokeWidth={2} />
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
                className={cx(
                  'group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                  {
                    'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-gray-50': isCurrent,
                    'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800/50 dark:hover:text-gray-200':
                      !isCurrent,
                    'cursor-wait opacity-50': dataLoading && tab.id !== 'settings',
                  },
                )}
                aria-current={isCurrent ? 'page' : undefined}
              >
                <TabIcon className={cx('h-5 w-5 shrink-0', iconColorClass)} strokeWidth={1.5} aria-hidden='true' />
                <span className='truncate'>{tab.label}</span>
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

  // Group tabs by category
  const tabGroups = useMemo<TabGroup[]>(() => {
    const groups: TabGroup[] = []

    // Web Analytics group
    const webAnalyticsTabs = tabs.filter((tab) =>
      [PROJECT_TABS.traffic, PROJECT_TABS.performance, PROJECT_TABS.alerts].includes(tab.id as any),
    )
    if (webAnalyticsTabs.length > 0) {
      groups.push({
        id: 'webAnalytics',
        label: t('dashboard.webAnalytics'),
        icon: GlobeIcon,
        tabs: webAnalyticsTabs,
        defaultExpanded: true,
      })
    }

    // Product Analytics group
    const productAnalyticsTabs = tabs.filter((tab) =>
      [PROJECT_TABS.profiles, PROJECT_TABS.sessions, PROJECT_TABS.funnels, PROJECT_TABS.errors].includes(tab.id as any),
    )
    if (productAnalyticsTabs.length > 0) {
      groups.push({
        id: 'productAnalytics',
        label: t('dashboard.productAnalytics'),
        icon: BarChart3Icon,
        tabs: productAnalyticsTabs,
        defaultExpanded: true,
      })
    }

    return groups
  }, [tabs, t])

  return (
    <aside className='flex h-full w-56 shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900'>
      {/* Project name at the top */}
      <div className='sticky top-0 z-10 flex items-center border-b border-gray-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900'>
        <Tooltip
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
              'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800/50 dark:hover:text-gray-200',
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
