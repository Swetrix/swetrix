import { CheckIcon, CaretUpDownIcon } from '@phosphor-icons/react'
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
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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
    <div
      ref={dropdownRef}
      className={cx('relative flex w-full flex-col', className)}
    >
      <div className='relative'>
        <input
          ref={inputRef}
          type='text'
          className='w-full cursor-text rounded-md border-0 bg-white py-2 pr-10 pl-3 text-sm font-medium ring-1 ring-gray-300 transition-colors ring-inset placeholder:text-gray-400 hover:bg-gray-50 focus:ring-2 focus:ring-slate-900 focus:outline-hidden dark:bg-slate-950 dark:text-gray-50 dark:ring-slate-700/80 dark:placeholder:text-gray-500 dark:hover:bg-slate-900 dark:focus:ring-slate-300'
          placeholder={placeholder}
          value={searchValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
        />
        <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
          <CaretUpDownIcon
            className='h-5 w-5 text-gray-400'
            aria-hidden='true'
          />
        </span>

        <div
          className={cx(
            'absolute top-full z-30 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm ring-1 ring-black/10 focus:outline-hidden dark:bg-slate-950 dark:ring-slate-700/80',
            'transition-opacity duration-100 ease-in',
            isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          {_isEmpty(items) ? (
            <div className='mx-1 px-3 py-2 text-gray-500 dark:text-gray-400'>
              No options available
            </div>
          ) : (
            _map(items, (item) => {
              const isSelected = _includes(label, item)
              return (
                <button
                  type='button'
                  key={
                    keyExtractor
                      ? `${keyExtractor(item)}select`
                      : `${item}select`
                  }
                  onClick={() => handleSelectItem(item)}
                  className={cx(
                    'relative mx-1 flex w-[calc(100%-0.5rem)] cursor-pointer items-center rounded-md py-2 pr-4 pl-8 text-left text-sm transition-colors select-none',
                    {
                      'bg-gray-200 dark:bg-slate-900/80': isSelected,
                      'hover:bg-gray-100 dark:hover:bg-slate-900/80':
                        !isSelected,
                      'text-gray-900 dark:text-white': isSelected,
                      'text-gray-700 dark:text-gray-50': !isSelected,
                    },
                  )}
                >
                  {isSelected ? (
                    <span className='absolute inset-y-0 left-0 flex items-center pl-1.5 text-gray-600 dark:text-gray-300'>
                      <CheckIcon className='h-5 w-5' aria-hidden='true' />
                    </span>
                  ) : null}
                  <span
                    className={cx('block truncate', {
                      'font-semibold': isSelected,
                      'font-normal': !isSelected,
                    })}
                  >
                    {itemExtractor ? itemExtractor(item) : item}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </div>

      {!_isEmpty(label) ? (
        <div className='mt-2 flex flex-wrap gap-2'>
          {_map(label, (item) => (
            <span
              key={keyExtractor ? keyExtractor(item) : item}
              className='inline-flex items-center gap-1.5 rounded-md bg-gray-100 py-1.5 pr-2 pl-2.5 text-sm font-medium text-gray-700 dark:bg-slate-900 dark:text-gray-200'
            >
              <span className='flex items-center gap-1.5'>
                {labelExtractor ? labelExtractor(item) : item}
              </span>
              <button
                type='button'
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onRemove(item)
                }}
                className='inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 focus:bg-gray-300 focus:text-gray-700 focus:outline-hidden dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-200'
              >
                <span className='sr-only'>Remove</span>
                <svg
                  className='h-2.5 w-2.5'
                  stroke='currentColor'
                  fill='none'
                  viewBox='0 0 8 8'
                >
                  <path
                    strokeLinecap='round'
                    strokeWidth='1.5'
                    d='m1 1 6 6m0-6-6 6'
                  />
                </svg>
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {hint ? (
        <p className='mt-2 text-sm whitespace-pre-line text-gray-500 dark:text-gray-300'>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export default MultiSelect
