import {
  BuildingsIcon,
  ChartLineUpIcon,
  DatabaseIcon,
  GlobeIcon,
  UsersIcon,
} from '@phosphor-icons/react'
import _debounce from 'lodash/debounce'
import { useMemo, useRef } from 'react'
import { useLoaderData, useNavigation, useSearchParams } from 'react-router'

import type {
  SettingsTabConfig,
  SettingsTabGroup,
} from '~/pages/Project/Settings/SettingsSidebar'
import SettingsSidebar from '~/pages/Project/Settings/SettingsSidebar'
import type { AdminLoaderData, AdminTab } from '~/pages/Admin/types'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'

import { DatabaseTab } from './DatabaseTab'
import { OrganisationsTab } from './OrganisationsTab'
import { OverviewTab } from './OverviewTab'
import { ProjectsTab } from './ProjectsTab'
import { UsersTab } from './UsersTab'

const SIDEBAR_STORAGE_KEY = 'admin-sidebar-groups'

const TABS: SettingsTabConfig<AdminTab>[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Growth, revenue and usage at a glance',
    icon: ChartLineUpIcon,
    iconColor: 'text-blue-500',
    visible: true,
  },
  {
    id: 'users',
    label: 'Users',
    description: 'Accounts, plans and usage',
    icon: UsersIcon,
    iconColor: 'text-emerald-500',
    visible: true,
  },
  {
    id: 'projects',
    label: 'Projects',
    description: 'All tracked websites',
    icon: GlobeIcon,
    iconColor: 'text-amber-500',
    visible: true,
  },
  {
    id: 'organisations',
    label: 'Organisations',
    description: 'Teams and their members',
    icon: BuildingsIcon,
    iconColor: 'text-purple-500',
    visible: true,
  },
  {
    id: 'database',
    label: 'Database',
    description: 'Storage usage and table stats',
    icon: DatabaseIcon,
    iconColor: 'text-red-500',
    visible: true,
  },
]

const TAB_GROUPS: SettingsTabGroup<AdminTab>[] = [
  {
    id: 'admin',
    label: 'Admin',
    tabIds: ['overview', 'users', 'projects', 'organisations', 'database'],
  },
]

const AdminPage = () => {
  const data = useLoaderData<AdminLoaderData>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigation = useNavigation()

  const setSearchParamsRef = useRef(setSearchParams)
  setSearchParamsRef.current = setSearchParams

  const activeTab = data.tab

  const updateParams = (updates: Record<string, string | null>) => {
    setSearchParamsRef.current(
      (prev) => {
        const next = new URLSearchParams(prev)

        for (const [key, value] of Object.entries(updates)) {
          if (value === null || value === '') {
            next.delete(key)
          } else {
            next.set(key, value)
          }
        }

        return next
      },
      { preventScrollReset: true },
    )
  }

  const onTabChange = (tab: AdminTab) => {
    setSearchParamsRef.current(tab === 'overview' ? {} : { tab })
  }

  // Debounced so we don't fire a loader request on every keystroke
  const onSearchChange = useMemo(
    () =>
      _debounce((search: string) => {
        setSearchParamsRef.current(
          (prev) => {
            const next = new URLSearchParams(prev)

            if (search.trim()) {
              next.set('search', search.trim())
            } else {
              next.delete('search')
            }

            next.delete('page')
            next.delete('user')

            return next
          },
          { preventScrollReset: true },
        )
      }, 400),
    [],
  )

  const page = Number(searchParams.get('page')) || 0
  const search = searchParams.get('search') || ''
  const filter = searchParams.get('filter') || 'all'

  const isNavigating = navigation.state === 'loading'

  const selectedTabConfig = TABS.find(({ id }) => id === activeTab) || TABS[0]

  return (
    <div className='min-h-min-footer bg-gray-50 dark:bg-slate-950'>
      <div className='mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
        <Text as='h2' size='3xl' weight='bold'>
          Admin
        </Text>

        <div className='mt-6 flex flex-col gap-6 md:flex-row'>
          <div className='md:hidden'>
            <Select
              label='Section'
              fieldLabelClassName='sr-only'
              title={selectedTabConfig.label}
              items={TABS}
              labelExtractor={(item) => item.label}
              keyExtractor={(item) => item.id}
              selectedItem={selectedTabConfig}
              onSelect={(item) => onTabChange(item.id)}
            />
          </div>

          <aside className='hidden w-56 shrink-0 md:block'>
            <SettingsSidebar
              tabs={TABS}
              activeTab={activeTab}
              onTabChange={onTabChange}
              groups={TAB_GROUPS}
              storageKey={SIDEBAR_STORAGE_KEY}
            />
          </aside>

          <section
            className={cn('min-w-0 flex-1 transition-opacity', {
              'pointer-events-none opacity-60': isNavigating,
            })}
          >
            {activeTab === 'overview' && data.overview && data.charts ? (
              <OverviewTab
                overview={data.overview}
                charts={data.charts}
                chartDays={data.chartDays || 30}
                onChartDaysChange={(days) =>
                  updateParams({ days: days.toString() })
                }
              />
            ) : null}

            {activeTab === 'users' && data.users ? (
              <UsersTab
                users={data.users}
                userDetails={data.userDetails || null}
                page={page}
                search={search}
                filter={filter}
                onPageChange={(newPage) =>
                  updateParams({ page: newPage.toString(), user: null })
                }
                onSearchChange={onSearchChange}
                onFilterChange={(newFilter) =>
                  updateParams({ filter: newFilter, page: null, user: null })
                }
                onUserSelect={(id) => updateParams({ user: id })}
              />
            ) : null}

            {activeTab === 'projects' ? (
              <ProjectsTab
                projects={data.projects}
                topProjects={data.topProjects}
                view={searchParams.get('view') === 'top' ? 'top' : 'list'}
                page={page}
                search={search}
                filter={filter}
                topDays={Number(searchParams.get('days')) || 7}
                onViewChange={(view) =>
                  updateParams({
                    view: view === 'list' ? null : view,
                    page: null,
                    search: null,
                    filter: null,
                    days: null,
                  })
                }
                onPageChange={(newPage) =>
                  updateParams({ page: newPage.toString() })
                }
                onSearchChange={onSearchChange}
                onFilterChange={(newFilter) =>
                  updateParams({ filter: newFilter, page: null })
                }
                onTopDaysChange={(days) =>
                  updateParams({ days: days.toString() })
                }
              />
            ) : null}

            {activeTab === 'organisations' && data.organisations ? (
              <OrganisationsTab
                organisations={data.organisations}
                page={page}
                search={search}
                onPageChange={(newPage) =>
                  updateParams({ page: newPage.toString() })
                }
                onSearchChange={onSearchChange}
              />
            ) : null}

            {activeTab === 'database' && data.database ? (
              <DatabaseTab database={data.database} />
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}

export default AdminPage
