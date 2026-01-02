import _map from 'lodash/map'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SettingsIcon,
  XIcon,
  MenuIcon,
} from 'lucide-react'
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, LinkProps } from 'react-router'

import { PROJECT_TABS } from '~/lib/constants'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { trackCustom } from '~/utils/analytics'
import { cn } from '~/utils/generic'
import { getFaviconHost } from '~/utils/referrers'
import routes from '~/utils/routes'

const SIDEBAR_COLLAPSED_KEY = 'project-sidebar-collapsed'
const SIDEBAR_GROUPS_KEY = 'project-sidebar-groups'

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

type ProjectTabKey = keyof typeof PROJECT_TABS | 'settings'

const ICON_COLORS: Record<string, string> = {
  // Ask AI
  ai: 'text-violet-500',
  // Web Analytics
  traffic: 'text-blue-500',
  performance: 'text-amber-500',
  funnels: 'text-teal-500',
  alerts: 'text-cyan-500',
  // Product Analytics
  profiles: 'text-indigo-500',
  sessions: 'text-indigo-500',
  errors: 'text-red-500',
  goals: 'text-purple-500',
  experiments: 'text-pink-500',
  featureFlags: 'text-orange-500',
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
  className?: string
  tabs: Tab[]
  activeTab: ProjectTabKey
  onTabChange: (tabId: keyof typeof PROJECT_TABS) => void
  projectId: string
  projectName: string
  websiteUrl?: string | null
  dataLoading?: boolean
  searchParams: URLSearchParams
  allowedToManage?: boolean
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

const CollapsibleGroup: React.FC<{
  group: TabGroup
  activeTab: ProjectTabKey
  onTabChange: (tabId: keyof typeof PROJECT_TABS) => void
  projectId: string
  dataLoading?: boolean
  searchParams: URLSearchParams
  isCollapsed?: boolean
  onMobileClose?: () => void
}> = ({ group, activeTab, onTabChange, projectId, dataLoading, searchParams, isCollapsed, onMobileClose }) => {
  const [isExpanded, setIsExpanded] = useState(() => getGroupExpandedState(group.id))

  const hasActiveTab = useMemo(() => {
    return group.tabs.some((tab) => tab.id === activeTab)
  }, [group.tabs, activeTab])

  const prevHasActiveTab = useRef(hasActiveTab)

  React.useEffect(() => {
    // Only auto-expand when user navigates TO this group (not on initial mount)
    if (hasActiveTab && !prevHasActiveTab.current && !isExpanded) {
      setIsExpanded(true)
      setGroupExpandedState(group.id, true)
    }
    prevHasActiveTab.current = hasActiveTab
  }, [hasActiveTab, group.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isCollapsed) {
    return (
      <div className='mb-1'>
        <nav className='flex flex-col gap-0.5'>
          {_map(group.tabs, (tab) => {
            const isCurrent = tab.id === activeTab
            const TabIcon = tab.icon
            const iconColorClass = ICON_COLORS[tab.id] || 'text-gray-500'

            const handleClick = (e: React.MouseEvent) => {
              if (tab.id === 'settings') {
                onMobileClose?.()
                return
              }

              e.preventDefault()
              if (!dataLoading) {
                onTabChange(tab.id as keyof typeof PROJECT_TABS)
                onMobileClose?.()
              }
            }

            const newSearchParams = new URLSearchParams(searchParams.toString())
            newSearchParams.set('tab', tab.id)
            const tabUrl: LinkProps['to'] =
              tab.id === 'settings'
                ? routes.project_settings.replace(':id', projectId)
                : { search: newSearchParams.toString() }

            return (
              <Tooltip
                key={tab.id}
                text={tab.label}
                tooltipNode={
                  <Link
                    to={tabUrl}
                    onClick={handleClick}
                    className={cn('group flex items-center justify-center rounded-md p-2 transition-colors', {
                      'bg-gray-100 dark:bg-slate-800': isCurrent,
                      'hover:bg-gray-100 dark:hover:bg-slate-800/60': !isCurrent,
                      'cursor-wait': dataLoading && tab.id !== 'settings',
                    })}
                    aria-current={isCurrent ? 'page' : undefined}
                    aria-label={tab.label}
                  >
                    <TabIcon className={cn('size-5 shrink-0', iconColorClass)} strokeWidth={1.5} aria-hidden='true' />
                  </Link>
                }
              />
            )
          })}
        </nav>
      </div>
    )
  }

  return (
    <div className='mb-1'>
      <button
        type='button'
        onClick={() => {
          const newValue = !isExpanded
          setIsExpanded(newValue)
          setGroupExpandedState(group.id, newValue)
        }}
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
        className={cn('overflow-hidden transition-all duration-200 ease-in-out', {
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
                onMobileClose?.()
                return // Let the Link handle navigation
              }

              e.preventDefault()
              if (!dataLoading) {
                onTabChange(tab.id as keyof typeof PROJECT_TABS)
                onMobileClose?.()
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
                className={cn('group flex items-center gap-1.5 rounded-md px-2.5 py-2 transition-colors', {
                  'bg-gray-100 dark:bg-slate-800': isCurrent,
                  'hover:bg-gray-100 dark:hover:bg-slate-800/60': !isCurrent,
                  'cursor-wait': dataLoading && tab.id !== 'settings',
                })}
                aria-current={isCurrent ? 'page' : undefined}
              >
                <TabIcon className={cn('size-4 shrink-0', iconColorClass)} strokeWidth={1.5} aria-hidden='true' />
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
  websiteUrl,
  dataLoading,
  searchParams,
  allowedToManage,
  isMobileOpen = false,
  onMobileClose,
  className,
}) => {
  const faviconHost = useMemo(() => getFaviconHost(websiteUrl || null), [websiteUrl])
  const { t } = useTranslation('common')
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
    }
    return false
  })

  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const newValue = !prev
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue))
      trackCustom('SIDEBAR_COLLAPSED', { collapsed: newValue })
      return newValue
    })
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen) {
        onMobileClose?.()
      }
    }

    if (isMobileOpen) {
      document.addEventListener('keydown', handleEscape)
      requestAnimationFrame(() => {
        document.body.style.overflow = 'hidden'
      })
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isMobileOpen, onMobileClose])

  const handleTabChange = useCallback(
    (tabId: keyof typeof PROJECT_TABS) => {
      onTabChange(tabId)
      onMobileClose?.()
    },
    [onTabChange, onMobileClose],
  )

  const askAiTab = useMemo(() => {
    return tabs.find((tab) => tab.id === PROJECT_TABS.ai)
  }, [tabs])

  const tabGroups = useMemo<TabGroup[]>(() => {
    const groups: TabGroup[] = []

    const webAnalyticsTabs = tabs.filter((tab) =>
      [PROJECT_TABS.traffic, PROJECT_TABS.performance, PROJECT_TABS.funnels, PROJECT_TABS.alerts].includes(
        tab.id as any,
      ),
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
        PROJECT_TABS.errors,
        PROJECT_TABS.goals,
        PROJECT_TABS.experiments,
        PROJECT_TABS.featureFlags,
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

  const sidebarContent = (
    <aside
      className={cn(
        'sticky top-2 flex shrink-0 flex-col self-start overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-800/60 dark:bg-slate-800/25',
        isMobileOpen
          ? 'h-screen w-64'
          : cn(
              'transition-[width,height] duration-300 ease-in-out',
              isScrolled ? 'h-[calc(100vh-1.5rem)]' : 'h-[calc(100vh-60px-1rem)]',
              isCollapsed ? 'w-14' : 'w-56',
            ),
        className,
      )}
    >
      <div className='sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-slate-800/60 dark:bg-slate-800/25'>
        {isCollapsed && !isMobileOpen ? (
          <Tooltip
            text={projectName}
            tooltipNode={
              faviconHost ? (
                <img
                  className='size-6 shrink-0 rounded-sm'
                  src={`https://icons.duckduckgo.com/ip3/${faviconHost}.ico`}
                  loading='lazy'
                  alt={projectName}
                />
              ) : (
                <Text as='h2' size='lg' weight='semibold' className='text-center'>
                  {projectName.charAt(0).toUpperCase()}
                </Text>
              )
            }
          />
        ) : (
          <Tooltip
            className='max-w-full flex-1'
            text={projectName}
            tooltipNode={
              <div className='flex min-w-0 items-center gap-1'>
                {faviconHost ? (
                  <img
                    className='size-6 shrink-0 rounded-sm'
                    src={`https://icons.duckduckgo.com/ip3/${faviconHost}.ico`}
                    loading='lazy'
                    alt=''
                    aria-hidden='true'
                  />
                ) : null}
                <Text as='h2' size='lg' weight='semibold' truncate className='text-left'>
                  {projectName}
                </Text>
              </div>
            }
          />
        )}
        {isMobileOpen ? (
          <button
            type='button'
            onClick={onMobileClose}
            className='ml-2 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-200'
            aria-label={t('common.close')}
          >
            <XIcon className='h-5 w-5' strokeWidth={1.5} />
          </button>
        ) : null}
      </div>

      <div className='flex-1 overflow-y-auto px-2 py-3'>
        {askAiTab ? (
          <div className='mb-1'>
            {(() => {
              const isCurrent = askAiTab.id === activeTab
              const TabIcon = askAiTab.icon
              const iconColorClass = ICON_COLORS[askAiTab.id] || 'text-gray-500'

              const handleClick = (e: React.MouseEvent) => {
                e.preventDefault()
                if (!dataLoading) {
                  handleTabChange(askAiTab.id as keyof typeof PROJECT_TABS)
                }
              }

              const newSearchParams = new URLSearchParams(searchParams.toString())
              newSearchParams.set('tab', askAiTab.id)

              if (isCollapsed && !isMobileOpen) {
                return (
                  <Tooltip
                    text={askAiTab.label}
                    tooltipNode={
                      <Link
                        to={{ search: newSearchParams.toString() }}
                        onClick={handleClick}
                        className={cn('group flex items-center justify-center rounded-md p-2 transition-colors', {
                          'bg-linear-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20':
                            isCurrent,
                          'hover:bg-gray-100 dark:hover:bg-slate-800/60': !isCurrent,
                          'cursor-wait': dataLoading,
                        })}
                        aria-current={isCurrent ? 'page' : undefined}
                        aria-label={askAiTab.label}
                      >
                        <TabIcon
                          className={cn('size-5 shrink-0', iconColorClass)}
                          strokeWidth={1.5}
                          aria-hidden='true'
                        />
                      </Link>
                    }
                  />
                )
              }

              return (
                <Link
                  to={{ search: newSearchParams.toString() }}
                  onClick={handleClick}
                  className={cn('group flex items-center gap-2 rounded-md px-2.5 py-2 transition-colors', {
                    'bg-linear-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20':
                      isCurrent,
                    'hover:bg-gray-100 dark:hover:bg-slate-800/60': !isCurrent,
                    'cursor-wait': dataLoading,
                  })}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  <TabIcon className={cn('size-4 shrink-0', iconColorClass)} strokeWidth={1.5} aria-hidden='true' />
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
            isCollapsed={isCollapsed && !isMobileOpen ? true : false}
            onMobileClose={onMobileClose}
          />
        ))}
      </div>

      <div className='sticky bottom-0 flex flex-col gap-0.5 border-t border-gray-200 bg-white px-2 py-2 dark:border-slate-800/60 dark:bg-slate-800/25'>
        {!isMobileOpen ? (
          <button
            type='button'
            onClick={toggleCollapsed}
            className={cn(
              'group flex w-full items-center rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
              'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800/60 dark:hover:text-gray-200',
              isCollapsed ? 'justify-center' : 'gap-2.5',
            )}
            aria-label={isCollapsed ? t('common.expand') : t('common.collapse')}
          >
            {isCollapsed ? (
              <PanelLeftOpenIcon className='h-5 w-5 shrink-0' strokeWidth={1.5} aria-hidden='true' />
            ) : (
              <>
                <PanelLeftCloseIcon className='h-5 w-5 shrink-0' strokeWidth={1.5} aria-hidden='true' />
                <span className='truncate'>{t('common.collapse')}</span>
              </>
            )}
          </button>
        ) : null}

        {allowedToManage ? (
          <Link
            to={routes.project_settings.replace(':id', projectId)}
            onClick={onMobileClose}
            className={cn(
              'group flex w-full items-center rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
              'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800/60 dark:hover:text-gray-200',
              isCollapsed && !isMobileOpen ? 'justify-center' : 'gap-2.5',
            )}
            aria-label={t('common.settings')}
          >
            <SettingsIcon
              className={cn('h-5 w-5 shrink-0', ICON_COLORS.settings)}
              strokeWidth={1.5}
              aria-hidden='true'
            />
            {!isCollapsed || isMobileOpen ? <span className='truncate'>{t('common.settings')}</span> : null}
          </Link>
        ) : null}
      </div>
    </aside>
  )

  if (isMobileOpen) {
    return (
      <div className='pointer-events-auto fixed inset-0 z-50 md:hidden'>
        <div className='animate-fade-in absolute inset-0 bg-black/50' onClick={onMobileClose} aria-hidden='true' />
        <div className='animate-slide-in-left relative h-full w-fit'>{sidebarContent}</div>
      </div>
    )
  }

  return sidebarContent
}

interface MobileSidebarTriggerProps {
  onClick: () => void
  activeTabLabel?: string
}

export const MobileSidebarTrigger: React.FC<MobileSidebarTriggerProps> = ({ onClick, activeTabLabel }) => {
  const { t } = useTranslation('common')

  return (
    <div className='relative z-10 mb-4 flex items-center gap-3 md:hidden'>
      <button
        type='button'
        onClick={onClick}
        className='flex items-center justify-center rounded-md border border-gray-300 p-2 text-gray-700 transition-all ring-inset hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:border-slate-700/80 dark:text-gray-200 dark:hover:bg-slate-800 focus:dark:ring-gray-200'
        aria-label={t('common.openMenu')}
      >
        <MenuIcon className='h-5 w-5' strokeWidth={1.5} />
      </button>
      {activeTabLabel ? (
        <span className='text-sm font-medium text-gray-700 dark:text-gray-200'>{activeTabLabel}</span>
      ) : null}
    </div>
  )
}

export default ProjectSidebar
