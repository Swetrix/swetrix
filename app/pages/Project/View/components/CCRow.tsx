import React, { memo } from 'react'
import Flag from 'react-flagkit'
import _fill from 'lodash/fill'
import countries from 'utils/isoCountries'

interface ICCRow {
  cc: string
  name?: string
  language: string
  size?: number
  spaces?: number
}

const CCRow = ({ cc, name, language, size = 21, spaces = 2 }: ICCRow): JSX.Element => (
  <>
    <Flag className='rounded-sm' country={cc} size={size} alt='' aria-hidden='true' />
    <span
      dangerouslySetInnerHTML={{
        __html: _fill(Array(spaces), '&nbsp;').join(''),
      }}
    />
    {name || countries.getName(cc, language)}
  </>
)

export default memo(CCRow)
