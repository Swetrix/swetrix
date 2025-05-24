import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import cx from 'clsx'
import _includes from 'lodash/includes'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import { useState, useEffect, useRef } from 'react'

interface MultiSelectProps {
  className?: string
  onRemove: (item: any) => void
  onSelect: (item: any) => void
  items: any[]
  labelExtractor?: (item: any) => string
  keyExtractor?: (item: any) => string
  label: any[]
  hint?: string
  placholder?: string
  searchPlaseholder?: string
  onSearch?: (search: string) => void
  itemExtractor?: (item: any) => string
}

const MultiSelect = ({
  onRemove,
  onSelect,
  items,
  labelExtractor,
  keyExtractor,
  label,
  hint,
  placholder = 'Select...',
  className,
  itemExtractor,
  searchPlaseholder = 'Search...',
  onSearch,
}: MultiSelectProps) => {
  const [selected, setSelected] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSelected(false)
      }
    }

    if (selected) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [selected])

  return (
    <div ref={dropdownRef} className={cx('relative flex w-full flex-col items-center', className)}>
      <div className='w-full'>
        <div className='relative flex flex-col items-center'>
          <div
            className='w-full cursor-pointer'
            onClick={() => {
              setSelected(!selected)
            }}
          >
            <div className='relative w-full rounded-md border border-gray-300 bg-white py-2 pr-10 pl-3 text-left font-medium hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-100 focus:outline-hidden sm:text-sm dark:border-gray-800 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'>
              <div className='flex flex-auto flex-wrap gap-1'>
                {!_isEmpty(label) ? (
                  _map(label, (item) => (
                    <div
                      key={keyExtractor ? keyExtractor(item) : item}
                      className='inline-flex items-center gap-1 rounded-md bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-slate-600 dark:text-gray-50'
                    >
                      <div className='flex items-center gap-1 whitespace-nowrap'>
                        {labelExtractor ? labelExtractor(item) : item}
                      </div>
                      <button
                        type='button'
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onRemove(item)
                        }}
                        className='inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-indigo-400 hover:bg-indigo-200 hover:text-indigo-500 focus:bg-indigo-500 focus:text-white focus:outline-hidden dark:text-gray-300 dark:hover:bg-slate-500 dark:hover:text-gray-100'
                      >
                        <span className='sr-only'>Remove</span>
                        <svg className='h-2 w-2' stroke='currentColor' fill='none' viewBox='0 0 8 8'>
                          <path strokeLinecap='round' strokeWidth='1.5' d='m1 1 6 6m0-6-6 6' />
                        </svg>
                      </button>
                    </div>
                  ))
                ) : (
                  <span className='block truncate text-gray-500 dark:text-gray-400'>{placholder}</span>
                )}
              </div>
              <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
                <ChevronDownIcon
                  className={cx('h-5 w-5 transform-gpu text-gray-400 transition-transform', {
                    'rotate-180': selected,
                  })}
                  aria-hidden='true'
                />
              </div>
            </div>
          </div>
          {selected ? (
            <div className='absolute z-50 mt-1 max-h-60 w-full min-w-max overflow-auto rounded-md bg-gray-50 py-1 text-base ring-1 ring-black/10 focus:outline-hidden sm:text-sm dark:bg-slate-800'>
              <div className='flex w-full flex-col'>
                {onSearch ? (
                  <div className='relative mx-1 mb-1'>
                    <input
                      className='w-full rounded-md border border-gray-300 bg-white py-2 pr-10 pl-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:border-gray-600 dark:bg-slate-700 dark:text-gray-50'
                      placeholder={searchPlaseholder}
                      onChange={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onSearch(e.target.value || '')
                      }}
                      type='text'
                    />
                    <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3'>
                      <MagnifyingGlassIcon className='h-4 w-4 text-gray-400' aria-hidden='true' />
                    </div>
                  </div>
                ) : null}
                {_map(items, (item) => (
                  <div
                    key={keyExtractor ? `${keyExtractor(item)}select` : `${item}select`}
                    onClick={() => onSelect(item)}
                    className={cx('relative mx-1 cursor-pointer rounded-md py-2 pr-4 pl-3 text-sm select-none', {
                      'bg-gray-300 dark:bg-slate-600': _includes(label, item),
                      'hover:bg-gray-200 dark:hover:bg-slate-700': !_includes(label, item),
                      'text-gray-900 dark:text-white': _includes(label, item),
                      'text-gray-700 dark:text-gray-50': !_includes(label, item),
                    })}
                  >
                    <div className='flex w-full items-center gap-2 whitespace-nowrap'>
                      <div className='flex min-w-0 flex-1 items-center gap-2'>
                        {itemExtractor ? itemExtractor(item) : item}
                      </div>
                      {_includes(label, item) ? (
                        <span className='h-2 w-2 flex-shrink-0 rounded-full bg-indigo-600 dark:bg-indigo-400' />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {hint ? <p className='mt-2 text-sm whitespace-pre-line text-gray-500 dark:text-gray-300'>{hint}</p> : null}
    </div>
  )
}

export default MultiSelect
