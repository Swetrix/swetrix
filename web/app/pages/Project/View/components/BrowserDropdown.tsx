import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline'
import _map from 'lodash/map'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import OutsideClickHandler from 'react-outside-click-handler'

const OPTIONS = [
  {
    label: 'project.mapping.br',
    value: 'br',
  },
  {
    label: 'project.mapping.brv',
    value: 'brv',
  },
] as const

interface BrowserDropdownProps {
  onSelect: (value: (typeof OPTIONS)[number]['value']) => void
  title: string
}

const BrowserDropdown = ({ onSelect, title }: BrowserDropdownProps) => {
  const { t } = useTranslation()
  const [show, setShow] = useState(false)

  const _onSelect = (value: (typeof OPTIONS)[number]['value']) => {
    onSelect(value)
    setShow(false)
  }

  return (
    <OutsideClickHandler onOutsideClick={() => setShow(false)}>
      <span className='cursor-pointer' onClick={() => setShow(!show)}>
        {title} {show ? <ChevronUpIcon className='inline size-4' /> : <ChevronDownIcon className='inline size-4' />}
      </span>
      {show ? (
        <div className='absolute top-12 left-5 z-10 mt-2 max-h-[200px] min-w-[250px] overflow-auto rounded-md border border-gray-200 bg-white text-gray-900 dark:border-slate-700/50 dark:bg-slate-900'>
          <div className='flex w-full flex-col p-2'>
            <p className='px-1 text-sm font-semibold text-gray-900 dark:text-gray-50'>{t('project.browserInfo')}</p>
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
            className='absolute top-2 right-2 h-5 w-5 cursor-pointer text-gray-900 dark:text-gray-50'
            onClick={() => setShow(!show)}
          />
        </div>
      ) : null}
    </OutsideClickHandler>
  )
}

export default BrowserDropdown
