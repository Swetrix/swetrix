import { BuildingOffice2Icon } from '@heroicons/react/24/outline'
import cx from 'clsx'
import { useTranslation } from 'react-i18next'

interface AddOrganisationProps {
  onClick: () => void
  sitesCount: number
}

export const AddOrganisation = ({ onClick, sitesCount }: AddOrganisationProps) => {
  const { t } = useTranslation('common')

  return (
    <button
      type='button'
      onClick={onClick}
      className={cx(
        'group flex h-auto min-h-[153.1px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400',
        {
          'lg:min-h-[auto]': sitesCount % 3 !== 0,
        },
      )}
    >
      <div>
        <BuildingOffice2Icon className='mx-auto h-12 w-12 text-gray-400 group-hover:text-gray-500 dark:text-gray-200 group-hover:dark:text-gray-400' />
        <span className='mt-2 block text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-50 group-hover:dark:text-gray-400'>
          {t('organisations.new')}
        </span>
      </div>
    </button>
  )
}
