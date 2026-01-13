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
                <ExclamationTriangleIcon
                  className='h-6 w-6 text-white'
                  aria-hidden='true'
                />
              </span>
              <p className='ml-3 truncate font-medium text-black'>
                {t('ce.noApiUrl.banner')}
              </p>
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
        title={t('ce.noApiUrl.title')}
        message={
          <div className='text-left'>
            <p className='mb-3'>{t('ce.noApiUrl.intro1')}</p>
            <p className='mb-3'>{t('ce.noApiUrl.intro2')}</p>
            <ul className='mb-3 list-disc pl-6'>
              <li>{t('ce.noApiUrl.listFe')}</li>
              <li>{t('ce.noApiUrl.listApi')}</li>
            </ul>
            <p className='mb-2 font-medium'>{t('ce.noApiUrl.examplesTitle')}</p>
            <ul className='mb-3 list-disc pl-6'>
              <li>
                {t('ce.noApiUrl.exampleLocal.label')}{' '}
                <code>{t('ce.noApiUrl.exampleLocal.value')}</code>
              </li>
              <li>
                {t('ce.noApiUrl.exampleSubdomain.label')}{' '}
                <code>{t('ce.noApiUrl.exampleSubdomain.value')}</code>
              </li>
            </ul>
            <p>{t('ce.noApiUrl.finalNote')}</p>
          </div>
        }
        type='warning'
        isOpened={showMoreInfoModal}
      />
    </>
  )
}

export default memo(SelfhostedApiUrlBanner)
