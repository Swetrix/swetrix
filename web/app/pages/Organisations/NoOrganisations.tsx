import { useTranslation } from 'react-i18next'
import { BuildingOffice2Icon } from '@heroicons/react/24/outline'

interface NoOrganisationsProps {
  onClick: () => void
}

export const NoOrganisations = ({ onClick }: NoOrganisationsProps) => {
  const { t } = useTranslation('common')

  return (
    <button
      type='button'
      onClick={onClick}
      className='relative mx-auto block max-w-lg rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
    >
      <BuildingOffice2Icon className='mx-auto h-12 w-12 text-gray-400 dark:text-gray-200' />
      <span className='mt-2 block text-sm font-semibold text-gray-900 dark:text-gray-50'>
        {t('dashboard.createProject')}
      </span>
    </button>
  )
}
