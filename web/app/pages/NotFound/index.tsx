import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { isSelfhosted } from '~/lib/constants'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'

const CONTACT_US_URL = `https://swetrix.com${routes.contact}`

const NotFound = () => {
  const { t } = useTranslation('common')

  return (
    <div className='min-h-min-footer bg-gray-50 px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8 dark:bg-slate-950'>
      <div className='mx-auto max-w-max'>
        <main className='sm:flex'>
          <Text
            as='p'
            size='4xl'
            weight='bold'
            className='text-indigo-600 sm:text-5xl dark:text-indigo-500'
          >
            404
          </Text>
          <div className='sm:ml-6'>
            <div className='sm:border-l sm:border-gray-200 sm:pl-6'>
              <Text as='h1' size='4xl' weight='bold' className='sm:text-5xl'>
                {t('notFoundPage.title')}
              </Text>
              <Text
                as='p'
                size='base'
                colour='muted'
                className='mt-1 whitespace-pre-line'
              >
                {t('notFoundPage.description')}
              </Text>
            </div>
            <div className='mt-8 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6'>
              <Link
                to={routes.main}
                className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden'
              >
                {t('notFoundPage.goHome')}
              </Link>
              {isSelfhosted ? (
                <a
                  href={CONTACT_US_URL}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-800 dark:focus:ring-gray-50'
                >
                  {t('notFoundPage.support')}
                </a>
              ) : (
                <Link
                  to={routes.contact}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-800 dark:focus:ring-gray-50'
                >
                  {t('notFoundPage.support')}
                </Link>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default NotFound
