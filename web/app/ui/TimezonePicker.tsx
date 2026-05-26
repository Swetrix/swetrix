import { Transition } from '@headlessui/react'
import { CaretUpDownIcon, CheckIcon, GlobeIcon } from '@phosphor-icons/react'
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

import _find from 'lodash/find'
import _includes from 'lodash/includes'
import _reduce from 'lodash/reduce'

import timezones from '~/lib/constants/timezones'
import { Text } from '~/ui/Text'

interface TimezoneOption {
  value: string
  label: string
  displayName: string
  cityName: string
  offsetLabel: string
  offset: number
  abbrev?: string
  altName?: string
  genericName?: string
  regionName?: string
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

const getTimezoneName = (
  timeZone: string,
  timeZoneName: Intl.DateTimeFormatOptions['timeZoneName'],
  date: Date,
): string | undefined => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName,
    })
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')?.value
  } catch {
    return undefined
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

const getTimezoneCityName = (timeZone: string): string => {
  if (timeZone === 'GMT') {
    return 'UTC'
  }

  const cityName = timeZone.split('/').at(-1) || timeZone

  return cityName.replace(/_/g, ' ')
}

const getTimezoneRegionName = (timeZoneName?: string): string | undefined => {
  if (!timeZoneName || timeZoneName.startsWith('GMT')) {
    return undefined
  }

  const withoutStandard = timeZoneName.replace(
    /\s+(Standard|Daylight) Time$/,
    '',
  )

  if (withoutStandard !== timeZoneName) {
    return withoutStandard
  }

  const withoutTime = timeZoneName.replace(/\s+Time$/, '')

  return withoutTime.split(/\s+/).length > 1 ? withoutTime : timeZoneName
}

const buildOptions = (date = new Date()) =>
  _reduce(
    Object.entries(timezones),
    (selectOptions: TimezoneOption[], zone) => {
      const offsetMinutes = getTimezoneOffsetMinutes(zone[0], date)
      const hr = formatOffset(offsetMinutes)
      const offsetLabel = `GMT${_includes(hr, '-') ? hr : `+${hr}`}`
      const label = `(${offsetLabel}) ${zone[1]}`
      const cityName = getTimezoneCityName(zone[0])
      const genericName = getTimezoneName(zone[0], 'longGeneric', date)

      selectOptions.push({
        value: zone[0],
        label,
        displayName: zone[1],
        cityName,
        offsetLabel,
        offset: offsetMinutes / 60,
        abbrev: getTimezoneName(zone[0], 'short', date),
        altName: getTimezoneName(zone[0], 'long', date),
        genericName,
        regionName: getTimezoneRegionName(genericName),
      })

      return selectOptions
    },
    [],
  ).sort((a, b) => a.offset - b.offset)

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

const formatTimezoneDate = (date: Date, timeZone?: string | null): string =>
  formatInTimezone(date, timeZone, {
    month: 'short',
    day: 'numeric',
  })

const formatTimezoneDateTime = (date: Date, timeZone?: string | null): string =>
  `${formatTimezoneTime(date, timeZone)}, ${formatTimezoneDate(date, timeZone)}`

const getTimezonePlaceLabel = (option: TimezoneOption): string => {
  if (option.value === 'GMT') {
    return option.displayName
  }

  if (option.regionName && option.regionName !== option.cityName) {
    return `${option.cityName} - ${option.regionName}`
  }

  return option.displayName
}

const getSelectedTimezoneLabel = (option: TimezoneOption | null): string =>
  option ? `${getTimezonePlaceLabel(option)} (${option.offsetLabel})` : ''

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
  const [searchValue, setSearchValue] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()
  const optionsCacheKey = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime()
  const options = useMemo(
    () => buildOptions(new Date(optionsCacheKey + 12 * 60 * 60 * 1000)),
    [optionsCacheKey],
  )
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
        _find(options, (tz) => tz.value === zone.value) ?? {
          value: zone.value,
          label: zone.label,
          displayName: zone.label,
          cityName: getTimezoneCityName(zone.value),
          offsetLabel: 'GMT+0',
          offset: 0,
        }
      )
    }

    if (typeof zone === 'string') {
      return _find(options, (tz) => tz.value === zone) ?? null
    }

    if (zone.value && !zone.label) {
      return _find(options, (tz) => tz.value === zone.value) ?? null
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
      [
        option.value,
        option.label,
        option.displayName,
        option.cityName,
        option.offsetLabel,
        option.abbrev,
        option.altName,
        option.genericName,
        option.regionName,
        getTimezonePlaceLabel(option),
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
        .includes(query),
    )
  }, [options, searchValue])

  const selectedLabel = getSelectedTimezoneLabel(selectedTimezone)

  const closeDropdown = () => {
    setIsOpen(false)
    setSearchValue('')
  }

  const openDropdown = () => {
    setSearchValue('')
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
    setIsOpen(true)
  }

  const handleSelect = (item: TimezoneOption) => {
    onChange(keyExtractor(item))
    closeDropdown()
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
      closeDropdown()
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
        handleSelect(activeOption)
      }
    }
  }

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!isOpen) {
        openDropdown()
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
      openDropdown()
    }
  }

  return (
    <div ref={containerRef} className='relative w-full'>
      <div className='relative'>
        <GlobeIcon
          className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500'
          aria-hidden='true'
        />
        <input
          ref={inputRef}
          type='text'
          value={isOpen ? searchValue : selectedLabel}
          onFocus={handleFocus}
          onChange={(event) => {
            if (!isOpen) {
              setIsOpen(true)
            }

            setSearchValue(event.target.value)
          }}
          onKeyDown={handleInputKeyDown}
          aria-label={t('profileSettings.timezone')}
          aria-controls={listboxId}
          aria-activedescendant={
            isOpen && filteredOptions[activeIndex]
              ? `${listboxId}-option-${activeIndex}`
              : undefined
          }
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
        enter='transition ease-out duration-150'
        enterFrom='opacity-0 -translate-y-0.5'
        enterTo='opacity-100 translate-y-0'
        leave='transition ease-in duration-100'
        leaveFrom='opacity-100 translate-y-0'
        leaveTo='opacity-0 -translate-y-0.5'
      >
        <div className='absolute z-50 mt-1 w-full min-w-[200px] overflow-hidden rounded-md bg-white text-sm ring-1 ring-gray-200 focus:outline-hidden dark:bg-slate-950 dark:ring-slate-800'>
	          <div
	            id={listboxId}
	            aria-label={t('profileSettings.timezone')}
	            className='max-h-80 overflow-auto py-1'
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
	                    aria-pressed={selected}
	                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => handleSelect(option)}
                    className={cx(
                      'mx-1 flex w-[calc(100%-0.5rem)] cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left transition-colors duration-100 ease-out select-none',
                      {
                        'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-white':
                          active || selected,
                        'text-gray-700 dark:text-gray-50': !active && !selected,
                      },
                    )}
                  >
                    <span className='min-w-0 flex-1 truncate'>
                      <Text
                        as='span'
                        size='sm'
                        weight='semibold'
                        colour='primary'
                        suppressHydrationWarning
                      >
                        {formatTimezoneDateTime(now, option.value)}
                      </Text>
                      <Text as='span' size='sm' colour='secondary'>
                        {' '}
                        - {option.offsetLabel}, {getTimezonePlaceLabel(option)}
                      </Text>
                    </span>
                    {selected ? (
                      <CheckIcon
                        weight='bold'
                        className='mt-0.5 size-4 shrink-0 text-slate-900 dark:text-slate-100'
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
