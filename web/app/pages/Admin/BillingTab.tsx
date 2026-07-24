import { ArrowSquareOutIcon } from '@phosphor-icons/react'
import dayjs from 'dayjs'
import { Link } from 'react-router'

import { Badge } from '~/ui/Badge'
import { Text } from '~/ui/Text'
import { nFormatter, nLocaleFormatter } from '~/utils/generic'

import { AdminTable, EmptyState, formatDate, StatCard, Td } from './components'
import { adminLinkClassName } from './UsersTab'
import type { AdminBilling, AdminBillingUser, AdminPayment } from './types'

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
}

const formatAmount = (amount: number, currency: string): string =>
  `${CURRENCY_SYMBOLS[currency] || `${currency} `}${amount.toLocaleString(
    'en-US',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  )}`

const UserLink = ({ user }: { user: { id: string; email: string } | null }) => {
  if (!user) {
    return (
      <span className='text-gray-500 italic dark:text-gray-400'>
        Unknown account
      </span>
    )
  }

  return (
    <Link
      to={`/admin?tab=users&user=${user.id}`}
      className={adminLinkClassName}
    >
      {user.email}
    </Link>
  )
}

const PlanCell = ({ user }: { user: AdminBillingUser }) => (
  <span className='inline-flex items-center gap-1.5'>
    {user.planCode}
    {user.billingFrequency === 'yearly' ? (
      <Badge colour='slate' label='yearly' size='sm' />
    ) : null}
  </span>
)

const RevenueCell = ({ user }: { user: AdminBillingUser }) => (
  <span className='tabular-nums'>
    {user.monthlyRevenueUsd !== null
      ? `$${nLocaleFormatter(Math.round(user.monthlyRevenueUsd))}/mo`
      : '—'}
  </span>
)

// "in 3 days" / "2 days ago" with colour coding for urgency
const DeadlineBadge = ({ date }: { date: string | null }) => {
  if (!date) {
    return <>—</>
  }

  const daysLeft = dayjs(date).diff(dayjs(), 'day')

  return (
    <span className='inline-flex items-center gap-2'>
      <span>{formatDate(date)}</span>
      <Badge
        colour={daysLeft < 0 ? 'red' : daysLeft <= 3 ? 'yellow' : 'slate'}
        label={
          daysLeft < 0
            ? `${Math.abs(daysLeft)}d ago`
            : daysLeft === 0
              ? 'today'
              : `in ${daysLeft}d`
        }
        size='sm'
      />
    </span>
  )
}

const Section = ({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) => (
  <section>
    <Text as='h3' size='lg' weight='semibold'>
      {title}
    </Text>
    {hint ? (
      <Text as='p' size='sm' colour='secondary' className='mt-0.5'>
        {hint}
      </Text>
    ) : null}
    <div className='mt-3'>{children}</div>
  </section>
)

const PaymentsTable = ({
  payments,
  emptyMessage,
}: {
  payments: AdminPayment[]
  emptyMessage: string
}) => {
  if (payments.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <AdminTable
      columns={[
        { key: 'date', label: 'Date' },
        { key: 'user', label: 'Customer' },
        { key: 'amount', label: 'Amount' },
        { key: 'kind', label: '' },
        { key: 'receipt', label: '' },
      ]}
    >
      {payments.map((payment) => (
        <tr key={payment.id}>
          <Td>{formatDate(payment.date)}</Td>
          <Td>
            <UserLink user={payment.user} />
            {payment.user?.planCode ? (
              <span className='ml-2 text-xs text-gray-500 dark:text-gray-400'>
                {payment.user.planCode}
              </span>
            ) : null}
          </Td>
          <Td className='font-medium tabular-nums'>
            {formatAmount(payment.amount, payment.currency)}
          </Td>
          <Td>
            {payment.isOneOff ? (
              <Badge colour='indigo' label='one-off charge' size='sm' />
            ) : null}
          </Td>
          <Td>
            {payment.receiptUrl ? (
              <a
                href={payment.receiptUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
              >
                Receipt
                <ArrowSquareOutIcon className='size-3.5' />
              </a>
            ) : null}
          </Td>
        </tr>
      ))}
    </AdminTable>
  )
}

interface BillingTabProps {
  billing: AdminBilling
}

export const BillingTab = ({ billing }: BillingTabProps) => {
  const {
    trialsEndingSoon,
    cancellationPipeline,
    suspended,
    churnRisk,
    payments,
  } = billing

  const atRiskMrr =
    churnRisk.atRisk.reduce(
      (acc, user) => acc + (user.monthlyRevenueUsd || 0),
      0,
    ) +
    cancellationPipeline.reduce(
      (acc, user) => acc + (user.monthlyRevenueUsd || 0),
      0,
    )

  return (
    <div className='flex flex-col gap-8'>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard
          label='Trials ending (±14d)'
          value={trialsEndingSoon.length}
          hint='Expiring within 14 days or expired within 30'
        />
        <StatCard
          label='Churn risk'
          value={churnRisk.atRisk.length}
          hint={`Usage dropped ≥50% · ${churnRisk.analyzed} paying accounts analyzed`}
        />
        <StatCard
          label='Cancelling'
          value={cancellationPipeline.length}
          hint='Subscriptions with a cancellation date'
        />
        <StatCard
          label='At-risk MRR (est.)'
          value={`$${nLocaleFormatter(Math.round(atRiskMrr))}`}
          hint='Churn-risk + cancelling accounts, USD list price'
        />
      </div>

      <Section
        title='Trials ending soon'
        hint='Sorted by trial end date. High usage + imminent expiry = worth a personal email.'
      >
        {trialsEndingSoon.length === 0 ? (
          <EmptyState message='No trials ending in the next 14 days' />
        ) : (
          <AdminTable
            columns={[
              { key: 'email', label: 'User' },
              { key: 'trialEnd', label: 'Trial ends' },
              { key: 'monthlyEvents', label: 'Events this month' },
              { key: 'projects', label: 'Projects' },
              { key: 'registered', label: 'Registered' },
            ]}
          >
            {trialsEndingSoon.map((user) => (
              <tr key={user.id}>
                <Td>
                  <UserLink user={user} />
                </Td>
                <Td>
                  <DeadlineBadge date={user.trialEndDate} />
                </Td>
                <Td className='tabular-nums'>
                  <span
                    className={
                      user.monthlyEvents > 0
                        ? 'font-medium text-emerald-600 dark:text-emerald-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }
                  >
                    {nFormatter(user.monthlyEvents, 1)}
                  </span>
                </Td>
                <Td className='tabular-nums'>{user.projectCount}</Td>
                <Td>{formatDate(user.created)}</Td>
              </tr>
            ))}
          </AdminTable>
        )}
      </Section>

      <Section
        title='Churn risk'
        hint={`Paying accounts whose events dropped ≥50% vs the previous 30 days (min ${nLocaleFormatter(100)} events).`}
      >
        {churnRisk.atRisk.length === 0 ? (
          <EmptyState message='No paying accounts with collapsing usage — nice' />
        ) : (
          <AdminTable
            columns={[
              { key: 'email', label: 'User' },
              { key: 'plan', label: 'Plan' },
              { key: 'revenue', label: 'Est. revenue' },
              { key: 'events30d', label: 'Events (30d)' },
              { key: 'eventsPrev30d', label: 'Previous 30d' },
              { key: 'drop', label: 'Drop' },
            ]}
          >
            {churnRisk.atRisk.map((user) => (
              <tr key={user.id}>
                <Td>
                  <UserLink user={user} />
                </Td>
                <Td>
                  <PlanCell user={user} />
                </Td>
                <Td>
                  <RevenueCell user={user} />
                </Td>
                <Td className='tabular-nums'>
                  {nLocaleFormatter(user.events30d)}
                </Td>
                <Td className='tabular-nums'>
                  {nLocaleFormatter(user.eventsPrev30d)}
                </Td>
                <Td>
                  <Badge colour='red' label={`-${user.dropPercent}%`} />
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
      </Section>

      <Section
        title='Cancellation pipeline'
        hint='Active subscriptions that will end on their effective date.'
      >
        {cancellationPipeline.length === 0 ? (
          <EmptyState message='Nobody is cancelling right now' />
        ) : (
          <AdminTable
            columns={[
              { key: 'email', label: 'User' },
              { key: 'plan', label: 'Plan' },
              { key: 'revenue', label: 'Est. revenue' },
              { key: 'effective', label: 'Cancellation effective' },
              { key: 'nextBill', label: 'Next bill' },
            ]}
          >
            {cancellationPipeline.map((user) => (
              <tr key={user.id}>
                <Td>
                  <UserLink user={user} />
                </Td>
                <Td>
                  <PlanCell user={user} />
                </Td>
                <Td>
                  <RevenueCell user={user} />
                </Td>
                <Td>
                  <DeadlineBadge date={user.cancellationEffectiveDate} />
                </Td>
                <Td>{formatDate(user.nextBillDate)}</Td>
              </tr>
            ))}
          </AdminTable>
        )}
      </Section>

      <Section
        title='Suspended & blocked'
        hint='Accounts whose dashboards are blocked or billing is suspended.'
      >
        {suspended.length === 0 ? (
          <EmptyState message='No suspended or blocked accounts' />
        ) : (
          <AdminTable
            columns={[
              { key: 'email', label: 'User' },
              { key: 'plan', label: 'Plan' },
              { key: 'status', label: 'Status' },
              { key: 'registered', label: 'Registered' },
            ]}
          >
            {suspended.map((user) => (
              <tr key={user.id}>
                <Td>
                  <UserLink user={user} />
                </Td>
                <Td>
                  <PlanCell user={user} />
                </Td>
                <Td>
                  <span className='inline-flex items-center gap-1.5'>
                    {user.isAccountBillingSuspended ? (
                      <Badge colour='red' label='billing suspended' size='sm' />
                    ) : null}
                    {user.dashboardBlockReason ? (
                      <Badge
                        colour='yellow'
                        label={user.dashboardBlockReason}
                        size='sm'
                      />
                    ) : null}
                  </span>
                </Td>
                <Td>{formatDate(user.created)}</Td>
              </tr>
            ))}
          </AdminTable>
        )}
      </Section>

      {payments.available ? (
        <>
          <Section
            title='Recent payments'
            hint='Straight from Paddle (cached for an hour). One-off charges included.'
          >
            <PaymentsTable
              payments={payments.recent}
              emptyMessage='No payments in the last two months'
            />
          </Section>

          <Section
            title='Upcoming payments'
            hint='Scheduled renewals for the next 45 days.'
          >
            <PaymentsTable
              payments={payments.upcoming}
              emptyMessage='No scheduled payments'
            />
          </Section>
        </>
      ) : (
        <Section title='Payments'>
          <EmptyState message='Paddle data unavailable' />
        </Section>
      )}
    </div>
  )
}
