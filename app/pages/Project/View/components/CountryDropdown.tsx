import React, { useState } from 'react'
import _map from 'lodash/map'
import { useTranslation } from 'react-i18next'
// @ts-ignore
import OutsideClickHandler from 'react-outside-click-handler'
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface ICountryDropdown {
  onSelect: any
  title: string
}

const OPTIONS = [
  {
    label: 'project.mapping.cc',
    value: 'cc',
  },
  {
    label: 'project.mapping.rg',
    value: 'rg',
  },
  {
    label: 'project.mapping.ct',
    value: 'ct',
  },
]

const CountryDropdown = ({ onSelect, title }: ICountryDropdown): JSX.Element => {
  const { t } = useTranslation()
  const [show, setShow] = useState<boolean>(false)

  const _onSelect = (value: string) => {
    onSelect(value)
    setShow(false)
  }

  return (
    <OutsideClickHandler onOutsideClick={() => setShow(false)}>
      <span className='cursor-pointer' onClick={() => setShow(!show)}>
        {title} {show ? <ChevronUpIcon className='inline w-4 h-4' /> : <ChevronDownIcon className='inline w-4 h-4' />}
      </span>
      {show && (
        <div className='absolute z-10 mt-2 left-5 top-15 text-gray-900 bg-white border border-gray-200 rounded-md shadow-lg dark:bg-slate-900 dark:border-slate-700/50 min-w-[250px] max-h-[200px] overflow-auto'>
          <div className='flex flex-col w-full p-2'>
            <p className='text-sm font-semibold text-gray-900 dark:text-gray-50 px-1'>{t('project.geo')}</p>
            {_map(OPTIONS, ({ label, value }) => (
              <div
                key={label}
                onClick={() => _onSelect(value)}
                className='flex flex-row items-center justify-between cursor-pointer w-full px-1 py-2 text-sm text-gray-700 dark:text-gray-200 dark:bg-slate-900 hover:bg-gray-200 dark:hover:bg-slate-800'
              >
                <p>{t(label)}</p>
              </div>
            ))}
          </div>
          <XMarkIcon
            className='absolute top-2 right-2 w-5 h-5 text-gray-900 cursor-pointer dark:text-gray-50'
            onClick={() => setShow(!show)}
          />
        </div>
      )}
    </OutsideClickHandler>
  )
}

export default CountryDropdown
