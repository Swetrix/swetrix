import {
  Combobox as HeadlessCombobox,
  Transition,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
} from '@headlessui/react'
import { CheckIcon, CaretUpDownIcon } from '@phosphor-icons/react'
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
      <div className={cx('relative', className)}>
        <div className='relative w-full'>
          <ComboboxInput
            className={cx(
              'block w-full rounded-md border-0 bg-white py-2 pr-9 pl-3 text-left text-sm text-gray-900 ring-1 ring-gray-300 transition-[background-color,box-shadow] duration-150 ease-out ring-inset placeholder:text-gray-400 hover:ring-gray-400 focus:ring-2 focus:ring-slate-900 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-950 dark:text-gray-50 dark:ring-slate-700/80 dark:placeholder:text-gray-500 dark:hover:ring-slate-600 dark:focus:ring-slate-300',
              buttonClassName,
            )}
            // @ts-expect-error
            displayValue={(item) =>
              labelExtractor ? labelExtractor(item, 0) : item
            }
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
          />
          <ComboboxButton
            className='absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 dark:text-gray-500'
            aria-label='Toggle options'
          >
            <CaretUpDownIcon className='size-4' aria-hidden='true' />
          </ComboboxButton>
        </div>
        <Transition
          as={Fragment}
          enter='transition ease-out duration-150'
          enterFrom='opacity-0 -translate-y-0.5'
          enterTo='opacity-100 translate-y-0'
          leave='transition ease-in duration-100'
          leaveFrom='opacity-100 translate-y-0'
          leaveTo='opacity-0 -translate-y-0.5'
          afterLeave={() => setQuery('')}
        >
          <ComboboxOptions className='absolute z-30 mt-1.5 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-gray-200/80 focus:outline-hidden dark:bg-slate-950 dark:ring-slate-700/60'>
            {_isEmpty(filteredItems) && !_isEmpty(query) ? (
              <div className='relative px-3 py-2 text-gray-500 select-none dark:text-gray-400'>
                {t('common.nothingFound')}
              </div>
            ) : (
              _map(filteredItems, (item, index) => (
                <ComboboxOption
                  key={keyExtractor ? keyExtractor(item, index) : item}
                  className={({ active }) =>
                    cx(
                      'relative mx-1 cursor-pointer rounded-md py-2 pr-8 pl-3 transition-colors duration-100 ease-out select-none',
                      {
                        'bg-gray-100 text-gray-900 dark:bg-slate-800/80 dark:text-white':
                          active,
                        'text-gray-700 dark:text-gray-50': !active,
                      },
                    )
                  }
                  value={labelExtractor ? labelExtractor(item, index) : item}
                >
                  {({ selected }) => (
                    <>
                      <span
                        className={cx(
                          'block truncate',
                          selected ? 'font-semibold' : 'font-normal',
                        )}
                      >
                        {labelExtractor ? labelExtractor(item, index) : item}
                      </span>
                      {selected ? (
                        <span className='absolute inset-y-0 right-2 flex items-center text-slate-900 dark:text-slate-100'>
                          <CheckIcon
                            weight='bold'
                            className='size-4'
                            aria-hidden='true'
                          />
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
