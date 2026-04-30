import { ArrowSquareOutIcon } from '@phosphor-icons/react'
import { useTranslation, Trans } from 'react-i18next'

import {
  CONTACT_EMAIL,
  TWITTER_URL,
  TWITTER_USERNAME,
  DISCORD_URL,
  DOCS_URL,
  BOOK_A_CALL_URL,
} from '~/lib/constants'
import { Text } from '~/ui/Text'

interface PanelProps {
  href: string
  title: string
  description: string
}

const Panel = ({ href, title, description }: PanelProps) => (
  <a
    href={href}
    target='_blank'
    rel='noopener noreferrer'
    className='relative block rounded-2xl border border-gray-300/80 bg-gray-100 p-10 transition-colors hover:bg-gray-200 dark:border-slate-900/80 dark:bg-slate-800/80 dark:hover:bg-slate-900'
  >
    <ArrowSquareOutIcon
      aria-hidden='true'
      className='absolute top-5 right-5 size-5 text-gray-900 dark:text-gray-100'
    />
    <Text as='h3' size='lg' weight='semibold' className='leading-7'>
      {title}
    </Text>
    <Text as='p' size='sm' colour='secondary' className='mt-3 leading-6'>
      {description}
    </Text>
  </a>
)

const Contact = () => {
  const { t } = useTranslation('common')

  return (
    <div className='min-h-min-footer bg-gray-50 dark:bg-slate-950'>
      <div className='mx-auto px-4 pt-12 pb-16 whitespace-pre-line sm:px-6 md:w-4/5 lg:px-8'>
        <Text as='h1' size='4xl' weight='bold' className='tracking-tight'>
          {t('titles.contact')}
        </Text>
        <Text as='div' size='lg' className='mt-2'>
          <Trans
            t={t}
            i18nKey='contact.description'
            values={{ email: CONTACT_EMAIL, twitterHandle: TWITTER_USERNAME }}
            components={{
              mail: (
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className='font-medium underline decoration-dashed hover:decoration-solid'
                />
              ),
              twitter: (
                <a
                  href={TWITTER_URL}
                  className='font-medium underline decoration-dashed hover:decoration-solid'
                />
              ),
              discord: (
                <a
                  href={DISCORD_URL}
                  className='font-medium underline decoration-dashed hover:decoration-solid'
                />
              ),
            }}
          />
        </Text>
        <div className='mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:col-span-2 lg:gap-8'>
          <Panel
            href={DOCS_URL}
            title={t('contact.docs.title')}
            description={t('contact.docs.desc')}
          />
          <Panel
            href={BOOK_A_CALL_URL}
            title={t('contact.demo.title')}
            description={t('contact.demo.desc')}
          />
        </div>
      </div>
    </div>
  )
}

export default Contact
