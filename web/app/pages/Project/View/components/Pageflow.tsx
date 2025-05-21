import clsx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _toUpper from 'lodash/toUpper'
import { BugIcon, FileTextIcon, MousePointerClickIcon } from 'lucide-react'
import React from 'react'
import { Trans, useTranslation } from 'react-i18next'

interface Metadata {
  key: string
  value: string
}

interface PageflowProps {
  pages: {
    type: 'pageview' | 'event' | 'error'
    value: string
    created: string
    metadata?: Metadata[]
  }[]
  timeFormat: '12-hour' | '24-hour'
  zoomedTimeRange?: [Date, Date] | null
}

const KeyValue = ({ evKey, evValue }: { evKey: string; evValue: string }) => (
  <li className='text-[11px] wrap-anywhere'>
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

export const Pageflow = ({ pages, timeFormat, zoomedTimeRange }: PageflowProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  const filteredPages = zoomedTimeRange
    ? pages.filter((page) => {
        const pageTime = new Date(page.created).getTime()
        return pageTime >= zoomedTimeRange[0].getTime() && pageTime <= zoomedTimeRange[1].getTime()
      })
    : pages

  if (zoomedTimeRange && _isEmpty(filteredPages)) {
    return (
      <div className='my-4 py-8 text-center font-mono text-gray-800 dark:text-gray-300'>
        {t('project.noEventsForSelectedPeriod')}
      </div>
    )
  }

  return (
    <div className='flow-root font-mono'>
      <ul className='-mb-8'>
        {_map(filteredPages, ({ value, created, type, metadata }, index) => {
          const displayCreated = new Date(created).toLocaleDateString(language, {
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hourCycle: timeFormat === '12-hour' ? 'h12' : 'h23',
          })

          return (
            <li key={`${value}${created}${index}`}>
              <div className='relative pb-8'>
                {index !== filteredPages.length - 1 ? (
                  <span
                    className='absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200 dark:bg-slate-700'
                    aria-hidden='true'
                  />
                ) : null}
                <div className='relative flex space-x-3'>
                  <div>
                    <span
                      className={clsx('flex h-8 w-8 items-center justify-center rounded-full', {
                        'bg-slate-400 dark:bg-slate-800': type !== 'error',
                        'bg-red-400 dark:bg-red-800': type === 'error',
                      })}
                    >
                      {type === 'pageview' ? (
                        <FileTextIcon className='h-5 w-5 text-white' aria-hidden='true' strokeWidth={1.5} />
                      ) : null}
                      {type === 'event' ? (
                        <MousePointerClickIcon className='h-5 w-5 text-white' aria-hidden='true' strokeWidth={1.5} />
                      ) : null}
                      {type === 'error' ? (
                        <BugIcon className='h-5 w-5 text-white' aria-hidden='true' strokeWidth={1.5} />
                      ) : null}
                    </span>
                  </div>
                  <div className='flex min-w-0 flex-1 justify-between space-x-4 pt-1.5'>
                    <div className='flex text-sm text-gray-700 dark:text-gray-300'>
                      <Trans
                        t={t}
                        i18nKey={
                          type === 'pageview'
                            ? 'project.pageviewX'
                            : type === 'event'
                              ? 'project.eventX'
                              : 'project.errorX'
                        }
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
                    <div className='text-right text-sm whitespace-nowrap text-gray-700 dark:text-gray-300'>
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
