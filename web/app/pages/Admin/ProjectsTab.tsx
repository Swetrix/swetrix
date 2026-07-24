import { ArrowLeftIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'

import { Badge } from '~/ui/Badge'
import Input from '~/ui/Input'
import Pagination from '~/ui/Pagination'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'
import { cn, nLocaleFormatter } from '~/utils/generic'

import { AdminChart, ADMIN_CHART_COLORS } from './AdminChart'
import {
  AdminTable,
  EmptyState,
  formatDate,
  formatDateTime,
  StatCard,
  Td,
  useAdminSort,
} from './components'
import { adminLinkClassName } from './UsersTab'
import type {
  AdminProject,
  AdminProjectDetails,
  AdminProjectsList,
  AdminTopProjects,
  SortState,
} from './types'

const PROJECT_FILTERS = [
  { key: 'all', label: 'All projects' },
  { key: 'active', label: 'Active' },
  { key: 'archived', label: 'Archived' },
  { key: 'inactive-30', label: 'No events in 30 days' },
  { key: 'inactive-60', label: 'No events in 60 days' },
  { key: 'inactive-90', label: 'No events in 90 days' },
]

const TOP_PERIODS = [
  { key: 1, label: 'Last 24 hours' },
  { key: 7, label: 'Last 7 days' },
  { key: 30, label: 'Last 30 days' },
]

const EVENT_TYPE_LABELS: Record<string, string> = {
  pageview: 'Pageviews',
  custom_event: 'Custom events',
  error: 'Errors',
  captcha: 'Captcha',
  performance: 'Performance',
}

const ProjectBadges = ({
  project,
}: {
  project: Pick<
    AdminProject,
    'isArchived' | 'active' | 'public' | 'isPasswordProtected'
  >
}) => (
  <span className='inline-flex items-center gap-1.5'>
    {project.isArchived ? (
      <Badge colour='slate' label='archived' size='sm' />
    ) : null}
    {!project.active ? (
      <Badge colour='yellow' label='disabled' size='sm' />
    ) : null}
    {project.public ? <Badge colour='sky' label='public' size='sm' /> : null}
    {project.isPasswordProtected ? (
      <Badge colour='indigo' label='password' size='sm' />
    ) : null}
  </span>
)

const OwnerCell = ({
  admin,
}: {
  admin: { id: string; email: string; planCode?: string } | null
}) => {
  if (!admin) {
    return <>—</>
  }

  return (
    <div>
      <Link
        to={`/admin?tab=users&user=${admin.id}`}
        onClick={(e) => e.stopPropagation()}
        className={adminLinkClassName}
      >
        {admin.email}
      </Link>
      {admin.planCode ? (
        <span className='ml-2 text-xs text-gray-500 dark:text-gray-400'>
          {admin.planCode}
        </span>
      ) : null}
    </div>
  )
}

const ProjectDetails = ({
  details,
  onBack,
}: {
  details: AdminProjectDetails
  onBack: () => void
}) => {
  const { project, series, typeBreakdown, shares } = details

  const infoRows: { label: string; value: React.ReactNode }[] = [
    { label: 'ID', value: project.id },
    { label: 'Created', value: formatDateTime(project.created) },
    {
      label: 'Owner',
      value: <OwnerCell admin={project.admin} />,
    },
    {
      label: 'Organisation',
      value: project.organisation ? (
        <Link
          to={`/admin?tab=organisations&org=${project.organisation.id}`}
          className={adminLinkClassName}
        >
          {project.organisation.name}
        </Link>
      ) : (
        '—'
      ),
    },
    { label: 'Bots protection', value: project.botsProtectionLevel },
    {
      label: 'Allowed origins',
      value: project.origins?.length ? project.origins.join(', ') : 'Any',
    },
    {
      label: 'IP blacklist',
      value: project.ipBlacklist?.length ? project.ipBlacklist.join(', ') : '—',
    },
  ]

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <button
          type='button'
          onClick={onBack}
          className='inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50'
        >
          <ArrowLeftIcon className='size-4' />
          Back to projects
        </button>
        <div className='mt-3 flex items-center gap-3'>
          <Text as='h3' size='xl' weight='semibold'>
            {project.name}
          </Text>
          <ProjectBadges project={project} />
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <StatCard
          label='Events (24h)'
          value={nLocaleFormatter(project.events24h)}
        />
        <StatCard
          label='Events (30d)'
          value={nLocaleFormatter(project.events30d)}
        />
        <StatCard
          label='Events (all-time)'
          value={nLocaleFormatter(project.totalEvents)}
        />
      </div>

      <div className='rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
        <Text as='h4' size='lg' weight='semibold' className='mb-4'>
          Events, last 30 days
        </Text>
        {series.length === 0 ? (
          <EmptyState message='No events in the last 30 days' />
        ) : (
          <AdminChart
            className='h-64'
            series={[
              {
                id: 'events',
                name: 'Events',
                color: ADMIN_CHART_COLORS.blue,
                data: series,
              },
            ]}
          />
        )}
      </div>

      <dl className='grid grid-cols-1 gap-x-6 gap-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-3 dark:border-slate-800/60 dark:bg-slate-900/25'>
        {infoRows.map(({ label, value }) => (
          <div key={label}>
            <dt>
              <Text as='span' size='xs' colour='secondary'>
                {label}
              </Text>
            </dt>
            <dd className='text-sm text-gray-900 dark:text-gray-100'>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <div>
          <Text as='h4' size='lg' weight='semibold' className='mb-3'>
            Event types
          </Text>
          {typeBreakdown.length === 0 ? (
            <EmptyState message='No events recorded' />
          ) : (
            <AdminTable
              columns={[
                { key: 'type', label: 'Type' },
                { key: 'last30d', label: '30d' },
                { key: 'total', label: 'All-time' },
              ]}
            >
              {typeBreakdown.map(({ type, last30d, total }) => (
                <tr key={type}>
                  <Td>{EVENT_TYPE_LABELS[type] || type}</Td>
                  <Td className='tabular-nums'>{nLocaleFormatter(last30d)}</Td>
                  <Td className='tabular-nums'>{nLocaleFormatter(total)}</Td>
                </tr>
              ))}
            </AdminTable>
          )}
        </div>

        <div>
          <Text as='h4' size='lg' weight='semibold' className='mb-3'>
            Shared with ({shares.length})
          </Text>
          {shares.length === 0 ? (
            <EmptyState message='Not shared with anyone' />
          ) : (
            <AdminTable
              columns={[
                { key: 'user', label: 'User' },
                { key: 'role', label: 'Role' },
                { key: 'confirmed', label: 'Confirmed' },
                { key: 'created', label: 'Shared' },
              ]}
            >
              {shares.map((share) => (
                <tr key={share.id}>
                  <Td>
                    {share.user ? (
                      <Link
                        to={`/admin?tab=users&user=${share.user.id}`}
                        className={adminLinkClassName}
                      >
                        {share.user.email}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </Td>
                  <Td>
                    <Badge colour='indigo' label={share.role} size='sm' />
                  </Td>
                  <Td>{share.confirmed ? 'Yes' : 'No'}</Td>
                  <Td>{formatDate(share.created)}</Td>
                </tr>
              ))}
            </AdminTable>
          )}
        </div>
      </div>
    </div>
  )
}

interface ProjectsTabProps {
  projects?: AdminProjectsList
  topProjects?: AdminTopProjects
  projectDetails?: AdminProjectDetails | null
  view: 'list' | 'top'
  page: number
  search: string
  filter: string
  sort: SortState
  topDays: number
  onViewChange: (view: 'list' | 'top') => void
  onPageChange: (page: number) => void
  onSearchChange: (search: string) => void
  onFilterChange: (filter: string) => void
  onSortChange: (by: string, order: 'ASC' | 'DESC') => void
  onTopDaysChange: (days: number) => void
  onProjectSelect: (id: string | null) => void
}

export const ProjectsTab = ({
  projects,
  topProjects,
  projectDetails,
  view,
  page,
  search,
  filter,
  sort,
  topDays,
  onViewChange,
  onPageChange,
  onSearchChange,
  onFilterChange,
  onSortChange,
  onTopDaysChange,
  onProjectSelect,
}: ProjectsTabProps) => {
  const listSort = useAdminSort<AdminProject>(
    ['name', 'created'],
    sort,
    onSortChange,
    {
      events24h: (project) => project.events24h,
      events30d: (project) => project.events30d,
      totalEvents: (project) => project.totalEvents,
      owner: (project) => project.admin?.email || null,
    },
  )

  const topSort = useAdminSort<AdminTopProjects['projects'][number]>(
    [],
    { by: 'eventCount', order: 'DESC' },
    () => {},
    {
      eventCount: (project) => project.eventCount,
      name: (project) => project.name,
      created: (project) => project.created,
      owner: (project) => project.admin?.email || null,
    },
  )

  if (projectDetails) {
    return (
      <ProjectDetails
        details={projectDetails}
        onBack={() => onProjectSelect(null)}
      />
    )
  }

  const selectedFilter =
    PROJECT_FILTERS.find(({ key }) => key === filter) || PROJECT_FILTERS[0]
  const selectedPeriod =
    TOP_PERIODS.find(({ key }) => key === topDays) || TOP_PERIODS[1]

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex w-fit rounded-md border border-gray-200 p-0.5 dark:border-slate-800/60'>
        {(
          [
            { key: 'list', label: 'All projects' },
            { key: 'top', label: 'Top by traffic' },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type='button'
            onClick={() => onViewChange(key)}
            className={cn(
              'cursor-pointer rounded px-3 py-1.5 text-sm font-medium transition-colors',
              view === key
                ? 'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-gray-50'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'list' && projects ? (
        <>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
            <Input
              label='Search projects'
              className='sm:max-w-xs sm:flex-1'
              leadingIcon={
                <MagnifyingGlassIcon className='size-4 text-gray-400' />
              }
              placeholder='Search by name, ID or owner email'
              defaultValue={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
            <Select
              label='Filter'
              fieldLabelClassName='sr-only'
              title={selectedFilter.label}
              items={PROJECT_FILTERS}
              labelExtractor={(item) => item.label}
              keyExtractor={(item) => item.key}
              selectedItem={selectedFilter}
              onSelect={(item) => onFilterChange(item.key)}
              menuClassName='w-max min-w-full'
            />
          </div>

          {projects.projects.length === 0 ? (
            <EmptyState message='No projects match the current filters' />
          ) : (
            <>
              <AdminTable
                columns={[
                  { key: 'name', label: 'Project', sortable: true },
                  { key: 'owner', label: 'Owner', sortable: true },
                  { key: 'organisation', label: 'Organisation' },
                  { key: 'events24h', label: '24h events', sortable: true },
                  { key: 'events30d', label: '30d events', sortable: true },
                  { key: 'totalEvents', label: 'Total events', sortable: true },
                  { key: 'created', label: 'Created', sortable: true },
                ]}
                sort={listSort.sort}
                onSort={listSort.onSort}
              >
                {listSort.sortRows(projects.projects).map((project) => (
                  <tr
                    key={project.id}
                    onClick={() => onProjectSelect(project.id)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onProjectSelect(project.id)
                      }
                    }}
                    tabIndex={0}
                    className='cursor-pointer transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:-outline-offset-2 dark:hover:bg-slate-900/60 dark:focus-visible:bg-slate-900/60'
                  >
                    <Td>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>{project.name}</span>
                        <ProjectBadges project={project} />
                      </div>
                      <span className='text-xs text-gray-500 dark:text-gray-400'>
                        {project.id}
                      </span>
                    </Td>
                    <Td>
                      <OwnerCell admin={project.admin} />
                    </Td>
                    <Td>
                      {project.organisation ? (
                        <Link
                          to={`/admin?tab=organisations&org=${project.organisation.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className={adminLinkClassName}
                        >
                          {project.organisation.name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td className='tabular-nums'>
                      {nLocaleFormatter(project.events24h)}
                    </Td>
                    <Td className='tabular-nums'>
                      {nLocaleFormatter(project.events30d)}
                    </Td>
                    <Td className='tabular-nums'>
                      {nLocaleFormatter(project.totalEvents)}
                    </Td>
                    <Td>{formatDate(project.created)}</Td>
                  </tr>
                ))}
              </AdminTable>
              {projects.total > projects.pageSize ? (
                <Pagination
                  page={page + 1}
                  setPage={(newPage) => onPageChange(newPage - 1)}
                  pageAmount={Math.ceil(projects.total / projects.pageSize)}
                  total={projects.total}
                  pageSize={projects.pageSize}
                />
              ) : null}
            </>
          )}
        </>
      ) : null}

      {view === 'top' && topProjects ? (
        <>
          <div className='flex items-center justify-between'>
            <Text as='p' size='sm' colour='secondary'>
              Top {topProjects.projects.length} projects by activity events
            </Text>
            <Select
              label='Period'
              fieldLabelClassName='sr-only'
              title={selectedPeriod.label}
              items={TOP_PERIODS}
              labelExtractor={(item) => item.label}
              keyExtractor={(item) => item.key.toString()}
              selectedItem={selectedPeriod}
              onSelect={(item) => onTopDaysChange(item.key)}
              menuClassName='right-0 w-max min-w-full'
            />
          </div>

          {topProjects.projects.length === 0 ? (
            <EmptyState message='No events recorded in this period' />
          ) : (
            <AdminTable
              columns={[
                { key: 'rank', label: '#' },
                { key: 'name', label: 'Project', sortable: true },
                { key: 'owner', label: 'Owner', sortable: true },
                { key: 'eventCount', label: 'Events', sortable: true },
                { key: 'created', label: 'Created', sortable: true },
              ]}
              sort={topSort.sort}
              onSort={topSort.onSort}
            >
              {topSort.sortRows(topProjects.projects).map((project, index) => (
                <tr
                  key={project.id}
                  onClick={() => onProjectSelect(project.id)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onProjectSelect(project.id)
                    }
                  }}
                  tabIndex={0}
                  className='cursor-pointer transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:-outline-offset-2 dark:hover:bg-slate-900/60 dark:focus-visible:bg-slate-900/60'
                >
                  <Td className='text-gray-500 tabular-nums dark:text-gray-400'>
                    {index + 1}
                  </Td>
                  <Td>
                    <span className='font-medium'>
                      {project.name || 'Unknown (deleted?)'}
                    </span>
                    <span className='ml-2 text-xs text-gray-500 dark:text-gray-400'>
                      {project.id}
                    </span>
                  </Td>
                  <Td>
                    <OwnerCell admin={project.admin} />
                  </Td>
                  <Td className='font-medium tabular-nums'>
                    {nLocaleFormatter(project.eventCount)}
                  </Td>
                  <Td>{formatDate(project.created)}</Td>
                </tr>
              ))}
            </AdminTable>
          )}
        </>
      ) : null}
    </div>
  )
}
