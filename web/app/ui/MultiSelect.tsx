import { Transition } from '@headlessui/react'
import { CheckIcon, CaretUpDownIcon, XIcon } from '@phosphor-icons/react'
import cx from 'clsx'
import _includes from 'lodash/includes'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import { useState, useEffect, useRef, useId, useMemo } from 'react'

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
  const [activeIndex, setActiveIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()
  const optionIdPrefix = useId()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSearchValue('')
        setActiveIndex(-1)
        if (onSearch) {
          onSearch('')
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onSearch])

  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(-1)
    }
  }, [isOpen, items])

  const itemKey = useMemo(
    () => (item: any) =>
      keyExtractor ? keyExtractor(item) : (itemExtractor?.(item) ?? item),
    [keyExtractor, itemExtractor],
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchValue(value)
    setActiveIndex(value && items.length > 0 ? 0 : -1)
    if (!isOpen) setIsOpen(true)
    if (onSearch) {
      onSearch(value)
    }
  }

  const handleFocus = () => {
    setIsOpen(true)
  }

  const handleSelectItem = (item: any) => {
    onSelect(item)
    setSearchValue('')
    setActiveIndex(-1)
    if (onSearch) {
      onSearch('')
    }
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSearchValue('')
      setActiveIndex(-1)
      if (onSearch) onSearch('')
      inputRef.current?.blur()
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) setIsOpen(true)
      if (items.length === 0) return
      setActiveIndex((prev) => (prev + 1) % items.length)
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!isOpen) setIsOpen(true)
      if (items.length === 0) return
      setActiveIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1))
      return
    }

    if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < items.length) {
        e.preventDefault()
        handleSelectItem(items[activeIndex])
      }
      return
    }

    if (e.key === 'Backspace' && !searchValue && label.length > 0) {
      e.preventDefault()
      onRemove(label[label.length - 1])
    }
  }

  const activeOptionId =
    activeIndex >= 0 && items[activeIndex]
      ? `${optionIdPrefix}-${itemKey(items[activeIndex])}`
      : undefined

  return (
    <div
      ref={dropdownRef}
      className={cx('relative flex w-full flex-col', className)}
    >
      <div className='relative'>
        <input
          ref={inputRef}
          type='text'
          role='combobox'
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete='list'
          aria-activedescendant={activeOptionId}
          className='block w-full rounded-md border-0 bg-white py-2 pr-9 pl-3 text-sm font-medium text-gray-900 ring-1 ring-gray-300 transition-[background-color,box-shadow] duration-150 ease-out ring-inset placeholder:text-gray-400 hover:ring-gray-400 focus:ring-2 focus:ring-slate-900 focus:outline-hidden dark:bg-slate-950 dark:text-gray-50 dark:ring-slate-700/80 dark:placeholder:text-gray-500 dark:hover:ring-slate-600 dark:focus:ring-slate-300'
          placeholder={placeholder}
          value={searchValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
        />
        <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 dark:text-gray-500'>
          <CaretUpDownIcon className='size-4' aria-hidden='true' />
        </span>

        <Transition
          show={isOpen}
          enter='transition-[opacity,transform] duration-150 ease-out'
          enterFrom='-translate-y-0.5 opacity-0'
          enterTo='translate-y-0 opacity-100'
          leave='transition-[opacity,transform] duration-150 ease-out'
          leaveFrom='translate-y-0 opacity-100'
          leaveTo='-translate-y-0.5 opacity-0'
        >
          <div
            id={listboxId}
            role='listbox'
            aria-multiselectable='true'
            className='absolute top-full z-30 mt-1.5 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-gray-200/80 focus:outline-hidden dark:bg-slate-950 dark:ring-slate-700/60'
          >
            {_isEmpty(items) ? (
              <div className='mx-1 px-3 py-2 text-gray-500 dark:text-gray-400'>
                No options available
              </div>
            ) : (
              _map(items, (item, index) => {
                const isSelected = _includes(label, item)
                const isActive = index === activeIndex
                const optionId = `${optionIdPrefix}-${itemKey(item)}`
                return (
                  <button
                    type='button'
                    id={optionId}
                    role='option'
                    aria-selected={isSelected}
                    key={`${itemKey(item)}-select`}
                    onClick={() => handleSelectItem(item)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cx(
                      'relative mx-1 flex w-[calc(100%-0.5rem)] cursor-pointer items-center rounded-md py-2 pr-8 pl-3 text-left text-sm transition-colors duration-100 ease-out select-none',
                      {
                        'bg-gray-100 text-gray-900 dark:bg-slate-800/80 dark:text-white':
                          isActive,
                        'text-gray-700 dark:text-gray-50':
                          !isActive && !isSelected,
                        'text-gray-900 dark:text-white':
                          isSelected && !isActive,
                      },
                    )}
                  >
                    <span
                      className={cx('block truncate', {
                        'font-semibold': isSelected,
                        'font-normal': !isSelected,
                      })}
                    >
                      {itemExtractor ? itemExtractor(item) : item}
                    </span>
                    {isSelected ? (
                      <span className='absolute inset-y-0 right-2 flex items-center text-slate-900 dark:text-slate-100'>
                        <CheckIcon
                          weight='bold'
                          className='size-4'
                          aria-hidden='true'
                        />
                      </span>
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
        </Transition>
      </div>

      {!_isEmpty(label) ? (
        <div className='mt-2 flex flex-wrap gap-1.5'>
          {_map(label, (item) => (
            <span
              key={itemKey(item)}
              className='inline-flex items-center gap-1.5 rounded-md bg-gray-100 py-1 pr-1.5 pl-2.5 text-xs font-medium text-gray-800 ring-1 ring-gray-200/70 ring-inset dark:bg-slate-800/60 dark:text-gray-100 dark:ring-slate-700/60'
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
                aria-label={`Remove ${labelExtractor ? labelExtractor(item) : item}`}
                className='inline-flex size-4 shrink-0 items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden dark:text-gray-400 dark:hover:bg-slate-700 dark:hover:text-gray-100 dark:focus-visible:ring-slate-300'
              >
                <XIcon className='size-3' weight='bold' aria-hidden='true' />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {hint ? (
        <p className='mt-1.5 text-sm whitespace-pre-line text-gray-500 dark:text-gray-400'>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export default MultiSelect
