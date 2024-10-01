import React, { Fragment, Key, memo } from 'react'
import cx from 'clsx'
import {
  Listbox,
  Transition,
  Description,
  Label,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid'
import _map from 'lodash/map'

interface ISelect<T> {
  title?: string
  label?: string
  hint?: string | React.ReactNode
  className?: string
  labelClassName?: string
  buttonClassName?: string
  capitalise?: boolean
  items: T[]
  id?: string
  labelExtractor?: (item: T, index: number) => string
  keyExtractor?: (item: T, index: number) => string
  iconExtractor?: (item: T, index: number) => React.ReactNode | null
  onSelect: (item: string) => void
}

function Select<T>({
  title,
  label,
  hint,
  className,
  items = [],
  labelExtractor,
  keyExtractor,
  iconExtractor,
  onSelect,
  id,
  buttonClassName,
  capitalise,
  labelClassName,
}: ISelect<T>): React.ReactNode {
  return (
    // @ts-expect-error
    <Listbox id={id || ''} value={title} onChange={onSelect}>
      {({ open }) => (
        <>
          <Label className='block whitespace-pre-line text-sm font-medium text-gray-700 dark:text-gray-100'>
            {label}
          </Label>
          <div className={cx('relative mt-1', className)}>
            <ListboxButton
              className={cx(
                'relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-800 dark:bg-slate-800 dark:text-gray-50 sm:text-sm',
                buttonClassName,
              )}
            >
              <span
                className={cx('block truncate', {
                  'first-letter:capitalize': capitalise,
                })}
              >
                {title}
              </span>
              <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
                <ChevronUpDownIcon className='h-5 w-5 text-gray-400' aria-hidden='true' />
              </span>
            </ListboxButton>

            <Transition
              show={open}
              as={Fragment}
              leave='transition ease-in duration-100'
              leaveFrom='opacity-100'
              leaveTo='opacity-0'
            >
              <ListboxOptions
                static
                className='absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-slate-800 sm:text-sm'
              >
                {_map(items, (item, index) => (
                  <ListboxOption
                    key={keyExtractor ? keyExtractor(item, index) : (item as Key)}
                    className={({ active }) =>
                      cx('relative cursor-default select-none py-2 pl-8 pr-4 dark:text-white', {
                        'bg-indigo-600 text-white': active,
                        'text-gray-900': !active,
                      })
                    }
                    value={labelExtractor ? labelExtractor(item, index) : item}
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={cx(
                            'block truncate',
                            {
                              'font-semibold': selected,
                              'font-normal': !selected,
                              'first-letter:capitalize': capitalise,
                            },
                            labelClassName,
                          )}
                        >
                          {labelExtractor ? labelExtractor(item, index) : (item as React.ReactNode)}
                        </span>

                        {iconExtractor && (
                          <span className={cx('absolute inset-y-0 left-0 flex items-center pl-1.5')}>
                            {iconExtractor(item, index)}
                          </span>
                        )}

                        {selected && (
                          <span
                            className={cx('absolute inset-y-0 left-0 flex items-center pl-1.5', {
                              'text-white': active,
                              'text-indigo-600': !active,
                            })}
                          >
                            <CheckIcon className='h-5 w-5' aria-hidden='true' />
                          </span>
                        )}
                      </>
                    )}
                  </ListboxOption>
                ))}
              </ListboxOptions>
            </Transition>
          </div>
          {hint && (
            <Description className='mt-2 whitespace-pre-line text-sm text-gray-500 dark:text-gray-300'>
              {hint}
            </Description>
          )}
        </>
      )}
    </Listbox>
  )
}

export default memo(Select) as typeof Select
