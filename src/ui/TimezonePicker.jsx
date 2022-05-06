import React from 'react'
import spacetime from 'spacetime'
import soft from 'timezone-soft'
import { allTimezones } from 'react-timezone-select'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import _find from 'lodash/find'

import Select from './Select'

const options = Object.entries(allTimezones)
  .reduce((selectOptions, zone) => {
    const now = spacetime.now(zone[0])
    const tz = now.timezone()
    const tzStrings = soft(zone[0])

    let abbr = now.isDST() ? tzStrings[0].daylight?.abbr : tzStrings[0].standard?.abbr
    let altName = now.isDST() ? tzStrings[0].daylight?.name : tzStrings[0].standard?.name

    const min = tz.current.offset * 60
    const hr = `${(min / 60) ^ 0}:` + (min % 60 === 0 ? '00' : Math.abs(min % 60))
    const label = `(GMT${hr.includes('-') ? hr : `+${hr}`}) ${zone[1]}`

    selectOptions.push({
      value: tz.name,
      label: label,
      offset: tz.current.offset,
      abbrev: abbr,
      altName: altName,
    })

    return selectOptions
  }, [])
  .sort((a, b) => a.offset - b.offset)

const TimezoneSelect = ({
  value, onChange,
}) => {
  const { t } = useTranslation('common')
  const labelExtractor = (option) => option?.label
  const keyExtractor = (option) => option?.value

  const handleChange = (label) => {
    const tz = _find(options, tz => labelExtractor(tz) === label)
    const key = keyExtractor(tz)
    onChange(key)
  }

  const parseTimezone = (zone) => {
    if (typeof zone === 'object' && zone.value && zone.label) return zone
    if (typeof zone === 'string') {
      return _find(options, tz => tz.value === zone)
    } else if (zone.value && !zone.label) {
      return _find(options, tz => tz.value === zone.value)
    }
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
    />
  )
}

TimezoneSelect.propTypes = {
  value: PropTypes.oneOfType([
    PropTypes.string, PropTypes.object,
  ]).isRequired,
  onChange: PropTypes.func,
}

TimezoneSelect.defaultProps = {
  onChange: () => { },
}

export default TimezoneSelect
