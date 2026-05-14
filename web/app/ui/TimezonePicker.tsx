import _find from 'lodash/find'
import _includes from 'lodash/includes'
import _reduce from 'lodash/reduce'

import timezones from '~/lib/constants/timezones'

import Select from './Select'

const date = new Date()

const getTimezoneOffsetMinutes = (timeZone: string): number => {
  try {
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
  timeZoneName: 'short' | 'long',
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

  return `${sign}${hours}:${String(minutes).padStart(2, '0')}`
}

const options = _reduce(
  Object.entries(timezones),
  (selectOptions: any[], zone) => {
    const offsetMinutes = getTimezoneOffsetMinutes(zone[0])
    const hr = formatOffset(offsetMinutes)
    const label = `(GMT${_includes(hr, '-') ? hr : `+${hr}`}) ${zone[1]}`

    selectOptions.push({
      value: zone[0],
      label,
      offset: offsetMinutes / 60,
      abbrev: getTimezoneName(zone[0], 'short'),
      altName: getTimezoneName(zone[0], 'long'),
    })

    return selectOptions
  },
  [],
).sort((a, b) => a.offset - b.offset)

interface TimezoneSelectProps {
  value:
    | string
    | {
        value: string
        label: string
      }
  onChange: (item: string) => void
}

const TimezoneSelect = ({ value, onChange }: TimezoneSelectProps) => {
  const labelExtractor = (option: { label: string }) => option?.label
  const keyExtractor = (option: { value: string }) => option?.value

  const handleChange = (item: any) => {
    const key = keyExtractor(item)
    onChange(key)
  }

  const parseTimezone = (
    zone:
      | string
      | {
          value: string
          label: string
        },
  ) => {
    if (typeof zone === 'object' && zone.value && zone.label) {
      return zone
    }

    if (typeof zone === 'string') {
      return _find(options, (tz) => tz.value === zone)
    }

    if (zone.value && !zone.label) {
      return _find(options, (tz) => tz.value === zone.value)
    }

    return null
  }

  return (
    <Select
      title={labelExtractor(parseTimezone(value))}
      className='w-full'
      items={options}
      labelExtractor={labelExtractor}
      // @ts-expect-error
      keyExtractor={keyExtractor}
      onSelect={handleChange}
      capitalise
      selectedItem={parseTimezone(value)}
    />
  )
}

export default TimezoneSelect
