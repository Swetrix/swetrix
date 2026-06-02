import { ArrowSquareOutIcon, ArrowRightIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'

import FeedbackModal from '~/components/FeedbackModal'
import {
  CONTACT_EMAIL,
  TWITTER_URL,
  TWITTER_USERNAME,
  DISCORD_URL,
  DOCS_URL,
  isSelfhosted,
} from '~/lib/constants'
import { useAuth } from '~/providers/AuthProvider'
import { Link } from '~/ui/Link'
import { Text } from '~/ui/Text'
import routesPath from '~/utils/routes'

interface PanelProps {
  href: string
  title: string
  description: string
  /** Internal links stay on-site (localised <Link>); external ones open in a new tab. */
  internal?: boolean
}

const panelClassName =
  'relative block rounded-2xl border border-gray-300/80 bg-gray-100 p-10 transition-colors hover:bg-gray-200 dark:border-slate-900/80 dark:bg-slate-800/80 dark:hover:bg-slate-900'

const Panel = ({ href, title, description, internal }: PanelProps) => {
  const body = (
    <>
      <Text as='h3' size='lg' weight='semibold' className='leading-7'>
        {title}
      </Text>
      <Text as='p' size='sm' colour='secondary' className='mt-3 leading-6'>
        {description}
      </Text>
    </>
  )

  if (internal) {
    return (
      <Link to={href} className={panelClassName}>
        <ArrowRightIcon
          aria-hidden='true'
          className='absolute top-5 right-5 size-5 text-gray-900 dark:text-gray-100'
        />
        {body}
      </Link>
    )
  }

  return (
    <a
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      className={panelClassName}
    >
      <ArrowSquareOutIcon
        aria-hidden='true'
        className='absolute top-5 right-5 size-5 text-gray-900 dark:text-gray-100'
      />
      {body}
    </a>
  )
}

const Contact = () => {
  const { t } = useTranslation('common')
  const { isAuthenticated } = useAuth()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const showFeedback = isAuthenticated && !isSelfhosted

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
                  aria-label={t('ariaLabels.emailSupport')}
                  className='font-medium underline decoration-dashed hover:decoration-solid'
                />
              ),
              twitter: (
                <a
                  href={TWITTER_URL}
                  aria-label={t('ariaLabels.openSwetrixOnX')}
                  className='font-medium underline decoration-dashed hover:decoration-solid'
                />
              ),
              discord: (
                <a
                  href={DISCORD_URL}
                  aria-label={t('ariaLabels.openSwetrixDiscord')}
                  className='font-medium underline decoration-dashed hover:decoration-solid'
                />
              ),
            }}
          />
        </Text>
        {showFeedback ? (
          <Text as='p' size='lg' className='mt-4'>
            <Trans
              t={t}
              i18nKey='contact.feedback.desc'
              components={{
                feedback: (
                  <button
                    type='button'
                    aria-label={t('ariaLabels.openFeedbackForm')}
                    onClick={() => setFeedbackOpen(true)}
                    className='font-medium underline decoration-dashed hover:decoration-solid'
                  />
                ),
              }}
            />
          </Text>
        ) : null}
        <div className='mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:col-span-2 lg:gap-8'>
          <Panel
            href={DOCS_URL}
            title={t('contact.docs.title')}
            description={t('contact.docs.desc')}
          />
          <Panel
            internal
            href={routesPath.bookACall}
            title={t('contact.demo.title')}
            description={t('contact.demo.desc')}
          />
        </div>
      </div>
      {showFeedback ? (
        <FeedbackModal
          isOpened={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
        />
      ) : null}
    </div>
  )
}

export default Contact
