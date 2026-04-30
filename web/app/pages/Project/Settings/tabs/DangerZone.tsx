import { useTranslation } from 'react-i18next'

import Button from '~/ui/Button'
import Checkbox from '~/ui/Checkbox'
import { Text } from '~/ui/Text'

interface DangerZoneProps {
  isActive: boolean
  onToggleActive: (active: boolean) => void
  isSaving: boolean
  setShowTransfer: (show: boolean) => void
  setShowReset: (show: boolean) => void
  setShowDelete: (show: boolean) => void
  isDeleting: boolean
  setResetting: boolean
}

const DangerZone = ({
  isActive,
  onToggleActive,
  isSaving,
  setShowTransfer,
  setShowReset,
  setShowDelete,
  isDeleting,
  setResetting,
}: DangerZoneProps) => {
  const { t } = useTranslation('common')

  return (
    <div>
      <Text as='h3' size='lg' weight='bold'>
        {t('project.settings.tabs.danger')}
      </Text>

      <div className='mt-6 mb-8'>
        <Checkbox
          checked={isActive}
          onChange={onToggleActive}
          name='active'
          label={t('project.settings.enabled')}
          hint={t('project.settings.enabledHint')}
        />
        <div className='mt-4 flex'>
          <Button type='submit' loading={isSaving}>
            {t('common.save')}
          </Button>
        </div>
      </div>

      <hr className='my-6 border-gray-200 dark:border-gray-800' />

      <div className='flex flex-col gap-6'>
        <div className='flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <Text as='div' size='sm' weight='medium'>
              {t('project.settings.transfer')}
            </Text>
            <Text as='p' size='sm' colour='muted' className='mt-1'>
              {t('project.settings.transferShort')}
            </Text>
          </div>
          <Button
            variant='danger-outline'
            type='button'
            onClick={() => setShowTransfer(true)}
            className='shrink-0'
          >
            {t('project.settings.transfer')}
          </Button>
        </div>

        <hr className='border-gray-200 dark:border-gray-800' />

        <div className='flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <Text as='div' size='sm' weight='medium'>
              {t('project.settings.reset')}
            </Text>
            <Text as='p' size='sm' colour='muted' className='mt-1'>
              {t('project.settings.resetShort')}
            </Text>
          </div>
          <Button
            variant='danger-outline'
            type='button'
            onClick={() => !setResetting && setShowReset(true)}
            loading={setResetting}
            className='shrink-0'
          >
            {t('project.settings.reset')}
          </Button>
        </div>

        <hr className='border-gray-200 dark:border-gray-800' />

        <div className='flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <Text as='div' size='sm' weight='medium'>
              {t('project.settings.delete')}
            </Text>
            <Text as='p' size='sm' colour='muted' className='mt-1'>
              {t('project.settings.deleteShort')}
            </Text>
          </div>
          <Button
            variant='danger'
            type='button'
            onClick={() => !isDeleting && setShowDelete(true)}
            loading={isDeleting}
            className='shrink-0'
          >
            {t('project.settings.delete')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default DangerZone
