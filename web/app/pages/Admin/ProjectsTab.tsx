import { MagnifyingGlassIcon } from '@phosphor-icons/react'

import { Badge } from '~/ui/Badge'
import Input from '~/ui/Input'
import Pagination from '~/ui/Pagination'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'
import { cn, nLocaleFormatter } from '~/utils/generic'

import { AdminTable, EmptyState, formatDate, Td } from './components'
import type { AdminProject, AdminProjectsList, AdminTopProjects } from './types'

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

const ProjectBadges = ({ project }: { project: AdminProject }) => (
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

interface ProjectsTabProps {
  projects?: AdminProjectsList
  topProjects?: AdminTopProjects
  view: 'list' | 'top'
  page: number
  search: string
  filter: string
  topDays: number
  onViewChange: (view: 'list' | 'top') => void
  onPageChange: (page: number) => void
  onSearchChange: (search: string) => void
  onFilterChange: (filter: string) => void
  onTopDaysChange: (days: number) => void
}

export const ProjectsTab = ({
  projects,
  topProjects,
  view,
  page,
  search,
  filter,
  topDays,
  onViewChange,
  onPageChange,
  onSearchChange,
  onFilterChange,
  onTopDaysChange,
}: ProjectsTabProps) => {
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
              'rounded px-3 py-1.5 text-sm font-medium transition-colors',
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
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
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
            />
          </div>

          {projects.projects.length === 0 ? (
            <EmptyState message='No projects match the current filters' />
          ) : (
            <>
              <AdminTable
                headers={[
                  'Project',
                  'Owner',
                  'Organisation',
                  '24h events',
                  '30d events',
                  'Total events',
                  'Created',
                ]}
              >
                {projects.projects.map((project) => (
                  <tr key={project.id}>
                    <Td>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>{project.name}</span>
                        <ProjectBadges project={project} />
                      </div>
                      <span className='font-mono text-xs text-gray-500 dark:text-gray-400'>
                        {project.id}
                      </span>
                    </Td>
                    <Td>
                      {project.admin ? (
                        <div>
                          {project.admin.email}
                          <span className='ml-2 font-mono text-xs text-gray-500 dark:text-gray-400'>
                            {project.admin.planCode}
                          </span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td>{project.organisation?.name || '—'}</Td>
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
            />
          </div>

          {topProjects.projects.length === 0 ? (
            <EmptyState message='No events recorded in this period' />
          ) : (
            <AdminTable
              headers={['#', 'Project', 'Owner', 'Events', 'Created']}
            >
              {topProjects.projects.map((project, index) => (
                <tr key={project.id}>
                  <Td className='text-gray-500 tabular-nums dark:text-gray-400'>
                    {index + 1}
                  </Td>
                  <Td>
                    <span className='font-medium'>
                      {project.name || 'Unknown (deleted?)'}
                    </span>
                    <span className='ml-2 font-mono text-xs text-gray-500 dark:text-gray-400'>
                      {project.id}
                    </span>
                  </Td>
                  <Td>
                    {project.admin ? (
                      <div>
                        {project.admin.email}
                        <span className='ml-2 font-mono text-xs text-gray-500 dark:text-gray-400'>
                          {project.admin.planCode}
                        </span>
                      </div>
                    ) : (
                      '—'
                    )}
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
