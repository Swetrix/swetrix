import { MagnifyingGlassIcon } from '@phosphor-icons/react'

import Input from '~/ui/Input'
import Pagination from '~/ui/Pagination'

import { AdminTable, EmptyState, formatDate, Td } from './components'
import type { AdminOrganisationsList } from './types'

interface OrganisationsTabProps {
  organisations: AdminOrganisationsList
  page: number
  search: string
  onPageChange: (page: number) => void
  onSearchChange: (search: string) => void
}

export const OrganisationsTab = ({
  organisations,
  page,
  search,
  onPageChange,
  onSearchChange,
}: OrganisationsTabProps) => (
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
          headers={['Organisation', 'Owner', 'Members', 'Projects', 'Created']}
        >
          {organisations.organisations.map((organisation) => (
            <tr key={organisation.id}>
              <Td>
                <span className='font-medium'>{organisation.name}</span>
                <div className='font-mono text-xs text-gray-500 dark:text-gray-400'>
                  {organisation.id}
                </div>
              </Td>
              <Td>{organisation.owner?.email || '—'}</Td>
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
            pageAmount={Math.ceil(organisations.total / organisations.pageSize)}
            total={organisations.total}
            pageSize={organisations.pageSize}
          />
        ) : null}
      </>
    )}
  </div>
)
