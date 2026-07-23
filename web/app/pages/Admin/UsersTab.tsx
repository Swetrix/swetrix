import { ArrowLeftIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import { Badge } from '~/ui/Badge'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import Pagination from '~/ui/Pagination'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'
import Textarea from '~/ui/Textarea'
import { nFormatter, nLocaleFormatter } from '~/utils/generic'

import {
  AdminTable,
  EmptyState,
  formatDate,
  formatDateTime,
  Td,
  UsageBar,
} from './components'
import type {
  AdminActionData,
  AdminUser,
  AdminUserDetails,
  AdminUsersList,
} from './types'

const USER_FILTERS = [
  { key: 'all', label: 'All users' },
  { key: 'active', label: 'Verified' },
  { key: 'inactive', label: 'Unverified' },
  { key: 'paid', label: 'Paying' },
  { key: 'trial', label: 'Trial' },
  { key: 'free', label: 'Free / none' },
  { key: 'blocked', label: 'Blocked / suspended' },
]

const PlanCell = ({ user }: { user: AdminUser }) => (
  <div className='flex items-center gap-1.5'>
    <span className='font-mono text-sm'>{user.planCode}</span>
    {user.planType === 'plus' ? (
      <Badge colour='indigo' label='plus' size='sm' />
    ) : null}
    {user.planType === 'enterprise' ? (
      <Badge colour='sky' label='enterprise' size='sm' />
    ) : null}
    {user.billingFrequency === 'yearly' ? (
      <Badge colour='slate' label='yearly' size='sm' />
    ) : null}
  </div>
)

const UserStatusBadges = ({ user }: { user: AdminUser }) => (
  <span className='inline-flex items-center gap-1.5'>
    {!user.isActive ? (
      <Badge colour='yellow' label='unverified' size='sm' />
    ) : null}
    {user.isAccountBillingSuspended ? (
      <Badge colour='red' label='suspended' size='sm' />
    ) : null}
    {user.dashboardBlockReason ? (
      <Badge colour='red' label={user.dashboardBlockReason} size='sm' />
    ) : null}
    {user.cancellationEffectiveDate ? (
      <Badge colour='yellow' label='cancelling' size='sm' />
    ) : null}
  </span>
)

const MonthlyEventsCell = ({ user }: { user: AdminUser }) => (
  <div className='min-w-32'>
    <div className='flex items-center justify-between gap-2'>
      <span className='text-sm tabular-nums'>
        {nFormatter(user.monthlyEvents, 1)}
      </span>
      {user.monthlyUsageLimit ? (
        <span className='text-xs text-gray-500 tabular-nums dark:text-gray-400'>
          / {nFormatter(user.monthlyUsageLimit, 1)}
        </span>
      ) : null}
    </div>
    {user.monthlyUsageLimit ? (
      <UsageBar
        used={user.monthlyEvents}
        total={user.monthlyUsageLimit}
        className='mt-1'
      />
    ) : null}
  </div>
)

const PLAN_TYPE_OPTIONS = [
  { key: '', label: 'Legacy default (unset)' },
  { key: 'standard', label: 'Standard' },
  { key: 'plus', label: 'Plus' },
  { key: 'enterprise', label: 'Enterprise' },
]

const formatOverrides = (value: unknown): string =>
  value ? JSON.stringify(value, null, 2) : ''

// Edits planType / addonOverrides / entitlementOverrides - the write
// operations the old admin CLI supported
const BillingControls = ({ user }: { user: AdminUser }) => {
  const fetcher = useFetcher<AdminActionData>()

  const [planType, setPlanType] = useState(user.storedPlanType || '')
  const [addonOverrides, setAddonOverrides] = useState(
    formatOverrides(user.addonOverrides),
  )
  const [entitlementOverrides, setEntitlementOverrides] = useState(
    formatOverrides(user.entitlementOverrides),
  )

  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) {
      return
    }

    if (fetcher.data.success) {
      toast.success('User updated')
    } else if (fetcher.data.error) {
      toast.error(fetcher.data.error)
    }
  }, [fetcher.state, fetcher.data])

  return (
    <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
      <Text as='h4' size='lg' weight='semibold'>
        Billing controls
      </Text>
      <Text as='p' size='sm' colour='secondary' className='mt-1'>
        Changes apply immediately. Overrides are JSON objects, e.g.{' '}
        <span className='font-mono'>{'{"websites": 50}'}</span>
      </Text>

      <div className='mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3'>
        <Select
          label='Plan type'
          title={
            PLAN_TYPE_OPTIONS.find(({ key }) => key === planType)?.label ||
            PLAN_TYPE_OPTIONS[0].label
          }
          items={PLAN_TYPE_OPTIONS}
          labelExtractor={(item) => item.label}
          keyExtractor={(item) => item.key}
          selectedItem={PLAN_TYPE_OPTIONS.find(({ key }) => key === planType)}
          onSelect={(item) => setPlanType(item.key)}
        />
        <Textarea
          label='Addon overrides'
          value={addonOverrides}
          onChange={(event) => setAddonOverrides(event.target.value)}
          placeholder='{"websites": 10, "sessionReplays": 5000}'
          rows={4}
          classes={{ textarea: 'font-mono text-xs' }}
        />
        <Textarea
          label='Entitlement overrides'
          value={entitlementOverrides}
          onChange={(event) => setEntitlementOverrides(event.target.value)}
          placeholder='{"websites": 50, "apiRateLimitPerHour": 1000}'
          rows={4}
          classes={{ textarea: 'font-mono text-xs' }}
        />
      </div>

      <Button
        className='mt-4'
        variant='primary'
        loading={fetcher.state !== 'idle'}
        onClick={() =>
          fetcher.submit(
            {
              intent: 'update-user',
              userId: user.id,
              planType,
              addonOverrides,
              entitlementOverrides,
            },
            { method: 'post' },
          )
        }
      >
        Save changes
      </Button>
    </div>
  )
}

const UserDetails = ({
  details,
  onBack,
}: {
  details: AdminUserDetails
  onBack: () => void
}) => {
  const { user, effectiveLimits, projects, memberships } = details

  const infoRows: { label: string; value: React.ReactNode }[] = [
    { label: 'ID', value: <span className='font-mono'>{user.id}</span> },
    { label: 'Email', value: user.email },
    { label: 'Nickname', value: user.nickname || '—' },
    { label: 'Registered', value: formatDateTime(user.created) },
    { label: 'Plan', value: <PlanCell user={user} /> },
    { label: 'Currency', value: user.tierCurrency || '—' },
    { label: 'Trial ends', value: formatDate(user.trialEndDate) },
    { label: 'Next bill', value: formatDate(user.nextBillDate) },
    {
      label: 'Cancellation effective',
      value: formatDate(user.cancellationEffectiveDate),
    },
    {
      label: 'Monthly events',
      value: `${nLocaleFormatter(user.monthlyEvents)}${user.monthlyUsageLimit ? ` / ${nLocaleFormatter(user.monthlyUsageLimit)}` : ''}`,
    },
    {
      label: 'Effective limits',
      value: (
        <span className='font-mono text-xs break-all whitespace-normal'>
          {JSON.stringify(effectiveLimits)}
        </span>
      ),
    },
  ]

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <button
          type='button'
          onClick={onBack}
          className='inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50'
        >
          <ArrowLeftIcon className='size-4' />
          Back to users
        </button>
        <div className='mt-3 flex items-center gap-3'>
          <Text as='h3' size='xl' weight='semibold'>
            {user.email}
          </Text>
          <UserStatusBadges user={user} />
        </div>
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

      <BillingControls key={user.id} user={user} />

      <div>
        <Text as='h4' size='lg' weight='semibold' className='mb-3'>
          Projects ({projects.length})
        </Text>
        {projects.length === 0 ? (
          <EmptyState message='No projects' />
        ) : (
          <AdminTable
            headers={[
              'Name',
              'Organisation',
              '24h events',
              '30d events',
              'Total events',
              'Created',
              '',
            ]}
          >
            {projects.map((project) => (
              <tr key={project.id}>
                <Td>
                  <div>
                    <span className='font-medium'>{project.name}</span>
                    <span className='ml-2 font-mono text-xs text-gray-500 dark:text-gray-400'>
                      {project.id}
                    </span>
                  </div>
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

      <div>
        <Text as='h4' size='lg' weight='semibold' className='mb-3'>
          Organisation memberships ({memberships.length})
        </Text>
        {memberships.length === 0 ? (
          <EmptyState message='No organisation memberships' />
        ) : (
          <AdminTable headers={['Organisation', 'Role', 'Confirmed', 'Joined']}>
            {memberships.map((membership) => (
              <tr key={membership.id}>
                <Td>{membership.organisation?.name || '—'}</Td>
                <Td>
                  <Badge colour='indigo' label={membership.role} size='sm' />
                </Td>
                <Td>{membership.confirmed ? 'Yes' : 'No'}</Td>
                <Td>{formatDate(membership.created)}</Td>
              </tr>
            ))}
          </AdminTable>
        )}
      </div>
    </div>
  )
}

interface UsersTabProps {
  users: AdminUsersList
  userDetails: AdminUserDetails | null
  page: number
  search: string
  filter: string
  onPageChange: (page: number) => void
  onSearchChange: (search: string) => void
  onFilterChange: (filter: string) => void
  onUserSelect: (id: string | null) => void
}

export const UsersTab = ({
  users,
  userDetails,
  page,
  search,
  filter,
  onPageChange,
  onSearchChange,
  onFilterChange,
  onUserSelect,
}: UsersTabProps) => {
  if (userDetails) {
    return (
      <UserDetails details={userDetails} onBack={() => onUserSelect(null)} />
    )
  }

  const selectedFilter =
    USER_FILTERS.find(({ key }) => key === filter) || USER_FILTERS[0]

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
        <Input
          label='Search users'
          className='sm:max-w-xs sm:flex-1'
          leadingIcon={<MagnifyingGlassIcon className='size-4 text-gray-400' />}
          placeholder='Search by email, ID or nickname'
          defaultValue={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <Select
          label='Filter'
          fieldLabelClassName='sr-only'
          title={selectedFilter.label}
          items={USER_FILTERS}
          labelExtractor={(item) => item.label}
          keyExtractor={(item) => item.key}
          selectedItem={selectedFilter}
          onSelect={(item) => onFilterChange(item.key)}
        />
      </div>

      {users.users.length === 0 ? (
        <EmptyState message='No users match the current filters' />
      ) : (
        <>
          <AdminTable
            headers={[
              'Email',
              'Plan',
              'Projects',
              'Monthly events',
              'Registered',
            ]}
          >
            {users.users.map((user) => (
              <tr
                key={user.id}
                onClick={() => onUserSelect(user.id)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onUserSelect(user.id)
                  }
                }}
                tabIndex={0}
                className='cursor-pointer transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:-outline-offset-2 dark:hover:bg-slate-900/60 dark:focus-visible:bg-slate-900/60'
              >
                <Td>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>{user.email}</span>
                    <UserStatusBadges user={user} />
                  </div>
                  {user.nickname ? (
                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                      {user.nickname}
                    </span>
                  ) : null}
                </Td>
                <Td>
                  <PlanCell user={user} />
                </Td>
                <Td className='tabular-nums'>
                  {user.projectCount}
                  <span className='text-xs text-gray-500 dark:text-gray-400'>
                    {' '}
                    / {user.maxProjects}
                  </span>
                </Td>
                <Td>
                  <MonthlyEventsCell user={user} />
                </Td>
                <Td>{formatDate(user.created)}</Td>
              </tr>
            ))}
          </AdminTable>
          {users.total > users.pageSize ? (
            <Pagination
              page={page + 1}
              setPage={(newPage) => onPageChange(newPage - 1)}
              pageAmount={Math.ceil(users.total / users.pageSize)}
              total={users.total}
              pageSize={users.pageSize}
            />
          ) : null}
        </>
      )}
    </div>
  )
}
