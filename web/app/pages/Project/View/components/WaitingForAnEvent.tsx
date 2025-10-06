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
    <div className='mx-auto w-full max-w-2xl py-16 text-center text-gray-900 dark:text-gray-50'>
      <div className='mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800'>
        <PulsatingCircle type='giant' />
      </div>
      <h3 className='text-xl font-medium tracking-tight'>{t('project.waiting.title')}</h3>
      <p className='mx-auto mt-2 max-w-md text-sm whitespace-pre-line text-gray-800 dark:text-gray-200'>
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
              <Link to={routes.contact} className='font-medium text-indigo-600 hover:underline dark:text-indigo-400' />
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
      <TrackingSnippet isOpened={isModalOpened} onClose={() => setIsModalOpened(false)} />
    </div>
  )
}

export default WaitingForAnEvent
