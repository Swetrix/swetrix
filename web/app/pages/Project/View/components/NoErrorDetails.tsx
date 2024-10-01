import { BugAntIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

const NoErrorDetails = () => {
  const { t } = useTranslation('common')

  return (
    <div className='px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
      <div className='mx-auto max-w-max'>
        <main className='sm:flex'>
          <BugAntIcon type='giant' className='-ml-1.5 mb-2 h-12 w-12 sm:m-0 sm:h-20 sm:w-20' />
          <div className='sm:ml-6'>
            <div className='sm:border-l sm:border-gray-200 sm:pl-6'>
              <h1 className='text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl'>
                {t('project.noErrorDetails')}
              </h1>
              <p className='mt-1 max-w-prose whitespace-pre-line text-base text-gray-700 dark:text-gray-300'>
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
