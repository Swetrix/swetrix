import { BuildingOffice2Icon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

interface NoOrganisationsProps {
  onClick: () => void
}

export const NoOrganisations = ({ onClick }: NoOrganisationsProps) => {
  const { t } = useTranslation('common')

  return (
    <div className='mx-auto w-full max-w-2xl py-16 text-center text-gray-900 dark:text-gray-50'>
      <div className='mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800'>
        <BuildingOffice2Icon className='size-7 text-gray-700 dark:text-gray-200' strokeWidth={1.5} />
      </div>
      <h3 className='text-xl font-medium tracking-tight'>{t('organisations.noOrganisations')}</h3>
      <p className='mx-auto mt-2 max-w-md text-sm text-gray-600 dark:text-gray-300'>
        {t('organisations.createOrganisation')}
      </p>
      <button
        type='button'
        onClick={onClick}
        className='mt-6 rounded-md border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 dark:border-gray-800 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
      >
        {t('organisations.new')}
      </button>
    </div>
  )
}
