import React from 'react'
import spacetime from 'spacetime'
import soft from 'timezone-soft'
import { allTimezones } from 'react-timezone-select'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import _find from 'lodash/find'
import _reduce from 'lodash/reduce'
import _includes from 'lodash/includes'

import Select from './Select'

const options = _reduce(
  Object.entries(allTimezones),
  (selectOptions: any[], zone) => {
    const now = spacetime.now(zone[0])
    const tz = now.timezone()
    const tzStrings = soft(zone[0])

    const abbr = now.isDST() ? tzStrings[0].daylight?.abbr : tzStrings[0].standard?.abbr
    const altName = now.isDST() ? tzStrings[0].daylight?.name : tzStrings[0].standard?.name

    const min = tz.current.offset * 60
    // eslint-disable-next-line prefer-template
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

interface ITimezoneSelect {
  value:
    | string
    | {
        value: string
        label: string
      }
  onChange: (item: string) => void
}

const TimezoneSelect = ({ value, onChange }: ITimezoneSelect): JSX.Element => {
  const {
    t,
  }: {
    t: (key: string) => string
  } = useTranslation('common')
  const labelExtractor = (option: { label: string }) => option?.label
  const keyExtractor = (option: { value: string }) => option?.value

  const handleChange = (label: string) => {
    const tz = _find(options, (timezone) => labelExtractor(timezone) === label)
    const key = keyExtractor(tz)
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
      keyExtractor={keyExtractor}
      onSelect={handleChange}
      capitalise
    />
  )
}

TimezoneSelect.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  onChange: PropTypes.func,
}

TimezoneSelect.defaultProps = {
  onChange: () => {},
}

export default TimezoneSelect
