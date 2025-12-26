import { BugIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const NoErrorDetails = () => {
  const { t } = useTranslation('common')

  return (
    <div className='mx-auto w-full max-w-2xl py-16 text-center text-gray-900 dark:text-gray-50'>
      <div className='mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800'>
        <BugIcon className='size-7 text-gray-700 dark:text-gray-200' strokeWidth={1.5} />
      </div>
      <h3 className='text-xl font-medium tracking-tight'>{t('project.noErrorDetails')}</h3>
      <p className='mx-auto mt-2 max-w-md text-sm whitespace-pre-line text-gray-800 dark:text-gray-200'>
        {t('project.noErrorDesc')}
      </p>
    </div>
  )
}

export default NoErrorDetails
