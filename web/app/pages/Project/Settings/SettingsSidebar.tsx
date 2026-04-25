import _map from 'lodash/map'
import { CaretDownIcon, CaretRightIcon, Icon } from '@phosphor-icons/react'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'

const SIDEBAR_GROUPS_KEY = 'project-settings-sidebar-groups'

const getGroupExpandedState = (groupId: string): boolean => {
  if (typeof window === 'undefined') return true
  try {
    const stored = localStorage.getItem(SIDEBAR_GROUPS_KEY)
    if (stored) {
      const states = JSON.parse(stored)
      return states[groupId] !== false
    }
  } catch {
    // Ignore parse errors
  }
  return true
}

const setGroupExpandedState = (groupId: string, isExpanded: boolean) => {
  if (typeof window === 'undefined') return
  try {
    const stored = localStorage.getItem(SIDEBAR_GROUPS_KEY)
    const states = stored ? JSON.parse(stored) : {}
    states[groupId] = isExpanded
    localStorage.setItem(SIDEBAR_GROUPS_KEY, JSON.stringify(states))
  } catch {
    // Ignore errors
  }
}

export interface SettingsTabConfig<TabId extends string = string> {
  id: TabId
  label: string
  description: string
  icon: Icon
  iconColor: string
  visible: boolean
}

interface SettingsTabGroup<TabId extends string = string> {
  id: string
  label: string
  tabIds: TabId[]
}

interface SettingsSidebarProps<TabId extends string> {
  tabs: SettingsTabConfig<TabId>[]
  activeTab: TabId
  onTabChange: (tabId: TabId) => void
}

const TabButton = <TabId extends string>({
  tab,
  isCurrent,
  onClick,
}: {
  tab: SettingsTabConfig<TabId>
  isCurrent: boolean
  onClick: () => void
}) => {
  const TabIcon = tab.icon

  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'group flex items-center gap-1.5 rounded-md px-2.5 py-2 text-left transition-colors',
        {
          'bg-gray-100 dark:bg-slate-900': isCurrent,
          'hover:bg-gray-100 dark:hover:bg-slate-900/60': !isCurrent,
        },
      )}
      aria-current={isCurrent ? 'page' : undefined}
    >
      <TabIcon
        className={cn('size-4 shrink-0', tab.iconColor)}
        weight='duotone'
        aria-hidden='true'
      />
      <Text as='span' size='sm' weight='medium' truncate className='max-w-full'>
        {tab.label}
      </Text>
    </button>
  )
}

const CollapsibleGroup = <TabId extends string>({
  group,
  tabs,
  activeTab,
  onTabChange,
}: {
  group: SettingsTabGroup<TabId>
  tabs: SettingsTabConfig<TabId>[]
  activeTab: TabId
  onTabChange: (tabId: TabId) => void
}) => {
  const [isExpanded, setIsExpanded] = useState(true)

  const hasActiveTab = useMemo(
    () => tabs.some((tab) => tab.id === activeTab),
    [tabs, activeTab],
  )

  const prevHasActiveTab = useRef(hasActiveTab)

  useEffect(() => {
    setIsExpanded(getGroupExpandedState(group.id))
  }, [group.id])

  useEffect(() => {
    if (hasActiveTab && !prevHasActiveTab.current && !isExpanded) {
      setIsExpanded(true)
      setGroupExpandedState(group.id, true)
    }
    prevHasActiveTab.current = hasActiveTab
  }, [hasActiveTab, group.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className='mb-1'>
      <button
        type='button'
        onClick={() => {
          const newValue = !isExpanded
          setIsExpanded(newValue)
          setGroupExpandedState(group.id, newValue)
        }}
        className='group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-slate-900/60'
      >
        <Text
          as='span'
          size='xs'
          colour='secondary'
          weight='semibold'
          truncate
          className='max-w-full'
        >
          {group.label}
        </Text>
        {isExpanded ? (
          <CaretDownIcon className='size-3.5 text-gray-400' />
        ) : (
          <CaretRightIcon className='size-3.5 text-gray-400' />
        )}
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          {
            'max-h-96 opacity-100': isExpanded,
            'max-h-0 opacity-0': !isExpanded,
          },
        )}
      >
        <nav
          className='mt-1 flex flex-col gap-0.5 pl-2'
          aria-label={group.label}
        >
          {_map(tabs, (tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isCurrent={tab.id === activeTab}
              onClick={() => onTabChange(tab.id)}
            />
          ))}
        </nav>
      </div>
    </div>
  )
}

const SettingsSidebar = <TabId extends string>({
  tabs,
  activeTab,
  onTabChange,
}: SettingsSidebarProps<TabId>) => {
  const { t } = useTranslation('common')

  const groupsConfig = useMemo<SettingsTabGroup<TabId>[]>(
    () => [
      {
        id: 'general',
        label: t('project.settings.sidebarGroups.general'),
        tabIds: ['general', 'access', 'people'] as TabId[],
      },
      {
        id: 'protection',
        label: t('project.settings.sidebarGroups.protection'),
        tabIds: ['shields', 'captcha'] as TabId[],
      },
      {
        id: 'data',
        label: t('project.settings.sidebarGroups.data'),
        tabIds: ['annotations', 'revenue', 'import'] as TabId[],
      },
      {
        id: 'integrations',
        label: t('project.settings.sidebarGroups.integrations'),
        tabIds: ['integrations', 'proxy'] as TabId[],
      },
      {
        id: 'notifications',
        label: t('project.settings.sidebarGroups.notifications'),
        tabIds: ['alerts', 'channels', 'emails'] as TabId[],
      },
    ],
    [t],
  )

  const visibleTabsById = useMemo(() => {
    const map = new Map<TabId, SettingsTabConfig<TabId>>()
    tabs.forEach((tab) => map.set(tab.id, tab))
    return map
  }, [tabs])

  const groups = useMemo(
    () =>
      groupsConfig
        .map((group) => ({
          ...group,
          tabs: group.tabIds
            .map((id) => visibleTabsById.get(id))
            .filter((tab): tab is SettingsTabConfig<TabId> => Boolean(tab)),
        }))
        .filter((group) => group.tabs.length > 0),
    [groupsConfig, visibleTabsById],
  )

  const groupedTabIds = useMemo(() => {
    const set = new Set<TabId>()
    groupsConfig.forEach((group) => {
      group.tabIds.forEach((id) => set.add(id))
    })
    return set
  }, [groupsConfig])

  const ungroupedTabs = useMemo(
    () => tabs.filter((tab) => !groupedTabIds.has(tab.id)),
    [tabs, groupedTabIds],
  )

  return (
    <nav className='flex flex-col' aria-label='Sidebar'>
      {_map(groups, (group) => (
        <CollapsibleGroup
          key={group.id}
          group={group}
          tabs={group.tabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
        />
      ))}

      {ungroupedTabs.length > 0 ? (
        <div className='mt-2 flex flex-col gap-0.5 border-t border-gray-200 pt-2 dark:border-slate-800/60'>
          {_map(ungroupedTabs, (tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isCurrent={tab.id === activeTab}
              onClick={() => onTabChange(tab.id)}
            />
          ))}
        </div>
      ) : null}
    </nav>
  )
}

export default memo(SettingsSidebar) as typeof SettingsSidebar
