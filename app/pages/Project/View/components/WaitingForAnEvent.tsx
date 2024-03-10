import React, { useState } from 'react'
import { Link } from '@remix-run/react'
import { IUser } from 'redux/models/IUser'
import { IProjectForShared } from 'redux/models/ISharedProject'
import { useTranslation, Trans } from 'react-i18next'
import routes from 'routesPath'
import PulsatingCircle from 'ui/icons/PulsatingCircle'
import TrackingSnippet from 'modals/TrackingSnippet'

interface IWaitingForAnEvent {
  user?: IUser
  project: IProjectForShared
}

const TROUBLESHOOTING_URL = 'https://docs.swetrix.com/troubleshooting'

const WaitingForAnEvent = ({ project }: IWaitingForAnEvent) => {
  const { t } = useTranslation('common')
  const [isModalOpened, setIsModalOpened] = useState(false)

  return (
    <div className='px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
      <div className='max-w-max mx-auto'>
        <main className='sm:flex'>
          <PulsatingCircle type='giant' className='-ml-1.5 mb-2 sm:m-0' />
          <div className='sm:ml-6'>
            <div className='sm:border-l sm:border-gray-200 sm:pl-6'>
              <h1 className='text-4xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight sm:text-5xl'>
                {t('project.waiting.title')}
              </h1>
              <p className='mt-1 max-w-prose whitespace-pre-line text-base text-gray-500 dark:text-gray-300'>
                <Trans
                  // @ts-ignore
                  t={t}
                  i18nKey='project.waiting.desc'
                  components={{
                    // eslint-disable-next-line jsx-a11y/anchor-has-content
                    turl: (
                      <a
                        href={TROUBLESHOOTING_URL}
                        className='font-medium text-indigo-400 hover:underline hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'
                        target='_blank'
                        rel='noreferrer noopener'
                      />
                    ),
                    curl: (
                      <Link
                        to={routes.contact}
                        className='font-medium text-indigo-400 hover:underline hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'
                      />
                    ),
                    snippet: (
                      <span
                        role='button'
                        className='cursor-pointer font-medium text-indigo-400 hover:underline hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'
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
      <TrackingSnippet isOpened={isModalOpened} onClose={() => setIsModalOpened(false)} pid={project.id} />
    </div>
  )
}

export default WaitingForAnEvent
