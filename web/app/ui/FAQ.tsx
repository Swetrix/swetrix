import { CaretDownIcon } from '@phosphor-icons/react'
import _map from 'lodash/map'
import type { ReactNode } from 'react'

import { cn } from '~/utils/generic'

interface FAQItem {
  question: string | ReactNode
  answer: string | ReactNode
}

interface FAQProps {
  items: FAQItem[]
  className?: string
  /**
   * If true, will inject JSON-LD structured data.
   * Only works optimally if question and answer are strings.
   */
  withStructuredData?: boolean
  /**
   * Whether to add horizontal padding to the items.
   */
  withPadding?: boolean
}

export function FAQ({
  items,
  className,
  withStructuredData = false,
  withPadding = false,
}: FAQProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      {_map(items, (item, idx) => {
        const showTopBorder = idx !== 0

        return (
          <details
            key={idx}
            className={cn(
              'group w-full text-left',
              showTopBorder && 'border-t border-gray-200 dark:border-white/10',
            )}
          >
            <summary
              className={cn(
                'flex w-full cursor-pointer list-none items-center justify-between gap-x-4 py-4 transition-colors',
                'focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden dark:focus-visible:ring-slate-300',
                withPadding && 'px-4',
              )}
            >
              <span className='text-base font-medium text-slate-900 transition-colors group-hover:text-slate-700 dark:text-white dark:group-hover:text-slate-200'>
                {item.question}
              </span>
              <CaretDownIcon
                className='size-4 shrink-0 text-slate-500 transition-transform duration-200 ease-out group-open:rotate-180 dark:text-slate-400'
                aria-hidden='true'
              />
            </summary>
            <div
              className={cn(
                'pb-4 text-sm whitespace-pre-line text-slate-700 dark:text-gray-300',
                withPadding && 'px-4',
              )}
            >
              {typeof item.answer === 'string' ? (
                <p>{item.answer}</p>
              ) : (
                item.answer
              )}
            </div>
          </details>
        )
      })}

      {withStructuredData && (
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: items.map((item) => ({
                '@type': 'Question',
                name: typeof item.question === 'string' ? item.question : '',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: typeof item.answer === 'string' ? item.answer : '',
                },
              })),
            })
              .replace(/</g, '\\u003c')
              .replace(/\u2028|\u2029/g, ''),
          }}
        />
      )}
    </div>
  )
}
