import { Link } from 'react-router'
import { useTranslation, Trans } from 'react-i18next'
import routes from '~/utils/routes'
import { ERROR_TRACKING_DOCS_URL } from '~/lib/constants'
import { BugIcon } from 'lucide-react'

const TROUBLESHOOTING_URL = 'https://docs.swetrix.com/troubleshooting'

const WaitingForAnError = () => {
  const { t } = useTranslation('common')

  return (
    <div className='px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
      <div className='mx-auto max-w-max'>
        <main className='sm:flex'>
          <BugIcon className='mb-2 -ml-1.5 h-12 w-12 text-gray-900 sm:m-0 sm:h-20 sm:w-20 dark:text-gray-50' />
          <div className='sm:ml-6'>
            <div className='sm:border-l sm:border-gray-200 sm:pl-6'>
              <h1 className='text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl dark:text-gray-50'>
                {t('project.waitingError.title')}
              </h1>
              <p className='mt-4 max-w-[100ch] font-mono text-sm whitespace-pre-line text-gray-800 dark:text-gray-200'>
                <Trans
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
