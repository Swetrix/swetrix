import _isEmpty from 'lodash/isEmpty'
import { memo } from 'react'
import { useTranslation, Trans } from 'react-i18next'

import { DOCS_CAPTCHA_URL } from '~/lib/constants'
import { Filter } from '~/pages/Project/View/interfaces/traffic'
import Button from '~/ui/Button'

interface NoEventsProps {
  filters: Filter[]
  resetFilters: () => void
}

const NoEvents = ({ filters, resetFilters }: NoEventsProps) => {
  const { t } = useTranslation('common')

  return (
    <div className='mt-5 flex flex-col py-6 sm:px-6 lg:px-8'>
      <div className='mx-auto w-full max-w-7xl text-gray-900 dark:text-gray-50'>
        <h2 className='my-3 text-center text-4xl leading-tight'>{t('project.noEvTitle')}</h2>
        <h2 className='mb-8 text-center text-2xl leading-snug'>
          <Trans
            t={t}
            i18nKey='project.noCaptchaEv'
            components={{
              url: (
                <a
                  href={DOCS_CAPTCHA_URL}
                  className='text-blue-600 hover:underline'
                  target='_blank'
                  rel='noreferrer noopener'
                />
              ),
            }}
          />
        </h2>
        {!_isEmpty(filters) ? (
          <div className='!mx-auto !flex'>
            <Button onClick={resetFilters} className='!mx-auto !flex' primary giant>
              {t('project.resetFilters')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default memo(NoEvents)
