import {
  Combobox as HeadlessCombobox,
  Transition,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
} from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid'
import cx from 'clsx'
import _filter from 'lodash/filter'
import _includes from 'lodash/includes'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _toLower from 'lodash/toLower'
import { Fragment, memo, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface SelectProps {
  title?: string
  className?: string
  buttonClassName?: string
  items: any[]
  labelExtractor?: (item: any, index: number) => string
  keyExtractor?: (item: any, index: number) => string
  onSelect: (item: any) => void
  disabled?: boolean
  placeholder?: string
}

const Combobox = ({
  title,
  className,
  items,
  labelExtractor,
  keyExtractor,
  onSelect,
  buttonClassName,
  placeholder,
  disabled,
}: SelectProps) => {
  const { t } = useTranslation('common')
  const [query, setQuery] = useState('')

  const filteredItems = _isEmpty(items)
    ? items
    : _filter(items, (item, index) => {
        const label = labelExtractor ? labelExtractor(item, index) : item

        return _includes(_toLower(label), _toLower(query))
      })

  return (
    <HeadlessCombobox disabled={disabled} value={title} onChange={onSelect}>
      <div className={cx('relative mt-1', className)}>
        <div className='relative w-full cursor-default rounded-lg'>
          <ComboboxInput
            className={cx(
              'relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pr-10 pl-3 text-left focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden sm:text-sm dark:border-gray-800 dark:bg-slate-800 dark:text-gray-50',
              buttonClassName,
            )}
            // @ts-expect-error
            displayValue={(item) => (labelExtractor ? labelExtractor(item, 0) : item)}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
          />
          <ComboboxButton className='absolute inset-y-0 right-0 flex items-center pr-2'>
            <ChevronUpDownIcon className='h-5 w-5 text-gray-400' aria-hidden='true' />
          </ComboboxButton>
        </div>
        <Transition
          as={Fragment}
          leave='transition ease-in duration-100'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
          afterLeave={() => setQuery('')}
        >
          <ComboboxOptions className='absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base ring-1 ring-black/10 focus:outline-hidden sm:text-sm dark:bg-slate-800'>
            {_isEmpty(filteredItems) && !_isEmpty(query) ? (
              <div className='relative cursor-default px-4 py-2 text-gray-900 select-none dark:text-white'>
                {t('common.nothingFound')}
              </div>
            ) : (
              _map(filteredItems, (item, index) => (
                <ComboboxOption
                  key={keyExtractor ? keyExtractor(item, index) : item}
                  className={({ active }) =>
                    cx('relative cursor-default py-2 pr-4 pl-8 select-none dark:text-white', {
                      'bg-indigo-600 text-white': active,
                      'text-gray-900': !active,
                    })
                  }
                  value={labelExtractor ? labelExtractor(item, index) : item}
                >
                  {({ selected, active }) => (
                    <>
                      <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                        {labelExtractor ? labelExtractor(item, index) : item}
                      </span>
                      {selected ? (
                        <span
                          className={cx('absolute inset-y-0 left-0 flex items-center pl-1.5', {
                            'text-white': active,
                            'text-indigo-600': !active,
                          })}
                        >
                          <CheckIcon className='h-5 w-5' aria-hidden='true' />
                        </span>
                      ) : null}
                    </>
                  )}
                </ComboboxOption>
              ))
            )}
          </ComboboxOptions>
        </Transition>
      </div>
    </HeadlessCombobox>
  )
}

export default memo(Combobox)
