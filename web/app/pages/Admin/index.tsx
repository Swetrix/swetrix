import {
  BuildingsIcon,
  ChartLineUpIcon,
  ChatCircleTextIcon,
  CreditCardIcon,
  DatabaseIcon,
  GlobeIcon,
  RobotIcon,
  UsersIcon,
} from '@phosphor-icons/react'
import _debounce from 'lodash/debounce'
import { useMemo, useRef } from 'react'
import { useLoaderData, useNavigation, useSearchParams } from 'react-router'

import type { SettingsTabConfig } from '~/pages/Project/Settings/SettingsSidebar'
import type {
  AdminFeedbackType,
  AdminLoaderData,
  AdminTab,
  SortState,
} from '~/pages/Admin/types'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'

import { BillingTab } from './BillingTab'
import { BotBlocksTab } from './BotBlocksTab'
import { DatabaseTab } from './DatabaseTab'
import { FeedbackTab } from './FeedbackTab'
import { OrganisationsTab } from './OrganisationsTab'
import { OverviewTab } from './OverviewTab'
import { ProjectsTab } from './ProjectsTab'
import { UsersTab } from './UsersTab'

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
    id: 'billing',
    label: 'Billing',
    description: 'Trials, churn risk and payments',
    icon: CreditCardIcon,
    iconColor: 'text-teal-500',
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
    id: 'feedback',
    label: 'Feedback',
    description: 'What users say when they stay or leave',
    icon: ChatCircleTextIcon,
    iconColor: 'text-pink-500',
    visible: true,
  },
  {
    id: 'bot-blocks',
    label: 'Bot blocks',
    description: 'Why events get dropped',
    icon: RobotIcon,
    iconColor: 'text-orange-500',
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

// Flat tab list (same look as the settings sidebar buttons, minus the
// collapsible group wrapper)
const AdminSidebar = ({
  activeTab,
  onTabChange,
}: {
  activeTab: AdminTab
  onTabChange: (tab: AdminTab) => void
}) => (
  <nav className='flex flex-col gap-0.5' aria-label='Admin sections'>
    {TABS.map((tab) => {
      const TabIcon = tab.icon
      const isCurrent = tab.id === activeTab

      return (
        <button
          key={tab.id}
          type='button'
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-2 text-left transition-colors',
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
          <Text
            as='span'
            size='sm'
            weight='medium'
            truncate
            className='max-w-full'
          >
            {tab.label}
          </Text>
        </button>
      )
    })}
  </nav>
)

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
            next.delete('project')
            next.delete('org')

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

  const sort: SortState = {
    by: searchParams.get('sortBy') || 'created',
    order: searchParams.get('order') === 'ASC' ? 'ASC' : 'DESC',
  }

  const onSortChange = (by: string, order: 'ASC' | 'DESC') => {
    updateParams({ sortBy: by, order, page: null })
  }

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
            <AdminSidebar activeTab={activeTab} onTabChange={onTabChange} />
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
                revenue={data.revenue}
                onChartDaysChange={(days) =>
                  updateParams({ days: days.toString() })
                }
              />
            ) : null}

            {activeTab === 'billing' && data.billing ? (
              <BillingTab billing={data.billing} />
            ) : null}

            {activeTab === 'bot-blocks' && data.botBlocks ? (
              <BotBlocksTab
                botBlocks={data.botBlocks}
                onDaysChange={(days) => updateParams({ days: days.toString() })}
              />
            ) : null}

            {activeTab === 'users' && data.users ? (
              <UsersTab
                users={data.users}
                userDetails={data.userDetails || null}
                page={page}
                search={search}
                filter={filter}
                sort={sort}
                onPageChange={(newPage) =>
                  updateParams({ page: newPage.toString(), user: null })
                }
                onSearchChange={onSearchChange}
                onFilterChange={(newFilter) =>
                  updateParams({ filter: newFilter, page: null, user: null })
                }
                onSortChange={onSortChange}
                onUserSelect={(id) => updateParams({ user: id })}
              />
            ) : null}

            {activeTab === 'projects' ? (
              <ProjectsTab
                projects={data.projects}
                topProjects={data.topProjects}
                projectDetails={data.projectDetails || null}
                view={searchParams.get('view') === 'top' ? 'top' : 'list'}
                page={page}
                search={search}
                filter={filter}
                sort={sort}
                topDays={Number(searchParams.get('days')) || 7}
                onViewChange={(view) =>
                  updateParams({
                    view: view === 'list' ? null : view,
                    page: null,
                    search: null,
                    filter: null,
                    days: null,
                    project: null,
                  })
                }
                onPageChange={(newPage) =>
                  updateParams({ page: newPage.toString(), project: null })
                }
                onSearchChange={onSearchChange}
                onFilterChange={(newFilter) =>
                  updateParams({ filter: newFilter, page: null, project: null })
                }
                onSortChange={onSortChange}
                onTopDaysChange={(days) =>
                  updateParams({ days: days.toString() })
                }
                onProjectSelect={(id) => updateParams({ project: id })}
              />
            ) : null}

            {activeTab === 'organisations' && data.organisations ? (
              <OrganisationsTab
                organisations={data.organisations}
                organisationDetails={data.organisationDetails || null}
                page={page}
                search={search}
                sort={sort}
                onPageChange={(newPage) =>
                  updateParams({ page: newPage.toString(), org: null })
                }
                onSearchChange={onSearchChange}
                onSortChange={onSortChange}
                onOrganisationSelect={(id) => updateParams({ org: id })}
              />
            ) : null}

            {activeTab === 'feedback' && data.feedback ? (
              <FeedbackTab
                feedback={data.feedback}
                type={
                  (['user', 'cancellation', 'deletion'].includes(
                    searchParams.get('type') || '',
                  )
                    ? searchParams.get('type')
                    : 'user') as AdminFeedbackType
                }
                page={page}
                search={search}
                order={sort.order}
                onTypeChange={(type) =>
                  updateParams({
                    type: type === 'user' ? null : type,
                    page: null,
                  })
                }
                onPageChange={(newPage) =>
                  updateParams({ page: newPage.toString() })
                }
                onSearchChange={onSearchChange}
                onOrderChange={(order) =>
                  updateParams({
                    order: order === 'DESC' ? null : order,
                    page: null,
                  })
                }
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
