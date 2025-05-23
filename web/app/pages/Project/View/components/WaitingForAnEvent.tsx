import { useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { Link } from 'react-router'

import TrackingSnippet from '~/modals/TrackingSnippet'
import PulsatingCircle from '~/ui/icons/PulsatingCircle'
import routes from '~/utils/routes'

const TROUBLESHOOTING_URL = 'https://docs.swetrix.com/troubleshooting'

const WaitingForAnEvent = () => {
  const { t } = useTranslation('common')
  const [isModalOpened, setIsModalOpened] = useState(false)

  return (
    <div className='px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
      <div className='mx-auto max-w-max'>
        <main className='sm:flex'>
          <PulsatingCircle type='giant' className='mb-2 -ml-1.5 sm:m-0' />
          <div className='sm:ml-6'>
            <div className='sm:border-l sm:border-gray-200 sm:pl-6'>
              <h1 className='text-4xl font-extrabold text-gray-900 sm:text-5xl dark:text-gray-50'>
                {t('project.waiting.title')}
              </h1>
              <p className='mt-4 max-w-[100ch] text-sm whitespace-pre-line text-gray-800 dark:text-gray-200'>
                <Trans
                  t={t}
                  i18nKey='project.waiting.desc'
                  components={{
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
                    snippet: (
                      <span
                        tabIndex={0}
                        role='button'
                        className='cursor-pointer font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                        onClick={() => setIsModalOpened(true)}
                      />
                    ),
                  }}
                />
              </p>
            </div>
          </div>
        </main>
      </div>
      <TrackingSnippet isOpened={isModalOpened} onClose={() => setIsModalOpened(false)} />
    </div>
  )
}

export default WaitingForAnEvent
