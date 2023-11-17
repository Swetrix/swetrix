import React, { memo } from 'react'
import Flag from 'react-flagkit'
import countries from 'utils/isoCountries'

interface ICCRow {
  cc: string
  name?: string
  language: string
}

/**
 * Component to render country flag in the 'Countries' panel.
 *
 * @param {string} cc - The country code.
 * @param {string} name - Row name to override country name with.
 * @param {string} language - Language to use for country name.
 * @returns {JSX.Element}
 */
const CCRow = ({ cc, name, language }: ICCRow): JSX.Element => (
  <>
    <Flag
      className='rounded-sm'
      country={cc}
      size={21}
      alt=''
      aria-hidden='true'
    />
    &nbsp;
    {name || countries.getName(cc, language)}
  </>
)

CCRow.defaultProps = {
  name: null,
}

export default memo(CCRow)
