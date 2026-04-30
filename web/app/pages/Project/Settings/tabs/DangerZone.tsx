import { useTranslation } from 'react-i18next'

import Button from '~/ui/Button'
import Checkbox from '~/ui/Checkbox'

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
      <h3 className='text-lg font-bold text-gray-900 dark:text-gray-50'>
        {t('project.settings.tabs.danger')}
      </h3>

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
            <div className='text-sm font-medium text-gray-900 dark:text-gray-50'>
              {t('project.settings.transfer')}
            </div>
            <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
              {t('project.settings.transferShort')}
            </p>
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
            <div className='text-sm font-medium text-gray-900 dark:text-gray-50'>
              {t('project.settings.reset')}
            </div>
            <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
              {t('project.settings.resetShort')}
            </p>
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
            <div className='text-sm font-medium text-gray-900 dark:text-gray-50'>
              {t('project.settings.delete')}
            </div>
            <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
              {t('project.settings.deleteShort')}
            </p>
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
