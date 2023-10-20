import React, { Fragment, memo } from 'react'
import cx from 'clsx'
import PropTypes from 'prop-types'
import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid'
import _map from 'lodash/map'

interface ISelect {
  title?: string,
  label: string,
  className?: string,
  buttonClassName?: string,
  capitalise?: boolean,
  items: any[],
  id?: string,
  labelExtractor?: (item: any, index: number) => string,
  keyExtractor?: (item: any, index: number) => string,
  iconExtractor?: (item: any, index: number) => JSX.Element | null,
  onSelect: (item: any) => void,
}

const Select = ({
  title, label, className, items, labelExtractor, keyExtractor, iconExtractor, onSelect, id, buttonClassName, capitalise,
}: ISelect): JSX.Element => (
  // @ts-ignore
  <Listbox id={id || ''} value={title} onChange={onSelect}>
    {({ open }) => (
      <>
        <Listbox.Label className='block text-sm whitespace-pre-line font-medium text-gray-700 dark:text-gray-100'>{label}</Listbox.Label>
        <div className={cx('mt-1 relative', className)}>
          <Listbox.Button
            className={cx('relative w-full bg-white border border-gray-300 dark:text-gray-50 dark:border-gray-800 dark:bg-slate-800 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm', buttonClassName)}
          >
            <span
              className={cx('block truncate', {
                'first-letter:capitalize': capitalise,
              })}
            >
                {title}
              </span>
            <span className='absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none'>
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
              className='absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm'
            >
              {_map(items, (item, index) => (
                <Listbox.Option
                  key={keyExtractor ? keyExtractor(item, index) : item}
                  className={({ active }) => cx('dark:text-white cursor-default select-none relative py-2 pl-8 pr-4', {
                    'text-white bg-indigo-600': active,
                    'text-gray-900': !active,
                  })}
                  value={labelExtractor ? labelExtractor(item, index) : item}
                >
                  {({ selected, active }) => (
                    <>
                      <span
                        className={cx('block truncate', {
                          'font-semibold': selected,
                          'font-normal': !selected,
                          'first-letter:capitalize': capitalise,
                        })}
                      >
                        {labelExtractor ? labelExtractor(item, index) : item}
                      </span>

                      {iconExtractor && (
                        <span
                          className={cx('absolute inset-y-0 left-0 flex items-center pl-1.5')}
                        >
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

Select.propTypes = {
  title: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
  items: PropTypes.arrayOf(PropTypes.oneOfType([
    PropTypes.string, PropTypes.object,
  ])),
  className: PropTypes.string,
  buttonClassName: PropTypes.string,
  capitalise: PropTypes.bool,
  labelExtractor: PropTypes.func,
  iconExtractor: PropTypes.func,
  keyExtractor: PropTypes.func,
  label: PropTypes.string,
}

Select.defaultProps = {
  className: '',
  buttonClassName: '',
  capitalise: false,
  labelExtractor: null,
  keyExtractor: null,
  iconExtractor: null,
  label: '',
  items: [],
  id: '',
}

export default memo(Select)
