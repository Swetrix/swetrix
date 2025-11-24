import _map from 'lodash/map'
import { ChevronDownIcon } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import sanitizeHtml from 'sanitize-html'

import { DOCS_URL, PLAN_LIMITS, TRIAL_DAYS, DISCORD_URL } from '~/lib/constants'
import { cn } from '~/utils/generic'
import routesPath from '~/utils/routes'

const FAQ = () => {
  const { t } = useTranslation('common')

  const onLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation()
  }

  const values = {
    lowestPlanEventsAmount: PLAN_LIMITS['100k'].monthlyUsageLimit.toLocaleString('en-US'),
    moderatePlanEventsAmount: PLAN_LIMITS['500k'].monthlyUsageLimit.toLocaleString('en-US'),
    freeTrialDays: TRIAL_DAYS,
  }
  const stripTags = (html: string) =>
    sanitizeHtml(html, {
      allowedTags: [],
      allowedAttributes: {},
    })
  const items = t('main.faq.items', { returnObjects: true }) as { q: string; a: string }[]
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((_, idx) => ({
      '@type': 'Question',
      name: t(`main.faq.items.${idx}.q`),
      acceptedAnswer: {
        '@type': 'Answer',
        text: stripTags(
          t(`main.faq.items.${idx}.a`, {
            ...values,
          }),
        ),
      },
    })),
  }

  return (
    <section className='relative mx-auto max-w-5xl px-2 py-14 lg:px-8'>
      <h2 className='text-center text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-white'>
        {t('main.faq.title')}
      </h2>
      <div className='mt-8 flex flex-col'>
        {_map(items, (item: { q: string; a: string }, idx: number) => {
          const showTopBorder = idx !== 0

          return (
            <details
              key={item.q}
              className={cn('group w-full text-left', showTopBorder && 'border-t border-gray-200 dark:border-white/10')}
            >
              <summary className='flex w-full cursor-pointer items-center justify-between px-4 py-4'>
                <span className='text-base font-medium text-slate-900 group-hover:underline dark:text-white'>
                  <Trans t={t} i18nKey={`main.faq.items.${idx}.q`} />
                </span>
                <ChevronDownIcon className='size-4 text-slate-900 transition-transform group-open:rotate-180 dark:text-gray-200' />
              </summary>
              <div className='px-4'>
                <p className='pb-4 text-sm whitespace-pre-line text-slate-900 dark:text-gray-100'>
                  <Trans
                    t={t}
                    i18nKey={`main.faq.items.${idx}.a`}
                    values={values}
                    components={{
                      dataPolicyUrl: (
                        <Link
                          to={routesPath.dataPolicy}
                          className='underline decoration-dashed hover:decoration-solid'
                          aria-label='Data policy'
                          onClick={onLinkClick}
                        />
                      ),
                      apiDocumentationUrl: (
                        <a
                          href={DOCS_URL}
                          className='underline decoration-dashed hover:decoration-solid'
                          target='_blank'
                          rel='noopener noreferrer'
                          aria-label='API documentation (opens in a new tab)'
                          onClick={onLinkClick}
                        />
                      ),
                      contactUsUrl: (
                        <Link
                          to={routesPath.contact}
                          className='underline decoration-dashed hover:decoration-solid'
                          aria-label='Contact us'
                          onClick={onLinkClick}
                        />
                      ),
                      discordUrl: (
                        <a
                          href={DISCORD_URL}
                          className='underline decoration-dashed hover:decoration-solid'
                          target='_blank'
                          rel='noopener noreferrer'
                          aria-label='Discord (opens in a new tab)'
                          onClick={onLinkClick}
                        />
                      ),
                    }}
                  />
                </p>
              </div>
            </details>
          )
        })}
      </div>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
            .replace(/</g, '\\u003c')
            .replace(/\u2028|\u2029/g, ''),
        }}
      />
    </section>
  )
}

export default FAQ
