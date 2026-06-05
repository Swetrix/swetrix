import { LockIcon } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import Button from '~/ui/Button'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'

const RETENTION_OPTIONS = [30, 90, 365, 1825] as const
type RetentionOption = (typeof RETENTION_OPTIONS)[number]

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
  const retentionItems = useMemo(
    () => RETENTION_OPTIONS.map((days) => ({ days })),
    [],
  )
  const selectedRetentionItem = useMemo(
    () =>
      retentionItems.find((item) => item.days === selectedRetention) ||
      retentionItems[0],
    [retentionItems, selectedRetention],
  )
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

      <div className='mt-5 max-w-xs'>
        <Select<{ days: RetentionOption }>
          label={t('project.settings.sessionReplays.retentionLabel')}
          title={t(
            `project.settings.sessionReplays.retention.${selectedRetentionItem.days}`,
          )}
          items={retentionItems}
          keyExtractor={(item) => String(item.days)}
          labelExtractor={(item) =>
            t(`project.settings.sessionReplays.retention.${item.days}`)
          }
          iconExtractor={(item) =>
            item.days > maxRetentionDays ? (
              <LockIcon className='size-4 text-gray-400 dark:text-slate-600' />
            ) : null
          }
          descriptionExtractor={(item) =>
            item.days > maxRetentionDays
              ? t('project.settings.sessionReplays.upgradeRequired')
              : null
          }
          disabledItemExtractor={(item) =>
            item.days > maxRetentionDays && item.days !== selectedRetention
          }
          selectedItem={selectedRetentionItem}
          onSelect={(item) => {
            if (
              item.days > maxRetentionDays ||
              item.days === selectedRetention
            ) {
              return
            }

            onRetentionChange(item.days)
          }}
        />
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
          <Button to={`${routes.user_settings}?tab=billing`} className='mt-4'>
            {t('project.settings.sessionReplays.upgradeCta')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export default SessionReplays
