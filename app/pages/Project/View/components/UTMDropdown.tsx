import React, { useState } from 'react'
import _map from 'lodash/map'
import { useTranslation } from 'react-i18next'
// @ts-ignore
import OutsideClickHandler from 'react-outside-click-handler'
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface IUTMDropdown {
  onSelect: any
  title: string
}

const OPTIONS = [
  {
    label: 'project.mapping.so',
    value: 'so',
  },
  {
    label: 'project.mapping.me',
    value: 'me',
  },
  {
    label: 'project.mapping.ca',
    value: 'ca',
  },
]

const UTMDropdown = ({ onSelect, title }: IUTMDropdown): JSX.Element => {
  const { t } = useTranslation()
  const [show, setShow] = useState<boolean>(false)

  const _onSelect = (value: string) => {
    onSelect(value)
    setShow(false)
  }

  return (
    <OutsideClickHandler onOutsideClick={() => setShow(false)}>
      <span className='cursor-pointer' onClick={() => setShow(!show)}>
        {title} {show ? <ChevronUpIcon className='inline h-4 w-4' /> : <ChevronDownIcon className='inline h-4 w-4' />}
      </span>
      {show && (
        <div className='top-15 absolute left-5 z-10 mt-2 max-h-[200px] min-w-[250px] overflow-auto rounded-md border border-gray-200 bg-white text-gray-900 shadow-lg dark:border-slate-700/50 dark:bg-slate-900'>
          <div className='flex w-full flex-col p-2'>
            <p className='px-1 text-sm font-semibold text-gray-900 dark:text-gray-50'>{t('project.campaigns')}</p>
            {_map(OPTIONS, ({ label, value }) => (
              <div
                key={label}
                onClick={() => _onSelect(value)}
                className='flex w-full cursor-pointer flex-row items-center justify-between px-1 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800'
              >
                <p>{t(label)}</p>
              </div>
            ))}
          </div>
          <XMarkIcon
            className='absolute right-2 top-2 h-5 w-5 cursor-pointer text-gray-900 dark:text-gray-50'
            onClick={() => setShow(!show)}
          />
        </div>
      )}
    </OutsideClickHandler>
  )
}

export default UTMDropdown
