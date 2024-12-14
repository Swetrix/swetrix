import React from 'react'
import { CursorArrowRaysIcon } from '@heroicons/react/24/outline'
import _map from 'lodash/map'
import _toUpper from 'lodash/toUpper'
import { Trans, useTranslation } from 'react-i18next'
import { FileTextIcon } from 'lucide-react'

interface Metadata {
  key: string
  value: string
}

interface PageflowProps {
  pages: {
    type: 'pageview' | 'event'
    value: string
    created: string
    metadata?: Metadata[]
  }[]
  timeFormat: '12-hour' | '24-hour'
}

const KeyValue = ({ evKey, evValue }: { evKey: string; evValue: string }) => (
  <li className='text-xs'>
    {evKey}: {evValue}
  </li>
)

const TransValue = ({ metadata, children }: { metadata?: Metadata[]; children: React.ReactNode }) => (
  <div className='ml-1 text-gray-900 dark:text-gray-50'>
    <p className='font-medium'>{children}</p>
    {metadata ? (
      <ul className='mt-1'>
        {_map(metadata, ({ key, value }, index) => (
          <KeyValue key={`${key}${value}${index}`} evKey={key} evValue={value} />
        ))}
      </ul>
    ) : null}
  </div>
)

export const Pageflow = ({ pages, timeFormat }: PageflowProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  return (
    <div className='flow-root'>
      <ul className='-mb-8'>
        {_map(pages, ({ value, created, type, metadata }, index) => {
          const displayCreated = new Date(created).toLocaleDateString(language, {
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: 'numeric',
            hourCycle: timeFormat === '12-hour' ? 'h12' : 'h23',
          })

          return (
            <li key={`${value}${created}${index}`}>
              <div className='relative pb-8'>
                {index !== pages.length - 1 ? (
                  <span
                    className='absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200 dark:bg-slate-700'
                    aria-hidden='true'
                  />
                ) : null}
                <div className='relative flex space-x-3'>
                  <div>
                    <span className='flex h-8 w-8 items-center justify-center rounded-full bg-slate-400 dark:bg-slate-800'>
                      {type === 'pageview' && (
                        <FileTextIcon className='h-5 w-5 text-white' aria-hidden='true' strokeWidth={1.5} />
                      )}
                      {type === 'event' && <CursorArrowRaysIcon className='h-5 w-5 text-white' aria-hidden='true' />}
                    </span>
                  </div>
                  <div className='flex min-w-0 flex-1 justify-between space-x-4 pt-1.5'>
                    <div className='flex text-sm text-gray-700 dark:text-gray-300'>
                      <Trans
                        t={t}
                        i18nKey={type === 'pageview' ? 'project.pageviewX' : 'project.eventX'}
                        components={{
                          // @ts-expect-error Children is provided by Trans
                          value: <TransValue metadata={metadata} />,
                          span: <span />,
                        }}
                        values={{
                          x: value || _toUpper(t('project.redactedPage')),
                        }}
                      />
                    </div>
                    <div className='whitespace-nowrap text-right text-sm text-gray-700 dark:text-gray-300'>
                      <time dateTime={created}>{displayCreated}</time>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
