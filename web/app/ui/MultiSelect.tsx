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
  placeholder?: string
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
  placeholder = 'Select...',
  className,
  itemExtractor,
  onSearch,
}: MultiSelectProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchValue('')
        if (onSearch) {
          onSearch('')
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onSearch])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchValue(value)
    if (onSearch) {
      onSearch(value)
    }
  }

  const handleFocus = () => {
    setIsOpen(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSearchValue('')
      if (onSearch) {
        onSearch('')
      }
      inputRef.current?.blur()
    }
  }

  const handleSelectItem = (item: any) => {
    onSelect(item)
    setSearchValue('')
    if (onSearch) {
      onSearch('')
    }
  }

  return (
    <div ref={dropdownRef} className={cx('relative flex w-full flex-col', className)}>
      {/* Search input as the dropdown trigger */}
      <div className='relative'>
        <input
          ref={inputRef}
          type='text'
          className='w-full cursor-text rounded-md border border-gray-300 bg-white py-2 pr-8 pl-3 text-sm transition-colors ring-inset placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:border-gray-700 dark:bg-slate-800 dark:text-gray-50 dark:placeholder:text-gray-500'
          placeholder={placeholder}
          value={searchValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
        />
        <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
          <ChevronDownIcon
            className={cx('h-5 w-5 text-gray-400 transition-transform', {
              'rotate-180': isOpen,
            })}
            aria-hidden='true'
          />
        </span>

        {/* Dropdown menu */}
        {isOpen ? (
          <div className='absolute top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black/10 focus:outline-hidden dark:bg-slate-800'>
            {/* Options list */}
            <div className='px-1'>
              {_isEmpty(items) ? (
                <div className='px-3 py-2 text-gray-500 dark:text-gray-400'>No options available</div>
              ) : (
                _map(items, (item) => {
                  const isSelected = _includes(label, item)
                  return (
                    <button
                      type='button'
                      key={keyExtractor ? `${keyExtractor(item)}select` : `${item}select`}
                      onClick={() => handleSelectItem(item)}
                      className={cx(
                        'relative flex w-full cursor-pointer items-center gap-2 rounded-md py-2 pr-4 pl-3 text-left text-sm transition-colors select-none',
                        {
                          'bg-indigo-50 dark:bg-indigo-900/30': isSelected,
                          'hover:bg-gray-100 dark:hover:bg-slate-700': !isSelected,
                          'text-gray-900 dark:text-white': isSelected,
                          'text-gray-700 dark:text-gray-50': !isSelected,
                        },
                      )}
                    >
                      <span className='flex min-w-0 flex-1 items-center gap-2'>
                        {itemExtractor ? itemExtractor(item) : item}
                      </span>
                      {isSelected ? (
                        <span className='ml-auto flex h-4 w-4 shrink-0 items-center justify-center'>
                          <svg
                            className='h-4 w-4 text-indigo-600 dark:text-indigo-400'
                            viewBox='0 0 20 20'
                            fill='currentColor'
                          >
                            <path
                              fillRule='evenodd'
                              d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                              clipRule='evenodd'
                            />
                          </svg>
                        </span>
                      ) : null}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Selected items displayed below the selector */}
      {!_isEmpty(label) ? (
        <div className='mt-2 flex flex-wrap gap-2'>
          {_map(label, (item) => (
            <span
              key={keyExtractor ? keyExtractor(item) : item}
              className='inline-flex items-center gap-1.5 rounded-md bg-gray-100 py-1.5 pr-2 pl-2.5 text-sm font-medium text-gray-700 dark:bg-slate-700 dark:text-gray-200'
            >
              <span className='flex items-center gap-1.5'>{labelExtractor ? labelExtractor(item) : item}</span>
              <button
                type='button'
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onRemove(item)
                }}
                className='inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 focus:bg-gray-300 focus:text-gray-700 focus:outline-hidden dark:text-gray-400 dark:hover:bg-slate-600 dark:hover:text-gray-200'
              >
                <span className='sr-only'>Remove</span>
                <svg className='h-2.5 w-2.5' stroke='currentColor' fill='none' viewBox='0 0 8 8'>
                  <path strokeLinecap='round' strokeWidth='1.5' d='m1 1 6 6m0-6-6 6' />
                </svg>
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {/* Hint text */}
      {hint ? <p className='mt-2 text-sm whitespace-pre-line text-gray-500 dark:text-gray-300'>{hint}</p> : null}
    </div>
  )
}

export default MultiSelect
