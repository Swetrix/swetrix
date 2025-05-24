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
import cx from 'clsx'
import _map from 'lodash/map'
import React, { Fragment, Key, memo } from 'react'

interface SelectProps<T> {
  title?: string
  label?: string
  hint?: string | React.ReactNode
  className?: string
  labelClassName?: string
  buttonClassName?: string
  capitalise?: boolean
  items: T[]
  id?: string
  labelExtractor?: (item: T, index: number) => React.ReactNode
  keyExtractor?: (item: T, index: number) => string
  iconExtractor?: (item: T, index: number) => React.ReactNode | null
  onSelect: (item: T) => void
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
}: SelectProps<T>) {
  return (
    // @ts-expect-error
    <Listbox id={id || ''} value={title} onChange={onSelect}>
      {({ open }) => (
        <>
          {label ? (
            <Label className='mb-1 block text-sm font-medium whitespace-pre-line text-gray-700 dark:text-gray-100'>
              {label}
            </Label>
          ) : null}
          <div className={cx('relative', className)}>
            <ListboxButton
              className={cx(
                'relative w-full rounded-md border border-gray-300 bg-white py-2 pr-10 pl-3 text-left font-medium hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-100 focus:outline-hidden sm:text-sm dark:border-gray-800 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700',
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
                className='absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-gray-50 py-1 text-base ring-1 ring-black/10 focus:outline-hidden sm:text-sm dark:bg-slate-800'
              >
                {_map(items, (item, index) => (
                  <ListboxOption
                    key={keyExtractor ? keyExtractor(item, index) : (item as Key)}
                    className={({ focus, selected }) =>
                      cx('relative mx-1 cursor-pointer rounded-md py-2 pr-4 pl-8 select-none', {
                        'bg-gray-200 dark:bg-slate-700': focus && !selected,
                        'bg-gray-300 dark:bg-slate-600': selected,
                        'text-gray-700 dark:text-gray-50': !focus && !selected,
                        'text-gray-900 dark:text-white': focus || selected,
                      })
                    }
                    value={item}
                  >
                    {({ selected }) => (
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

                        {iconExtractor ? (
                          <span className={cx('absolute inset-y-0 left-0 flex items-center pl-1.5')}>
                            {iconExtractor(item, index)}
                          </span>
                        ) : null}

                        {selected ? (
                          <span
                            className={cx(
                              'absolute inset-y-0 left-0 flex items-center pl-1.5 text-gray-600 dark:text-gray-300',
                            )}
                          >
                            <CheckIcon className='h-5 w-5' aria-hidden='true' />
                          </span>
                        ) : null}
                      </>
                    )}
                  </ListboxOption>
                ))}
              </ListboxOptions>
            </Transition>
          </div>
          {hint ? (
            <Description className='mt-2 text-sm whitespace-pre-line text-gray-500 dark:text-gray-300'>
              {hint}
            </Description>
          ) : null}
        </>
      )}
    </Listbox>
  )
}

export default memo(Select) as typeof Select
