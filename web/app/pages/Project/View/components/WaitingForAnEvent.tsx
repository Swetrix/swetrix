import { useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { Link } from 'react-router'

import TrackingSnippet from '~/modals/TrackingSnippet'
import PulsatingCircle from '~/ui/icons/PulsatingCircle'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'

const TROUBLESHOOTING_URL = 'https://swetrix.com/docs/troubleshooting'

const WaitingForAnEvent = () => {
  const { t } = useTranslation('common')
  const [isModalOpened, setIsModalOpened] = useState(false)

  return (
    <div className='mx-auto w-full max-w-2xl py-16 text-center'>
      <div className='mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-900'>
        <PulsatingCircle type='giant' />
      </div>
      <Text as='h3' size='xl' weight='medium' className='tracking-tight'>
        {t('project.waiting.title')}
      </Text>
      <Text
        as='p'
        size='sm'
        colour='secondary'
        className='mx-auto mt-2 max-w-md whitespace-pre-line'
      >
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
              <button
                type='button'
                className='cursor-pointer font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                onClick={() => setIsModalOpened(true)}
              />
            ),
          }}
        />
      </Text>
      <TrackingSnippet
        isOpened={isModalOpened}
        onClose={() => setIsModalOpened(false)}
      />
    </div>
  )
}

export default WaitingForAnEvent
