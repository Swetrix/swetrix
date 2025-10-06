import { SquareArrowOutUpRightIcon } from 'lucide-react'
import { useTranslation, Trans } from 'react-i18next'

import { CONTACT_EMAIL, TWITTER_URL, TWITTER_USERNAME, DISCORD_URL, DOCS_URL, BOOK_A_CALL_URL } from '~/lib/constants'

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
    className='relative block rounded-2xl border border-gray-300/80 bg-gray-100 p-10 transition-colors hover:bg-gray-200 dark:border-slate-900/80 dark:bg-slate-800/80 dark:hover:bg-slate-800'
  >
    <SquareArrowOutUpRightIcon
      className='absolute top-5 right-5 h-5 w-5 text-gray-900 dark:text-gray-100'
      strokeWidth={1.5}
    />
    <h3 className='text-lg leading-7 font-semibold text-gray-900 dark:text-gray-100'>{title}</h3>
    <p className='mt-3 text-sm leading-6 text-gray-600 dark:text-gray-200'>{description}</p>
  </a>
)

const Contact = () => {
  const { t } = useTranslation('common')

  return (
    <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
      <div className='mx-auto px-4 pt-12 pb-16 whitespace-pre-line sm:px-6 md:w-4/5 lg:px-8'>
        <h1 className='text-4xl font-bold text-gray-900 dark:text-gray-50'>{t('titles.contact')}</h1>
        <div className='mt-2 text-lg text-gray-900 dark:text-gray-50'>
          <Trans
            t={t}
            i18nKey='contact.description'
            values={{ email: CONTACT_EMAIL, twitterHandle: TWITTER_USERNAME }}
            components={{
              mail: (
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                />
              ),
              twitter: (
                <a href={TWITTER_URL} className='font-medium text-indigo-600 hover:underline dark:text-indigo-400' />
              ),
              discord: (
                <a href={DISCORD_URL} className='font-medium text-indigo-600 hover:underline dark:text-indigo-400' />
              ),
            }}
          />
        </div>
        <div className='mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:col-span-2 lg:gap-8'>
          <Panel href={DOCS_URL} title={t('contact.docs.title')} description={t('contact.docs.desc')} />
          <Panel href={BOOK_A_CALL_URL} title={t('contact.demo.title')} description={t('contact.demo.desc')} />
        </div>
      </div>
    </div>
  )
}

export default Contact
