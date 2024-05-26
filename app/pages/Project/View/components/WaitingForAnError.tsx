import { BugAntIcon } from '@heroicons/react/24/outline'
import { Link } from '@remix-run/react'
import { useTranslation, Trans } from 'react-i18next'
import routes from 'routesPath'
import { ERROR_TRACKING_DOCS_URL } from 'redux/constants'

const TROUBLESHOOTING_URL = 'https://docs.swetrix.com/troubleshooting'

const WaitingForAnError = () => {
  const { t } = useTranslation('common')

  return (
    <div className='px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
      <div className='mx-auto max-w-max'>
        <main className='sm:flex'>
          <BugAntIcon
            type='giant'
            className='-ml-1.5 mb-2 h-12 w-12 text-gray-900 dark:text-gray-50 sm:m-0 sm:h-20 sm:w-20'
          />
          <div className='sm:ml-6'>
            <div className='sm:border-l sm:border-gray-200 sm:pl-6'>
              <h1 className='text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl'>
                {t('project.waitingError.title')}
              </h1>
              <p className='mt-2 max-w-[80ch] whitespace-pre-line text-base text-gray-700 dark:text-gray-300'>
                <Trans
                  // @ts-ignore
                  t={t}
                  i18nKey='project.waitingError.desc'
                  components={{
                    // eslint-disable-next-line jsx-a11y/anchor-has-content
                    turl: (
                      <a
                        href={TROUBLESHOOTING_URL}
                        className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                        target='_blank'
                        rel='noreferrer noopener'
                      />
                    ),
                    curl: (
                      <Link
                        to={routes.contact}
                        className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                      />
                    ),
                    howto: (
                      <a
                        href={ERROR_TRACKING_DOCS_URL}
                        className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                        target='_blank'
                        rel='noreferrer noopener'
                      />
                    ),
                  }}
                />
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default WaitingForAnError
