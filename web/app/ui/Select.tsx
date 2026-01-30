import {
  Listbox,
  Transition,
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
  // Optional className to customise the top field label (not the option labels)
  fieldLabelClassName?: string
  labelClassName?: string
  buttonClassName?: string
  hintClassName?: string
  capitalise?: boolean
  items: T[]
  id?: string
  labelExtractor?: (item: T, index: number) => React.ReactNode
  keyExtractor?: (item: T, index: number) => string
  iconExtractor?: (item: T, index: number) => React.ReactNode | null
  onSelect: (item: T) => void
  // The currently selected item - used for comparison to show checkmark
  selectedItem?: T
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
  fieldLabelClassName,
  selectedItem,
  hintClassName,
}: SelectProps<T>) {
  const isItemSelected = (item: T): boolean => {
    if (!selectedItem) return false

    if (keyExtractor) {
      return keyExtractor(item, 0) === keyExtractor(selectedItem, 0)
    }

    return item === selectedItem
  }

  return (
    <Listbox as='div' id={id || ''} value={selectedItem} onChange={onSelect}>
      {({ open }) => (
        <>
          {label ? (
            <Label
              className={cx(
                'mb-1 block text-sm font-medium whitespace-pre-line text-gray-700 dark:text-gray-100',
                fieldLabelClassName,
              )}
            >
              {label}
            </Label>
          ) : null}
          <div className={cx('relative', className)}>
            <ListboxButton
              className={cx(
                'relative w-full rounded-md border-0 bg-white py-2 pr-10 pl-3 text-left font-medium ring-1 ring-gray-300 transition-colors ring-inset hover:bg-gray-50 focus:ring-2 focus:ring-slate-900 focus:outline-hidden sm:text-sm dark:bg-slate-900 dark:text-gray-50 dark:ring-slate-700/80 dark:hover:bg-slate-800 dark:focus:ring-slate-300',
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
                <ChevronUpDownIcon
                  className='h-5 w-5 text-gray-400'
                  aria-hidden='true'
                />
              </span>
            </ListboxButton>

            <Transition
              show={open}
              as={Fragment}
              enter='transition ease-in duration-100'
              enterFrom='opacity-0'
              enterTo='opacity-100'
              leave='transition ease-in duration-100'
              leaveFrom='opacity-100'
              leaveTo='opacity-0'
            >
              <ListboxOptions
                static
                modal={false}
                className='absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base ring-1 ring-black/10 focus:outline-hidden sm:text-sm dark:bg-slate-900 dark:ring-slate-700/80'
              >
                {_map(items, (item, index) => {
                  const selected = isItemSelected(item)
                  return (
                    <ListboxOption
                      key={
                        keyExtractor ? keyExtractor(item, index) : (item as Key)
                      }
                      className={({ focus }) =>
                        cx(
                          'relative mx-1 cursor-pointer rounded-md py-2 pr-4 pl-8 transition-colors select-none',
                          {
                            'bg-gray-100 dark:bg-slate-800/80':
                              focus && !selected,
                            'bg-gray-200 dark:bg-slate-800/80': selected,
                            'text-gray-700 dark:text-gray-50':
                              !focus && !selected,
                            'text-gray-900 dark:text-white': focus || selected,
                          },
                        )
                      }
                      value={item}
                    >
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
                          {labelExtractor
                            ? labelExtractor(item, index)
                            : (item as React.ReactNode)}
                        </span>

                        {iconExtractor ? (
                          <span
                            className={cx(
                              'absolute inset-y-0 left-0 flex items-center pl-1.5',
                            )}
                          >
                            {iconExtractor(item, index)}
                          </span>
                        ) : null}

                        {selected && !iconExtractor ? (
                          <span
                            className={cx(
                              'absolute inset-y-0 left-0 flex items-center pl-1.5 text-gray-600 dark:text-gray-300',
                            )}
                          >
                            <CheckIcon className='h-5 w-5' aria-hidden='true' />
                          </span>
                        ) : null}
                      </>
                    </ListboxOption>
                  )
                })}
              </ListboxOptions>
            </Transition>
          </div>
          {hint ? (
            <p
              className={cx(
                'mt-2 text-sm whitespace-pre-line text-gray-500 dark:text-gray-300',
                hintClassName,
              )}
            >
              {hint}
            </p>
          ) : null}
        </>
      )}
    </Listbox>
  )
}

export default memo(Select) as typeof Select
