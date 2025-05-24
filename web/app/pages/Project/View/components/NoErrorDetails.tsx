import { BugIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const NoErrorDetails = () => {
  const { t } = useTranslation('common')

  return (
    <div className='px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
      <div className='mx-auto max-w-max'>
        <main className='sm:flex'>
          <BugIcon className='mb-2 -ml-1.5 h-12 w-12 sm:m-0 sm:h-20 sm:w-20' />
          <div className='sm:ml-6'>
            <div className='sm:border-l sm:border-gray-200 sm:pl-6'>
              <h1 className='text-4xl font-extrabold text-gray-900 sm:text-5xl dark:text-gray-50'>
                {t('project.noErrorDetails')}
              </h1>
              <p className='mt-1 max-w-prose text-base whitespace-pre-line text-gray-700 dark:text-gray-300'>
                {t('project.noErrorDesc')}
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default NoErrorDetails
