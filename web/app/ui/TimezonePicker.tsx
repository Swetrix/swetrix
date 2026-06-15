/* oxlint-disable jsx-a11y/no-redundant-roles jsx-a11y/prefer-tag-over-role */
import { Transition } from '@headlessui/react'
import {
  CaretUpDownIcon,
  CheckIcon,
  MagnifyingGlassIcon,
} from '@phosphor-icons/react'
import cx from 'clsx'
import {
  Fragment,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { useTranslation } from 'react-i18next'

import timezones from '~/lib/constants/timezones'
import { Text } from '~/ui/Text'

interface TimezoneOption {
  value: string
  label: string
  offsetLabel: string
  offset: number
  searchLabel: string
}

const getTimezoneOffsetMinutes = (
  timeZone: string,
  referenceDate: Date,
): number => {
  try {
    const date = new Date(referenceDate)
    date.setMilliseconds(0)
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(date)

    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    )

    const asUtc = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second),
    )

    return Math.round((asUtc - date.getTime()) / 60000)
  } catch {
    return 0
  }
}

const formatOffset = (offsetMinutes: number): string => {
  const sign = offsetMinutes < 0 ? '-' : ''
  const absolute = Math.abs(offsetMinutes)
  const hours = Math.trunc(absolute / 60)
  const minutes = absolute % 60

  return minutes
    ? `${sign}${hours}:${String(minutes).padStart(2, '0')}`
    : `${sign}${hours}`
}

const formatOffsetLabel = (offsetMinutes: number): string => {
  const offset = formatOffset(offsetMinutes)

  return `GMT${offset.startsWith('-') ? offset : `+${offset}`}`
}

const isValidTimezone = (timeZone: string, date: Date): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(date)
    return true
  } catch {
    return false
  }
}

const getTimezoneLabel = (timeZone: string): string => {
  if (timeZone === 'GMT') {
    return 'UTC'
  }

  const parts = timeZone.split('/')
  const area = parts.at(0)
  const city = parts.at(-1)?.replace(/_/g, ' ') || timeZone

  return area ? `${area} - ${city}` : city
}

const buildOptions = (date = new Date()) =>
  Object.entries(timezones)
    .map(([value, description]) => {
      const offset = getTimezoneOffsetMinutes(value, date)
      const offsetLabel = formatOffsetLabel(offset)
      const label = getTimezoneLabel(value)

      return {
        value,
        label,
        offset,
        offsetLabel,
        searchLabel: `${value} ${description} ${label} ${offsetLabel}`,
      }
    })
    .sort((a, b) => a.offset - b.offset)

const buildCustomOption = (
  timeZone: string,
  date: Date,
): TimezoneOption | null => {
  if (!isValidTimezone(timeZone, date)) {
    return null
  }

  const offset = getTimezoneOffsetMinutes(timeZone, date)
  const offsetLabel = formatOffsetLabel(offset)
  const label = getTimezoneLabel(timeZone)

  return {
    value: timeZone,
    label,
    offsetLabel,
    offset,
    searchLabel: `${timeZone} ${label} ${offsetLabel}`,
  }
}

const formatInTimezone = (
  date: Date,
  timeZone: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      ...options,
      ...(timeZone ? { timeZone } : {}),
    }).format(date)
  } catch {
    return new Intl.DateTimeFormat('en-US', options).format(date)
  }
}

const formatTimezoneTime = (date: Date, timeZone?: string | null): string =>
  formatInTimezone(date, timeZone, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

const getSelectedTimezoneLabel = (option: TimezoneOption | null): string =>
  option ? `${option.label} (${option.offsetLabel})` : ''

interface TimezoneSelectProps {
  value:
    | string
    | {
        value: string
        label?: string
      }
  onChange: (item: string) => void
}

const TimezoneSelect = ({ value, onChange }: TimezoneSelectProps) => {
  const { t } = useTranslation('common')
  const [now, setNow] = useState(() => new Date())
  const [isOpen, setIsOpen] = useState(false)
  const [isKeyboardMotion, setIsKeyboardMotion] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pointerDownRef = useRef(false)
  const listboxId = useId()
  const optionsCacheKey = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime()
  const optionsReferenceDate = useMemo(
    () => new Date(optionsCacheKey + 12 * 60 * 60 * 1000),
    [optionsCacheKey],
  )
  const options = useMemo(() => {
    const builtOptions = buildOptions(optionsReferenceDate)
    const customValue = typeof value === 'string' ? value : value.value
    const customOption = customValue
      ? buildCustomOption(customValue, optionsReferenceDate)
      : null

    if (
      !customOption ||
      builtOptions.some((option) => option.value === customOption.value)
    ) {
      return builtOptions
    }

    return [...builtOptions, customOption].sort((a, b) => a.offset - b.offset)
  }, [optionsReferenceDate, value])
  const keyExtractor = (option: TimezoneOption) => option.value

  const parseTimezone = (
    zone:
      | string
      | {
          value: string
          label?: string
        },
  ): TimezoneOption | null => {
    if (typeof zone === 'object' && zone.value && zone.label) {
      return (
        options.find((tz) => tz.value === zone.value) ??
        buildCustomOption(zone.value, optionsReferenceDate) ?? {
          value: zone.value,
          label: zone.label,
          offsetLabel: 'GMT+0',
          offset: 0,
          searchLabel: `${zone.value} ${zone.label}`,
        }
      )
    }

    if (typeof zone === 'string') {
      return (
        options.find((tz) => tz.value === zone) ??
        buildCustomOption(zone, optionsReferenceDate)
      )
    }

    if (zone.value && !zone.label) {
      return (
        options.find((tz) => tz.value === zone.value) ??
        buildCustomOption(zone.value, optionsReferenceDate)
      )
    }

    return null
  }

  const selectedTimezone = parseTimezone(value)
  const selectedOptionKey = selectedTimezone
    ? keyExtractor(selectedTimezone)
    : undefined
  const selectedIndex = selectedOptionKey
    ? options.findIndex((option) => keyExtractor(option) === selectedOptionKey)
    : -1

  const filteredOptions = useMemo(() => {
    const query = searchValue.trim().toLocaleLowerCase()

    if (!query) {
      return options
    }

    return options.filter((option) =>
      [option.value, option.label, option.offsetLabel, option.searchLabel]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
        .includes(query),
    )
  }, [options, searchValue])

  const selectedLabel = getSelectedTimezoneLabel(selectedTimezone)
  const activeOptionId =
    isOpen && filteredOptions[activeIndex]
      ? `${listboxId}-option-${activeIndex}`
      : undefined

  const closeDropdown = (interaction: 'keyboard' | 'pointer' = 'pointer') => {
    setIsKeyboardMotion(interaction === 'keyboard')
    pointerDownRef.current = false
    setIsOpen(false)
    setSearchValue('')
  }

  const openDropdown = (interaction: 'keyboard' | 'pointer' = 'pointer') => {
    setIsKeyboardMotion(interaction === 'keyboard')
    setSearchValue('')
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
    setIsOpen(true)
  }

  const handleSelect = (
    item: TimezoneOption,
    interaction: 'keyboard' | 'pointer' = 'pointer',
  ) => {
    onChange(keyExtractor(item))
    closeDropdown(interaction)
    inputRef.current?.focus()
  }

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSearchValue('')
        setIsKeyboardMotion(false)
        pointerDownRef.current = false
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isOpen || !filteredOptions[activeIndex]) {
      return
    }

    const frame = requestAnimationFrame(() => {
      document
        .getElementById(`${listboxId}-option-${activeIndex}`)
        ?.scrollIntoView({ block: 'nearest' })
    })

    return () => cancelAnimationFrame(frame)
  }, [activeIndex, filteredOptions, isOpen, listboxId])

  useEffect(() => {
    setActiveIndex(0)
  }, [searchValue])

  useEffect(() => {
    setActiveIndex((current) =>
      Math.min(current, Math.max(filteredOptions.length - 1, 0)),
    )
  }, [filteredOptions.length])

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeDropdown('keyboard')
      inputRef.current?.focus()
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) =>
        Math.min(current + 1, Math.max(filteredOptions.length - 1, 0)),
      )
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, 0))
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const activeOption = filteredOptions[activeIndex]

      if (activeOption) {
        handleSelect(activeOption, 'keyboard')
      }
    }
  }

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!isOpen) {
        openDropdown('keyboard')
        return
      }

      setActiveIndex((current) =>
        Math.min(current + 1, Math.max(filteredOptions.length - 1, 0)),
      )
      return
    }

    handleSearchKeyDown(event)
  }

  const handleFocus = () => {
    if (!isOpen) {
      openDropdown(pointerDownRef.current ? 'pointer' : 'keyboard')
    }

    pointerDownRef.current = false
  }

  return (
    <div ref={containerRef} className='relative w-full'>
      <div className='relative'>
        <MagnifyingGlassIcon
          className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500'
          aria-hidden='true'
        />
        <input
          ref={inputRef}
          type='text'
          value={isOpen ? searchValue : selectedLabel}
          onFocus={handleFocus}
          onPointerDown={() => {
            pointerDownRef.current = true
          }}
          onChange={(event) => {
            if (!isOpen) {
              setIsKeyboardMotion(true)
              setIsOpen(true)
            }

            setSearchValue(event.target.value)
          }}
          onKeyDown={handleInputKeyDown}
          role='combobox'
          aria-label={t('profileSettings.timezone')}
          aria-expanded={isOpen}
          aria-haspopup='listbox'
          aria-controls={listboxId}
          aria-autocomplete='list'
          aria-activedescendant={activeOptionId}
          placeholder={t('profileSettings.timezoneSearchPlaceholder')}
          className='block w-full rounded-md border-0 bg-white py-2 pr-8 pl-9 text-sm text-gray-900 ring-1 ring-gray-300 transition-shadow duration-150 ease-out ring-inset placeholder:text-gray-400 hover:ring-gray-400 focus:ring-2 focus:ring-slate-900 focus:outline-hidden dark:bg-slate-950 dark:text-gray-50 dark:ring-slate-700/80 dark:placeholder:text-gray-500 dark:hover:ring-slate-600 dark:focus:ring-slate-300'
        />
        <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
          <CaretUpDownIcon
            className='size-4 text-gray-400 dark:text-gray-500'
            aria-hidden='true'
          />
        </span>
      </div>

      <Transition
        show={isOpen}
        as={Fragment}
        enter={cx(
          'transition-[opacity,transform] ease-out-quint',
          isKeyboardMotion
            ? 'duration-0'
            : 'duration-150 motion-reduce:transition-opacity',
        )}
        enterFrom={cx(
          'opacity-0',
          !isKeyboardMotion && '-translate-y-0.5 motion-reduce:translate-y-0',
        )}
        enterTo='opacity-100 translate-y-0'
        leave={cx(
          'transition-[opacity,transform] ease-out-quint',
          isKeyboardMotion
            ? 'duration-0'
            : 'duration-100 motion-reduce:transition-opacity',
        )}
        leaveFrom='opacity-100 translate-y-0'
        leaveTo={cx(
          'opacity-0',
          !isKeyboardMotion && '-translate-y-0.5 motion-reduce:translate-y-0',
        )}
      >
        <div className='absolute z-50 mt-1.5 w-full min-w-[240px] overflow-hidden rounded-md bg-white text-sm ring-1 ring-gray-200 focus:outline-hidden dark:bg-slate-950 dark:ring-slate-800'>
          <div
            id={listboxId}
            role='listbox'
            aria-label={t('profileSettings.timezone')}
            className='max-h-80 overflow-auto py-1.5'
          >
            {filteredOptions.length ? (
              filteredOptions.map((option, index) => {
                const selected = option.value === selectedTimezone?.value
                const active = index === activeIndex

                return (
                  <button
                    id={`${listboxId}-option-${index}`}
                    key={option.value}
                    type='button'
                    role='option'
                    aria-selected={selected}
                    tabIndex={-1}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => handleSelect(option)}
                    className={cx(
                      'mx-1 flex w-[calc(100%-0.5rem)] transform-gpu cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left transition-[background-color,color,transform] duration-100 ease-out select-none active:scale-[0.99] motion-reduce:transition-colors motion-reduce:active:scale-100',
                      {
                        'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-white':
                          active,
                        'text-gray-900 dark:text-white': selected && !active,
                        'text-gray-700 dark:text-gray-50': !active && !selected,
                      },
                    )}
                  >
                    <span className='min-w-0 flex-1 truncate'>
                      <Text
                        as='span'
                        size='sm'
                        weight={selected ? 'semibold' : 'normal'}
                        colour='inherit'
                      >
                        {option.label}
                      </Text>
                      <Text as='span' size='sm' colour='secondary'>
                        {' '}
                        ({option.offsetLabel})
                      </Text>
                    </span>
                    <Text
                      as='span'
                      size='sm'
                      colour='secondary'
                      className='hidden shrink-0 tabular-nums sm:inline'
                      suppressHydrationWarning
                    >
                      {formatTimezoneTime(now, option.value)}
                    </Text>
                    {selected ? (
                      <CheckIcon
                        weight='bold'
                        className='size-4 shrink-0 text-slate-900 dark:text-slate-100'
                        aria-hidden='true'
                      />
                    ) : null}
                  </button>
                )
              })
            ) : (
              <Text
                as='div'
                size='sm'
                colour='secondary'
                className='px-4 py-6 text-center'
              >
                {t('common.nothingFound')}
              </Text>
            )}
          </div>
        </div>
      </Transition>
    </div>
  )
}

export default TimezoneSelect
