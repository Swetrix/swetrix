import { ArrowLeftIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'

import { Badge } from '~/ui/Badge'
import Input from '~/ui/Input'
import Pagination from '~/ui/Pagination'
import { Text } from '~/ui/Text'
import { nLocaleFormatter } from '~/utils/generic'

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
  AdminOrganisationDetails,
  AdminOrganisationsList,
  SortState,
} from './types'

const OrganisationDetails = ({
  details,
  onBack,
}: {
  details: AdminOrganisationDetails
  onBack: () => void
}) => {
  const { organisation, members, projects } = details

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <button
          type='button'
          onClick={onBack}
          className='inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50'
        >
          <ArrowLeftIcon className='size-4' />
          Back to organisations
        </button>
        <div className='mt-3 flex items-baseline gap-3'>
          <Text as='h3' size='xl' weight='semibold'>
            {organisation.name}
          </Text>
          <Text as='span' size='sm' colour='secondary'>
            {organisation.id}
          </Text>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <StatCard label='Members' value={organisation.memberCount} />
        <StatCard label='Projects' value={organisation.projectCount} />
        <StatCard
          label='Created'
          value={formatDateTime(organisation.created)}
        />
      </div>

      <div>
        <Text as='h4' size='lg' weight='semibold' className='mb-3'>
          Members ({members.length})
        </Text>
        {members.length === 0 ? (
          <EmptyState message='No members' />
        ) : (
          <AdminTable
            columns={[
              { key: 'user', label: 'User' },
              { key: 'role', label: 'Role' },
              { key: 'confirmed', label: 'Confirmed' },
              { key: 'created', label: 'Joined' },
            ]}
          >
            {members.map((member) => (
              <tr key={member.id}>
                <Td>
                  {member.user ? (
                    <Link
                      to={`/admin?tab=users&user=${member.user.id}`}
                      className={adminLinkClassName}
                    >
                      {member.user.email}
                    </Link>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td>
                  <Badge colour='indigo' label={member.role} size='sm' />
                </Td>
                <Td>{member.confirmed ? 'Yes' : 'No'}</Td>
                <Td>{formatDate(member.created)}</Td>
              </tr>
            ))}
          </AdminTable>
        )}
      </div>

      <div>
        <Text as='h4' size='lg' weight='semibold' className='mb-3'>
          Projects ({projects.length})
        </Text>
        {projects.length === 0 ? (
          <EmptyState message='No projects' />
        ) : (
          <AdminTable
            columns={[
              { key: 'name', label: 'Project' },
              { key: 'owner', label: 'Owner' },
              { key: 'events24h', label: '24h events' },
              { key: 'events30d', label: '30d events' },
              { key: 'totalEvents', label: 'Total events' },
              { key: 'created', label: 'Created' },
              { key: 'badges', label: '' },
            ]}
          >
            {projects.map((project) => (
              <tr key={project.id}>
                <Td>
                  <Link
                    to={`/admin?tab=projects&project=${project.id}`}
                    className={adminLinkClassName}
                  >
                    {project.name}
                  </Link>
                  <span className='ml-2 text-xs text-gray-500 dark:text-gray-400'>
                    {project.id}
                  </span>
                </Td>
                <Td>
                  {project.admin ? (
                    <Link
                      to={`/admin?tab=users&user=${project.admin.id}`}
                      className={adminLinkClassName}
                    >
                      {project.admin.email}
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
                <Td>
                  {project.isArchived ? (
                    <Badge colour='slate' label='archived' size='sm' />
                  ) : null}
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
      </div>
    </div>
  )
}

interface OrganisationsTabProps {
  organisations: AdminOrganisationsList
  organisationDetails?: AdminOrganisationDetails | null
  page: number
  search: string
  sort: SortState
  onPageChange: (page: number) => void
  onSearchChange: (search: string) => void
  onSortChange: (by: string, order: 'ASC' | 'DESC') => void
  onOrganisationSelect: (id: string | null) => void
}

export const OrganisationsTab = ({
  organisations,
  organisationDetails,
  page,
  search,
  sort,
  onPageChange,
  onSearchChange,
  onSortChange,
  onOrganisationSelect,
}: OrganisationsTabProps) => {
  const {
    sort: activeSort,
    onSort,
    sortRows,
  } = useAdminSort<AdminOrganisationsList['organisations'][number]>(
    ['name', 'created'],
    sort,
    onSortChange,
    {
      memberCount: (org) => org.memberCount,
      projectCount: (org) => org.projectCount,
      owner: (org) => org.owner?.email || null,
    },
  )

  if (organisationDetails) {
    return (
      <OrganisationDetails
        details={organisationDetails}
        onBack={() => onOrganisationSelect(null)}
      />
    )
  }

  return (
    <div className='flex flex-col gap-4'>
      <Input
        label='Search organisations'
        className='sm:max-w-xs'
        leadingIcon={<MagnifyingGlassIcon className='size-4 text-gray-400' />}
        placeholder='Search by name or ID'
        defaultValue={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />

      {organisations.organisations.length === 0 ? (
        <EmptyState message='No organisations found' />
      ) : (
        <>
          <AdminTable
            columns={[
              { key: 'name', label: 'Organisation', sortable: true },
              { key: 'owner', label: 'Owner', sortable: true },
              { key: 'memberCount', label: 'Members', sortable: true },
              { key: 'projectCount', label: 'Projects', sortable: true },
              { key: 'created', label: 'Created', sortable: true },
            ]}
            sort={activeSort}
            onSort={onSort}
          >
            {sortRows(organisations.organisations).map((organisation) => (
              <tr
                key={organisation.id}
                onClick={() => onOrganisationSelect(organisation.id)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onOrganisationSelect(organisation.id)
                  }
                }}
                tabIndex={0}
                className='cursor-pointer transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:-outline-offset-2 dark:hover:bg-slate-900/60 dark:focus-visible:bg-slate-900/60'
              >
                <Td>
                  <span className='font-medium'>{organisation.name}</span>
                  <div className='text-xs text-gray-500 dark:text-gray-400'>
                    {organisation.id}
                  </div>
                </Td>
                <Td>
                  {organisation.owner ? (
                    <Link
                      to={`/admin?tab=users&user=${organisation.owner.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className={adminLinkClassName}
                    >
                      {organisation.owner.email}
                    </Link>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td className='tabular-nums'>{organisation.memberCount}</Td>
                <Td className='tabular-nums'>{organisation.projectCount}</Td>
                <Td>{formatDate(organisation.created)}</Td>
              </tr>
            ))}
          </AdminTable>
          {organisations.total > organisations.pageSize ? (
            <Pagination
              page={page + 1}
              setPage={(newPage) => onPageChange(newPage - 1)}
              pageAmount={Math.ceil(
                organisations.total / organisations.pageSize,
              )}
              total={organisations.total}
              pageSize={organisations.pageSize}
            />
          ) : null}
        </>
      )}
    </div>
  )
}
