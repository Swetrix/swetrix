import { Listbox, Transition, ListboxButton, ListboxOptions, ListboxOption, Label } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid'
import { useVirtualizer } from '@tanstack/react-virtual'
import cx from 'clsx'
import _filter from 'lodash/filter'
import _includes from 'lodash/includes'
import _isEmpty from 'lodash/isEmpty'
import _toLower from 'lodash/toLower'
import { Fragment, memo, useState, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

interface VirtualizedSelectProps<T> {
  title?: string
  label?: string
  className?: string
  buttonClassName?: string
  items: T[]
  labelExtractor?: (item: T, index: number) => string
  keyExtractor?: (item: T, index: number) => string
  onSelect: (item: T) => void
  selectedItems?: T[]
  placeholder?: string
  disabled?: boolean
  searchable?: boolean
  allowCustomValue?: boolean
  onCustomValue?: (value: string) => void
}

const ITEM_HEIGHT = 36

function VirtualizedSelect<T>({
  title,
  label,
  className,
  items = [],
  labelExtractor,
  keyExtractor,
  onSelect,
  buttonClassName,
  placeholder,
  disabled,
  selectedItems = [],
  searchable = true,
  allowCustomValue = false,
  onCustomValue,
}: VirtualizedSelectProps<T>) {
  const { t } = useTranslation('common')
  const [query, setQuery] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const filteredItems = useMemo(() => {
    if (_isEmpty(query) || _isEmpty(items)) {
      return items
    }
    return _filter(items, (item, index) => {
      const labelValue = labelExtractor ? labelExtractor(item, index) : String(item)
      return _includes(_toLower(labelValue), _toLower(query))
    })
  }, [items, query, labelExtractor])

  const virtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 10,
  })

  const isItemSelected = (item: T): boolean => {
    if (_isEmpty(selectedItems)) return false
    return selectedItems.some((selected) => {
      if (keyExtractor) {
        return keyExtractor(item, 0) === keyExtractor(selected, 0)
      }
      return item === selected
    })
  }

  const handleAddCustomValue = () => {
    if (query.trim() && allowCustomValue && onCustomValue) {
      onCustomValue(query.trim())
      setQuery('')
    }
  }

  return (
    <Listbox as='div' value={undefined} onChange={onSelect} disabled={disabled}>
      {({ open }) => (
        <>
          {label ? (
            <Label className='mb-1 block text-sm font-medium text-gray-700 dark:text-gray-100'>{label}</Label>
          ) : null}
          <div className={cx('relative', className)}>
            <ListboxButton
              className={cx(
                'relative w-full rounded-md border border-gray-300 bg-white py-2 pr-10 pl-3 text-left font-medium transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-100 focus:outline-hidden sm:text-sm dark:border-gray-800 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700',
                buttonClassName,
              )}
            >
              <span className='block truncate text-gray-500 dark:text-gray-400'>{title || placeholder}</span>
              <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
                <ChevronUpDownIcon className='h-5 w-5 text-gray-400' aria-hidden='true' />
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
              afterLeave={() => setQuery('')}
            >
              <ListboxOptions
                static
                className='absolute z-30 mt-1 w-full rounded-md bg-gray-50 text-base ring-1 ring-black/10 focus:outline-hidden sm:text-sm dark:bg-slate-800'
              >
                {searchable ? (
                  <div className='sticky top-0 z-10 border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-slate-800'>
                    <input
                      type='text'
                      className='w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:border-gray-700 dark:bg-slate-700 dark:text-gray-50'
                      placeholder={t('common.search') || 'Search...'}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && allowCustomValue && query.trim()) {
                          e.preventDefault()
                          handleAddCustomValue()
                        }
                        e.stopPropagation()
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {allowCustomValue && query.trim() ? (
                      <button
                        type='button'
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleAddCustomValue()
                        }}
                        className='mt-2 w-full rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700'
                      >
                        {t('project.filterAddCustomValue', { value: query.trim() })}
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {_isEmpty(filteredItems) ? (
                  <div className='relative cursor-default px-4 py-3 text-gray-600 select-none dark:text-gray-400'>
                    {t('common.nothingFound')}
                  </div>
                ) : (
                  <div ref={listRef} className='max-h-60 overflow-auto py-1'>
                    <div
                      style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                      }}
                    >
                      {virtualizer.getVirtualItems().map((virtualItem) => {
                        const item = filteredItems[virtualItem.index]
                        const labelValue = labelExtractor ? labelExtractor(item, virtualItem.index) : String(item)
                        const keyValue = keyExtractor ? keyExtractor(item, virtualItem.index) : String(item)
                        const selected = isItemSelected(item)

                        return (
                          <ListboxOption
                            key={keyValue}
                            value={item}
                            className={({ focus }) =>
                              cx(
                                'absolute right-0 left-0 mx-1 cursor-pointer rounded-md py-2 pr-4 pl-8 transition-colors select-none',
                                {
                                  'bg-gray-200 dark:bg-slate-700': focus && !selected,
                                  'bg-indigo-100 dark:bg-indigo-900/40': selected,
                                  'text-gray-700 dark:text-gray-50': !focus && !selected,
                                  'text-gray-900 dark:text-white': focus || selected,
                                },
                              )
                            }
                            style={{
                              top: 0,
                              transform: `translateY(${virtualItem.start}px)`,
                              height: `${virtualItem.size}px`,
                            }}
                          >
                            <>
                              <span
                                className={cx('block truncate', {
                                  'font-semibold': selected,
                                  'font-normal': !selected,
                                })}
                              >
                                {labelValue}
                              </span>
                              {selected ? (
                                <span className='absolute inset-y-0 left-0 flex items-center pl-1.5 text-indigo-600 dark:text-indigo-400'>
                                  <CheckIcon className='h-5 w-5' aria-hidden='true' />
                                </span>
                              ) : null}
                            </>
                          </ListboxOption>
                        )
                      })}
                    </div>
                  </div>
                )}
              </ListboxOptions>
            </Transition>
          </div>
        </>
      )}
    </Listbox>
  )
}

export default memo(VirtualizedSelect) as typeof VirtualizedSelect
