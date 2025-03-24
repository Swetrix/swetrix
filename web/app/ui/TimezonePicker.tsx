import _find from 'lodash/find'
import _includes from 'lodash/includes'
import _reduce from 'lodash/reduce'
import { useTranslation } from 'react-i18next'
import spacetime from 'spacetime'
import soft from 'timezone-soft'

import timezones from '~/lib/constants/timezones'

import Select from './Select'

const options = _reduce(
  Object.entries(timezones),
  (selectOptions: any[], zone) => {
    const now = spacetime.now(zone[0])
    const tz = now.timezone()
    const tzStrings = soft(zone[0])

    const abbr = now.isDST() ? tzStrings[0].daylight?.abbr : tzStrings[0].standard?.abbr
    const altName = now.isDST() ? tzStrings[0].daylight?.name : tzStrings[0].standard?.name

    const min = tz.current.offset * 60

    const hr = `${(min / 60) ^ 0}:` + (min % 60 === 0 ? '00' : Math.abs(min % 60))
    const label = `(GMT${_includes(hr, '-') ? hr : `+${hr}`}) ${zone[1]}`

    selectOptions.push({
      value: tz.name,
      label,
      offset: tz.current.offset,
      abbrev: abbr,
      altName,
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
  const { t } = useTranslation('common')
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
      label={t('profileSettings.timezoneDesc')}
      className='w-full'
      items={options}
      labelExtractor={labelExtractor}
      // @ts-expect-error
      keyExtractor={keyExtractor}
      onSelect={handleChange}
      capitalise
    />
  )
}

export default TimezoneSelect
