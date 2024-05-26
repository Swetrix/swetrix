import React, { Fragment, memo } from 'react'
import cx from 'clsx'
import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid'
import _map from 'lodash/map'

interface ISelect {
  title?: string
  label?: string
  className?: string
  labelClassName?: string
  buttonClassName?: string
  capitalise?: boolean
  items: any[]
  id?: string
  labelExtractor?: (item: any, index: number) => string
  keyExtractor?: (item: any, index: number) => string
  iconExtractor?: (item: any, index: number) => JSX.Element | null
  onSelect: (item: any) => void
}

const Select = ({
  title,
  label,
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
}: ISelect): JSX.Element => (
  // @ts-ignore
  <Listbox id={id || ''} value={title} onChange={onSelect}>
    {({ open }) => (
      <>
        <Listbox.Label className='block whitespace-pre-line text-sm font-medium text-gray-700 dark:text-gray-100'>
          {label}
        </Listbox.Label>
        <div className={cx('relative mt-1', className)}>
          <Listbox.Button
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
          </Listbox.Button>

          <Transition
            show={open}
            as={Fragment}
            leave='transition ease-in duration-100'
            leaveFrom='opacity-100'
            leaveTo='opacity-0'
          >
            <Listbox.Options
              static
              className='absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-slate-800 sm:text-sm'
            >
              {_map(items, (item, index) => (
                <Listbox.Option
                  key={keyExtractor ? keyExtractor(item, index) : item}
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
                        {labelExtractor ? labelExtractor(item, index) : item}
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
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </>
    )}
  </Listbox>
)

export default memo(Select)
