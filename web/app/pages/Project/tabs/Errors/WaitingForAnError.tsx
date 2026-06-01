import { WarningIcon } from '@phosphor-icons/react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from '~/ui/Link'

import { ERROR_TRACKING_DOCS_URL } from '~/lib/constants'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'

const TROUBLESHOOTING_URL = 'https://swetrix.com/docs/troubleshooting'

const WaitingForAnError = () => {
  const { t } = useTranslation('common')

  return (
    <div className='mx-auto w-full max-w-2xl py-16 text-center'>
      <div className='mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-900'>
        <WarningIcon className='size-7 text-gray-700 dark:text-gray-200' />
      </div>
      <Text as='h3' size='xl' weight='medium' className='tracking-tight'>
        {t('project.waitingError.title')}
      </Text>
      <Text
        as='p'
        size='sm'
        colour='secondary'
        className='mx-auto mt-2 max-w-md whitespace-pre-wrap'
      >
        <Trans
          t={t}
          i18nKey='project.waitingError.desc'
          components={{
            turl: (
              <a
                href={TROUBLESHOOTING_URL}
                aria-label={t('ariaLabels.openTroubleshootingGuide')}
                className='font-medium underline decoration-dashed hover:decoration-solid'
                target='_blank'
                rel='noreferrer noopener'
              />
            ),
            curl: (
              <Link
                to={routes.contact}
                className='font-medium underline decoration-dashed hover:decoration-solid'
              />
            ),
            howto: (
              <a
                href={ERROR_TRACKING_DOCS_URL}
                aria-label={t('ariaLabels.openErrorTrackingGuide')}
                className='font-medium underline decoration-dashed hover:decoration-solid'
                target='_blank'
                rel='noreferrer noopener'
              />
            ),
          }}
        />
      </Text>
    </div>
  )
}

export default WaitingForAnError
