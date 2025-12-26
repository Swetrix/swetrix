import { ArrowLeftRight, RotateCcw, Trash2Icon } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'

import Button from '~/ui/Button'

interface DangerZoneProps {
  setShowTransfer: (show: boolean) => void
  setShowReset: (show: boolean) => void
  setShowDelete: (show: boolean) => void
  isDeleting: boolean
  setResetting: boolean
}

const DangerZone = ({ setShowTransfer, setShowReset, setShowDelete, isDeleting, setResetting }: DangerZoneProps) => {
  const { t } = useTranslation('common')

  return (
    <div>
      <h3 className='text-lg font-bold text-gray-900 dark:text-gray-50'>Danger zone</h3>

      <div className='mt-4 space-y-3'>
        <div className='rounded-md border border-gray-200 p-3 dark:border-gray-800'>
          <div className='flex items-start'>
            <ArrowLeftRight className='mt-0.5 h-5 w-5 text-red-700 dark:text-red-500' />
            <div className='ml-3 flex-1'>
              <div className='text-sm font-medium text-gray-900 dark:text-gray-50'>
                {t('project.settings.transfer')}
              </div>
              <p className='mt-0.5 text-sm text-gray-500 dark:text-gray-400'>{t('project.settings.transferShort')}</p>
              <div className='mt-3'>
                <Button onClick={() => setShowTransfer(true)} semiDanger semiSmall>
                  {t('project.settings.transfer')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className='rounded-md border border-gray-200 p-3 dark:border-gray-800'>
          <div className='flex items-start'>
            <RotateCcw className='mt-0.5 h-5 w-5 text-red-700 dark:text-red-500' />
            <div className='ml-3 flex-1'>
              <div className='text-sm font-medium text-gray-900 dark:text-gray-50'>{t('project.settings.reset')}</div>
              <p className='mt-0.5 text-sm text-gray-500 dark:text-gray-400'>{t('project.settings.resetShort')}</p>
              <div className='mt-3'>
                <Button onClick={() => !setResetting && setShowReset(true)} loading={isDeleting} semiDanger semiSmall>
                  {t('project.settings.reset')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className='rounded-md border border-gray-200 p-3 dark:border-gray-800'>
          <div className='flex items-start'>
            <Trash2Icon className='mt-0.5 h-5 w-5 text-red-700 dark:text-red-500' strokeWidth={1.5} />
            <div className='ml-3 flex-1'>
              <div className='text-sm font-medium text-gray-900 dark:text-gray-50'>{t('project.settings.delete')}</div>
              <p className='mt-0.5 text-sm text-gray-500 dark:text-gray-400'>{t('project.settings.deleteShort')}</p>
              <div className='mt-3'>
                <Button onClick={() => !isDeleting && setShowDelete(true)} loading={isDeleting} danger semiSmall>
                  {t('project.settings.delete')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DangerZone
