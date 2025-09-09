import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { isSelfhosted, apiUrlUnprocessed } from '~/lib/constants'
import Modal from '~/ui/Modal'

const SelfhostedApiUrlBanner = () => {
  const { t } = useTranslation('common')
  const [showMoreInfoModal, setShowMoreInfoModal] = useState(false)

  if (!isSelfhosted || apiUrlUnprocessed) {
    return null
  }

  return (
    <>
      <div className='bg-yellow-400 dark:bg-yellow-500'>
        <div className='mx-auto max-w-7xl px-3 py-3 sm:px-6 lg:px-8'>
          <div className='flex flex-wrap items-center justify-between'>
            <div className='flex flex-1 items-center'>
              <span className='flex rounded-lg bg-yellow-600 p-2'>
                <ExclamationTriangleIcon className='h-6 w-6 text-white' aria-hidden='true' />
              </span>
              <p className='ml-3 truncate font-medium text-black'>Can't reach backend — check API_URL configuration</p>
            </div>
            <div className='order-3 mt-2 w-full shrink-0 sm:order-2 sm:mt-0 sm:w-auto'>
              <span
                onClick={() => setShowMoreInfoModal(true)}
                className='flex cursor-pointer items-center justify-center rounded-md bg-gray-50 px-4 py-2 text-sm font-medium text-yellow-600 hover:bg-yellow-50 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
              >
                {t('common.learnMore')}
              </span>
            </div>
          </div>
        </div>
      </div>
      <Modal
        onClose={() => setShowMoreInfoModal(false)}
        onSubmit={() => setShowMoreInfoModal(false)}
        submitText={t('common.gotIt')}
        title='API_URL is not configured'
        message={
          <div className='text-left'>
            <p className='mb-3'>
              You are running Swetrix Community Edition without API_URL set. The frontend cannot reach the API.
            </p>
            <p className='mb-3'>
              Set the API_URL environment variable to your API instance URL. In self-hosting there are two containers:
            </p>
            <ul className='mb-3 list-disc pl-6'>
              <li>swetrix/swetrix-fe — the frontend UI</li>
              <li>swetrix/swetrix-api — the API (auth, data ingest)</li>
            </ul>
            <p className='mb-2 font-medium'>Examples</p>
            <ul className='mb-3 list-disc pl-6'>
              <li>
                Local default: <code>API_URL=http://localhost:8080</code>
              </li>
              <li>
                With subdomains: <code>API_URL=https://swetrix-api.mydomain.com</code>
              </li>
            </ul>
            <p>Please configure it and restart the containers.</p>
          </div>
        }
        type='warning'
        isOpened={showMoreInfoModal}
      />
    </>
  )
}

export default memo(SelfhostedApiUrlBanner)
