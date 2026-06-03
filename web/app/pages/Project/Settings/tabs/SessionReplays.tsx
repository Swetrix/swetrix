import { LockIcon } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import Button from '~/ui/Button'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { cn } from '~/utils/generic'
import routes from '~/utils/routes'

const RETENTION_OPTIONS = [30, 90, 365, 1825] as const

interface SessionReplaysProps {
  retentionDays: number
  maxRetentionDays: number
  onRetentionChange: (days: number) => void
}

const SessionReplays = ({
  retentionDays,
  maxRetentionDays,
  onRetentionChange,
}: SessionReplaysProps) => {
  const { t } = useTranslation('common')
  const selectedRetention = RETENTION_OPTIONS.includes(retentionDays as any)
    ? retentionDays
    : 30
  const hasLockedOptions = useMemo(
    () => RETENTION_OPTIONS.some((days) => days > maxRetentionDays),
    [maxRetentionDays],
  )

  return (
    <div className='max-w-3xl'>
      <div>
        <Text as='h3' size='lg' weight='semibold'>
          {t('project.settings.sessionReplays.retentionTitle')}
        </Text>
        <Text as='p' size='sm' colour='secondary' className='mt-1 max-w-2xl'>
          {t('project.settings.sessionReplays.retentionDescription')}
        </Text>
      </div>

      <div
        role='radiogroup'
        aria-label={t('project.settings.sessionReplays.retentionLabel')}
        className='mt-5 grid w-full max-w-2xl grid-cols-2 gap-1 rounded-lg border border-gray-200 bg-white p-1 sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-950'
      >
        {RETENTION_OPTIONS.map((days) => {
          const allowed = days <= maxRetentionDays
          const active = selectedRetention === days
          const label = t(`project.settings.sessionReplays.retention.${days}`)
          const className = cn(
            'flex min-h-14 items-center justify-center rounded-md px-3 py-2 text-center text-sm font-medium transition-colors',
            {
              'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950':
                active && allowed,
              'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-900':
                !active && allowed,
              'cursor-not-allowed text-gray-400 dark:text-slate-600': !allowed,
            },
          )

          if (!allowed) {
            return (
              <Tooltip
                key={days}
                text={t('project.settings.sessionReplays.upgradeRequired')}
                tooltipNode={
                  <span className={className}>
                    <span>{label}</span>
                    <LockIcon className='ml-1.5 size-3.5' />
                  </span>
                }
              />
            )
          }

          return (
            <label key={days} className={className}>
              <input
                type='radio'
                className='sr-only'
                aria-label={label}
                checked={active}
                onChange={() => onRetentionChange(days)}
              />
              {label}
            </label>
          )
        })}
      </div>

      <Text as='p' size='xs' colour='secondary' className='mt-3 max-w-2xl'>
        {t('project.settings.sessionReplays.retentionHint')}
      </Text>

      {hasLockedOptions ? (
        <div className='mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900/30'>
          <Text as='h4' size='base' weight='semibold'>
            {t('project.settings.sessionReplays.upgradeTitle')}
          </Text>
          <Text as='p' size='sm' colour='secondary' className='mt-1'>
            {t('project.settings.sessionReplays.upgradeDescription')}
          </Text>
          <Button to={routes.billing_choose_plan} className='mt-4'>
            {t('project.settings.sessionReplays.upgradeCta')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export default SessionReplays
