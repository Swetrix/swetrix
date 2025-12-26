import { useVirtualizer } from '@tanstack/react-virtual'
import cx from 'clsx'
import _includes from 'lodash/includes'
import _isEmpty from 'lodash/isEmpty'
import _toLower from 'lodash/toLower'
import {
  BuildingIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  CircleQuestionMark,
  CompassIcon,
  CpuIcon,
  FileIcon,
  FileTextIcon,
  Gamepad2Icon,
  GlobeIcon,
  LanguagesIcon,
  LinkIcon,
  LogInIcon,
  LogOutIcon,
  MapIcon,
  MapPinIcon,
  MegaphoneIcon,
  MonitorCogIcon,
  MonitorIcon,
  PlusIcon,
  RadioIcon,
  ServerIcon,
  ShareIcon,
  SmartphoneIcon,
  TabletIcon,
  TabletSmartphoneIcon,
  TagIcon,
  TvIcon,
  WatchIcon,
} from 'lucide-react'
import { useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { BROWSER_LOGO_MAP, OS_LOGO_MAP, OS_LOGO_MAP_DARK } from '~/lib/constants'
import Flag from '~/ui/Flag'
import Spin from '~/ui/icons/Spin'
import countries from '~/utils/isoCountries'

const ITEM_HEIGHT = 36

// Icon mapping for filter categories
export const filterCategoryIcons: Record<string, ReactNode> = {
  cc: <MapPinIcon className='size-4' strokeWidth={1.5} />,
  rg: <MapIcon className='size-4' strokeWidth={1.5} />,
  ct: <BuildingIcon className='size-4' strokeWidth={1.5} />,
  pg: <FileTextIcon className='size-4' strokeWidth={1.5} />,
  entryPage: <LogInIcon className='size-4' strokeWidth={1.5} />,
  exitPage: <LogOutIcon className='size-4' strokeWidth={1.5} />,
  host: <ServerIcon className='size-4' strokeWidth={1.5} />,
  br: <CompassIcon className='size-4' strokeWidth={1.5} />,
  brv: <CompassIcon className='size-4' strokeWidth={1.5} />,
  os: <MonitorCogIcon className='size-4' strokeWidth={1.5} />,
  osv: <MonitorCogIcon className='size-4' strokeWidth={1.5} />,
  ref: <LinkIcon className='size-4' strokeWidth={1.5} />,
  so: <ShareIcon className='size-4' strokeWidth={1.5} />,
  me: <RadioIcon className='size-4' strokeWidth={1.5} />,
  ca: <MegaphoneIcon className='size-4' strokeWidth={1.5} />,
  te: <TagIcon className='size-4' strokeWidth={1.5} />,
  co: <FileIcon className='size-4' strokeWidth={1.5} />,
  lc: <LanguagesIcon className='size-4' strokeWidth={1.5} />,
  dv: <TabletSmartphoneIcon className='size-4' strokeWidth={1.5} />,
}

const deviceIconMapping: Record<string, ReactNode> = {
  desktop: <MonitorIcon className='size-4' strokeWidth={1.5} />,
  mobile: <SmartphoneIcon className='size-4' strokeWidth={1.5} />,
  tablet: <TabletIcon className='size-4' strokeWidth={1.5} />,
  smarttv: <TvIcon className='size-4' strokeWidth={1.5} />,
  console: <Gamepad2Icon className='size-4' strokeWidth={1.5} />,
  wearable: <WatchIcon className='size-4' strokeWidth={1.5} />,
  embedded: <CpuIcon className='size-4' strokeWidth={1.5} />,
}

// Special separator for combined version values (e.g., "Chrome|||120.5")
const VERSION_SEPARATOR = '|||'

// Helper to create combined version value
export const createVersionValue = (parent: string, version: string) => `${parent}${VERSION_SEPARATOR}${version}`

// Helper to parse combined version value
export const parseVersionValue = (value: string): { parent: string; version: string } | null => {
  if (!value.includes(VERSION_SEPARATOR)) return null
  const [parent, version] = value.split(VERSION_SEPARATOR)
  return { parent, version }
}

interface FilterValueInputProps {
  items: string[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  column: string
  language: string
  disabled?: boolean
  isLoading?: boolean
  theme: string
  className?: string
}

const FilterValueInput = ({
  items,
  value,
  onChange,
  placeholder,
  column,
  language,
  disabled,
  isLoading,
  theme,
  className,
}: FilterValueInputProps) => {
  const { t } = useTranslation('common')
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getLabelForItem = useCallback(
    (item: string) => {
      if (column === 'cc') {
        return countries.getName(item, language) || item
      }
      // Handle combined version values (e.g., "Chrome|||120.5" -> "Chrome 120.5")
      if (column === 'brv' || column === 'osv') {
        const parsed = parseVersionValue(item)
        if (parsed) {
          return `${parsed.parent} ${parsed.version}`
        }
      }
      return item || t('common.notSet')
    },
    [column, language, t],
  )

  const getIconForItem = useCallback(
    (item: string): ReactNode => {
      if (column === 'cc') {
        return <Flag className='shrink-0 rounded-xs' country={item} size={16} alt='' aria-hidden='true' />
      }

      if (column === 'br') {
        // @ts-expect-error - dynamic key access
        const logoUrl = BROWSER_LOGO_MAP[item]
        if (logoUrl) {
          return <img src={logoUrl} className='size-4 shrink-0' alt='' />
        }
        return <GlobeIcon className='size-4 shrink-0' strokeWidth={1.5} />
      }

      // For browser versions, show browser icon
      if (column === 'brv') {
        const parsed = parseVersionValue(item)
        if (parsed) {
          // @ts-expect-error - dynamic key access
          const logoUrl = BROWSER_LOGO_MAP[parsed.parent]
          if (logoUrl) {
            return <img src={logoUrl} className='size-4 shrink-0' alt='' />
          }
        }
        return <GlobeIcon className='size-4 shrink-0' strokeWidth={1.5} />
      }

      if (column === 'os') {
        // @ts-expect-error - dynamic key access
        const logoUrlLight = OS_LOGO_MAP[item]
        // @ts-expect-error - dynamic key access
        const logoUrlDark = OS_LOGO_MAP_DARK[item]
        let logoUrl = theme === 'dark' ? logoUrlDark : logoUrlLight
        logoUrl ||= logoUrlLight

        if (logoUrl) {
          return <img src={logoUrl} className='size-4 shrink-0 dark:fill-gray-50' alt='' />
        }
        return <GlobeIcon className='size-4 shrink-0' strokeWidth={1.5} />
      }

      // For OS versions, show OS icon
      if (column === 'osv') {
        const parsed = parseVersionValue(item)
        if (parsed) {
          // @ts-expect-error - dynamic key access
          const logoUrlLight = OS_LOGO_MAP[parsed.parent]
          // @ts-expect-error - dynamic key access
          const logoUrlDark = OS_LOGO_MAP_DARK[parsed.parent]
          let logoUrl = theme === 'dark' ? logoUrlDark : logoUrlLight
          logoUrl ||= logoUrlLight

          if (logoUrl) {
            return <img src={logoUrl} className='size-4 shrink-0 dark:fill-gray-50' alt='' />
          }
        }
        return <GlobeIcon className='size-4 shrink-0' strokeWidth={1.5} />
      }

      if (column === 'dv') {
        const icon = deviceIconMapping[item]
        if (icon) {
          return <span className='shrink-0'>{icon}</span>
        }
        return <CircleQuestionMark className='size-4 shrink-0' strokeWidth={1.5} />
      }

      return null
    },
    [column, theme],
  )

  // Get icon for the currently selected value (for display in input)
  const selectedIcon = value ? getIconForItem(value) : null
  const displayValue = value ? getLabelForItem(value) : ''

  const filteredItems = useMemo(() => {
    // When dropdown is closed or input is empty, show all items
    if (!isOpen || _isEmpty(inputValue)) return items
    return items.filter((item) => {
      const labelValue = getLabelForItem(item)
      return _includes(_toLower(labelValue), _toLower(inputValue))
    })
  }, [items, inputValue, isOpen, getLabelForItem])

  const virtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 15,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
  }

  const handleSelectItem = (item: string) => {
    setInputValue('')
    onChange(item)
    setIsOpen(false)
  }

  const handleFocus = () => {
    // When focusing, initialize input with the display value so user can edit it
    if (value) {
      setInputValue(displayValue)
    }
    setIsOpen(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (inputValue.trim()) {
        // For country codes, try to find the alpha2 code
        if (column === 'cc') {
          const alpha2 = countries.getAlpha2Code(inputValue, language)
          if (alpha2) {
            onChange(alpha2)
          } else {
            // Check if it's already a valid alpha2 code
            const validCode = items.find((item) => _toLower(item) === _toLower(inputValue))
            onChange(validCode || inputValue.trim())
          }
        } else {
          // Check if input matches an existing item (case insensitive)
          const matchingItem = items.find((item) => _toLower(getLabelForItem(item)) === _toLower(inputValue.trim()))
          onChange(matchingItem || inputValue.trim())
        }
        setInputValue('')
        setIsOpen(false)
      }
    } else if (e.key === 'Escape') {
      setInputValue('')
      setIsOpen(false)
    }
  }

  // Determine if we should show the icon in the input (when closed and value is selected)
  const showIconInInput = !isOpen && value && selectedIcon

  return (
    <div ref={containerRef} className={cx('relative flex-1', className)}>
      <div className='relative'>
        {showIconInInput ? (
          <span className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5'>{selectedIcon}</span>
        ) : null}
        <input
          ref={inputRef}
          type='text'
          className={cx(
            'w-full rounded-md border border-gray-300 bg-white py-2 pr-8 text-sm transition-colors ring-inset placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:border-gray-700 dark:bg-slate-800 dark:text-gray-50 dark:placeholder:text-gray-500',
            {
              'cursor-not-allowed opacity-60': disabled,
              'pl-8': showIconInInput,
              'pl-3': !showIconInInput,
            },
          )}
          placeholder={placeholder}
          value={isOpen ? inputValue : displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
          {isLoading ? <Spin className='size-4' /> : <ChevronsUpDownIcon className='h-4 w-4 text-gray-400' />}
        </span>
      </div>

      {isOpen && !disabled ? (
        <div className='absolute z-50 mt-1 w-full min-w-[200px] rounded-md bg-white text-sm shadow-lg ring-1 ring-black/10 dark:bg-slate-800'>
          {isLoading ? (
            <div className='flex items-center justify-center gap-2 px-4 py-3 text-gray-500 dark:text-gray-400'>
              <Spin className='size-4' />
              {t('common.loading')}
            </div>
          ) : _isEmpty(filteredItems) ? (
            <div className='px-4 py-3'>
              {inputValue.trim() ? (
                <button
                  type='button'
                  onClick={() => {
                    if (column === 'cc') {
                      const alpha2 = countries.getAlpha2Code(inputValue, language)
                      onChange(alpha2 || inputValue.trim())
                    } else {
                      onChange(inputValue.trim())
                    }
                    setIsOpen(false)
                  }}
                  className='flex w-full items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700'
                >
                  <PlusIcon className='h-4 w-4' />
                  {t('project.filterUseValue', { value: inputValue.trim() })}
                </button>
              ) : (
                <span className='text-gray-500 dark:text-gray-400'>{t('common.nothingFound')}</span>
              )}
            </div>
          ) : (
            <div ref={listRef} className='max-h-48 overflow-auto py-1'>
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const item = filteredItems[virtualItem.index]
                  const labelValue = getLabelForItem(item)
                  const selected = item === value
                  const icon = getIconForItem(item)

                  return (
                    <button
                      key={item}
                      type='button'
                      onClick={() => handleSelectItem(item)}
                      className={cx(
                        'absolute right-0 left-0 mx-1 flex cursor-pointer items-center gap-2 rounded-md py-2 pr-4 pl-2 text-left transition-colors select-none hover:bg-gray-100 dark:hover:bg-slate-700',
                        {
                          'bg-indigo-50 dark:bg-indigo-900/30': selected,
                          'text-gray-700 dark:text-gray-50': !selected,
                        },
                      )}
                      style={{
                        top: 0,
                        transform: `translateY(${virtualItem.start}px)`,
                        height: `${virtualItem.size}px`,
                      }}
                    >
                      {icon}
                      <span className={cx('block truncate', { 'font-medium': selected })}>{labelValue}</span>
                      {selected ? (
                        <CheckIcon className='ml-auto h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400' />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default FilterValueInput
