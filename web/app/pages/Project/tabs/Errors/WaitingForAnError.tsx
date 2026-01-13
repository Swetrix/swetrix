import { BugIcon } from 'lucide-react'
import { useTranslation, Trans } from 'react-i18next'
import { Link } from 'react-router'

import { ERROR_TRACKING_DOCS_URL } from '~/lib/constants'
import routes from '~/utils/routes'

const TROUBLESHOOTING_URL = 'https://docs.swetrix.com/troubleshooting'

const WaitingForAnError = () => {
  const { t } = useTranslation('common')

  return (
    <div className='mx-auto w-full max-w-2xl py-16 text-center text-gray-900 dark:text-gray-50'>
      <div className='mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800'>
        <BugIcon
          className='size-7 text-gray-700 dark:text-gray-200'
          strokeWidth={1.5}
        />
      </div>
      <h3 className='text-xl font-medium tracking-tight'>
        {t('project.waitingError.title')}
      </h3>
      <p className='mx-auto mt-2 max-w-md text-sm whitespace-pre-line text-gray-800 dark:text-gray-200'>
        <Trans
          t={t}
          i18nKey='project.waitingError.desc'
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
  )
}

export default WaitingForAnError
