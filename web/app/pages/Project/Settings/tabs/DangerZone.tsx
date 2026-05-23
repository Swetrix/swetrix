import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Button from '~/ui/Button'
import Checkbox from '~/ui/Checkbox'
import { Text } from '~/ui/Text'

interface DangerActionProps {
  title: string
  description: string
  action: ReactNode
}

const DangerAction = ({ title, description, action }: DangerActionProps) => (
  <div className='flex flex-col items-start gap-4 py-5 sm:flex-row sm:items-center sm:justify-between'>
    <div>
      <Text as='h4' size='sm' weight='medium'>
        {title}
      </Text>
      <Text as='p' size='sm' colour='secondary' className='mt-1'>
        {description}
      </Text>
    </div>
    <div className='shrink-0'>{action}</div>
  </div>
)

interface DangerZoneProps {
  isActive: boolean
  onToggleActive: (active: boolean) => void
  setShowTransfer: (show: boolean) => void
  setShowReset: (show: boolean) => void
  setShowDelete: (show: boolean) => void
  isDeleting: boolean
  setResetting: boolean
}

const DangerZone = ({
  isActive,
  onToggleActive,
  setShowTransfer,
  setShowReset,
  setShowDelete,
  isDeleting,
  setResetting,
}: DangerZoneProps) => {
  const { t } = useTranslation('common')

  return (
    <div>
      <section>
        <Text as='h3' size='lg' weight='bold'>
          {t('project.settings.projectStatus')}
        </Text>
        <div className='mt-2'>
          <Checkbox
            checked={isActive}
            onChange={onToggleActive}
            name='active'
            label={t('project.settings.enabled')}
            hint={t('project.settings.enabledHint')}
            classes={{ hint: 'max-w-prose' }}
          />
        </div>
      </section>

      <section className='mt-8'>
        <Text as='h3' size='lg' weight='bold'>
          {t('project.settings.destructiveActions')}
        </Text>
        <div className='mt-2 divide-y divide-gray-200 dark:divide-gray-800'>
          <DangerAction
            title={t('project.settings.transfer')}
            description={t('project.settings.transferShort')}
            action={
              <Button
                variant='danger-outline'
                type='button'
                onClick={() => setShowTransfer(true)}
              >
                {t('project.settings.transfer')}
              </Button>
            }
          />
          <DangerAction
            title={t('project.settings.reset')}
            description={t('project.settings.resetShort')}
            action={
              <Button
                variant='danger-outline'
                type='button'
                onClick={() => !setResetting && setShowReset(true)}
                loading={setResetting}
              >
                {t('project.settings.reset')}
              </Button>
            }
          />
          <DangerAction
            title={t('project.settings.delete')}
            description={t('project.settings.deleteShort')}
            action={
              <Button
                variant='danger'
                type='button'
                onClick={() => !isDeleting && setShowDelete(true)}
                loading={isDeleting}
              >
                {t('project.settings.delete')}
              </Button>
            }
          />
        </div>
      </section>
    </div>
  )
}

export default DangerZone
