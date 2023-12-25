import React, { Fragment, memo, useState } from 'react'
import cx from 'clsx'
import PropTypes from 'prop-types'
import { Combobox as HeadlessCombobox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid'
import { useTranslation } from 'react-i18next'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _filter from 'lodash/filter'
import _toLower from 'lodash/toLower'
import _includes from 'lodash/includes'

interface ISelect {
  title?: string
  className?: string
  buttonClassName?: string
  items: any[]
  labelExtractor?: (item: any, index: number) => string
  keyExtractor?: (item: any, index: number) => string
  onSelect: (item: any) => void
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
}: ISelect): JSX.Element => {
  const { t } = useTranslation('common')
  const [query, setQuery] = useState('')

  const filteredItems = _isEmpty(items)
    ? items
    : _filter(items, (item, index) => {
        const label = labelExtractor ? labelExtractor(item, index) : item

        return _includes(_toLower(label), _toLower(query))
      })

  return (
    <HeadlessCombobox value={title} onChange={onSelect}>
      <div className={cx('relative mt-1', className)}>
        <div className='relative w-full cursor-default rounded-lg'>
          <HeadlessCombobox.Input
            className={cx(
              'relative w-full bg-white border border-gray-300 dark:text-gray-50 dark:border-gray-800 dark:bg-slate-800 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm',
              buttonClassName,
            )}
            // @ts-ignore
            displayValue={(item) => (labelExtractor ? labelExtractor(item, 0) : item)}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
          />
          <HeadlessCombobox.Button className='absolute inset-y-0 right-0 flex items-center pr-2'>
            <ChevronUpDownIcon className='h-5 w-5 text-gray-400' aria-hidden='true' />
          </HeadlessCombobox.Button>
        </div>
        <Transition
          as={Fragment}
          leave='transition ease-in duration-100'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
          afterLeave={() => setQuery('')}
        >
          <HeadlessCombobox.Options className='absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm'>
            {_isEmpty(filteredItems) && !_isEmpty(query) ? (
              <div className='relative cursor-default select-none py-2 px-4 dark:text-white text-gray-900'>
                {t('common.nothingFound')}
              </div>
            ) : (
              _map(filteredItems, (item, index) => (
                <HeadlessCombobox.Option
                  key={keyExtractor ? keyExtractor(item, index) : item}
                  className={({ active }) =>
                    cx('dark:text-white cursor-default select-none relative py-2 pl-8 pr-4', {
                      'text-white bg-indigo-600': active,
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
                </HeadlessCombobox.Option>
              ))
            )}
          </HeadlessCombobox.Options>
        </Transition>
      </div>
    </HeadlessCombobox>
  )
}

Combobox.propTypes = {
  title: PropTypes.string,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  buttonClassName: PropTypes.string,
  items: PropTypes.array.isRequired,
  labelExtractor: PropTypes.func,
  keyExtractor: PropTypes.func,
  onSelect: PropTypes.func.isRequired,
}

Combobox.defaultProps = {
  title: '',
  placeholder: '',
  className: '',
  buttonClassName: '',
  labelExtractor: null,
  keyExtractor: null,
}

export default memo(Combobox)
