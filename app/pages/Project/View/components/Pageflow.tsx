import React from 'react'
import { NewspaperIcon, CursorArrowRaysIcon } from '@heroicons/react/24/outline'
import _map from 'lodash/map'
import _toUpper from 'lodash/toUpper'
import { Trans, useTranslation } from 'react-i18next'

interface IPageflow {
  pages: {
    type: 'pageview' | 'event'
    value: string
    created: string
  }[]
}

export const Pageflow = ({ pages }: IPageflow) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  return (
    <div className='flow-root'>
      <ul className='-mb-8'>
        {_map(pages, ({ value, created, type }, index) => {
          const displayCreated = new Date(created).toLocaleDateString(language, {
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: 'numeric',
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
                    <span className='h-8 w-8 rounded-full flex items-center justify-center bg-slate-400 dark:bg-slate-800'>
                      {type === 'pageview' && <NewspaperIcon className='h-5 w-5 text-white' aria-hidden='true' />}
                      {type === 'event' && <CursorArrowRaysIcon className='h-5 w-5 text-white' aria-hidden='true' />}
                    </span>
                  </div>
                  <div className='flex min-w-0 flex-1 justify-between space-x-4 pt-1.5'>
                    <div>
                      <p className='text-sm text-gray-700 dark:text-gray-300'>
                        <Trans
                          t={t}
                          i18nKey={type === 'pageview' ? 'project.pageviewX' : 'project.eventX'}
                          components={{
                            value: <span className='font-medium text-gray-900 dark:text-gray-50' />,
                          }}
                          values={{
                            x: value || _toUpper(t('project.redactedPage')),
                          }}
                        />
                      </p>
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
