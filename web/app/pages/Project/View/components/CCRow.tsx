import React, { memo } from 'react'
import countries from '~/utils/isoCountries'
import Flag from '~/ui/Flag'

interface CCRowProps {
  cc: string
  name?: string
  language: string
  size?: number
}

const CCRow = ({ cc, name, language, size = 21 }: CCRowProps) => (
  <>
    <Flag className='rounded-xs' country={cc} size={size} alt='' aria-hidden='true' />
    &nbsp;
    {name || countries.getName(cc, language)}
  </>
)

export default memo(CCRow)
