import React, { memo } from 'react'
import Flag from 'react-flagkit'
import countries from 'utils/isoCountries'
import PropTypes from 'prop-types'

/**
 * Component to render country flag in the 'Countries' panel.
 *
 * @param {string} rowName - The country code.
 * @param {string} language - Language to use for country name.
 * @returns {JSX.Element}
 */
const CCRow = ({ rowName, language }) => (
  <>
    <Flag
      className='rounded-sm'
      country={rowName}
      size={21}
      alt=''
    />
    &nbsp;&nbsp;
    {countries.getName(rowName, language)}
  </>
)

CCRow.propTypes = {
  rowName: PropTypes.string.isRequired,
  language: PropTypes.string.isRequired,
}

export default memo(CCRow)
