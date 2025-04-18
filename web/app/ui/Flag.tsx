import _includes from 'lodash/includes'
import _toLower from 'lodash/toLower'
import React from 'react'

interface FlagProps extends React.HTMLAttributes<HTMLImageElement> {
  country: string
  size?: number
  alt?: string
}

const FLAGS_PREFIX_PATH = '/assets/flags'

const MISSING_FLAGS = ['t1']

const Flag = ({ country, size = 24, alt, ...props }: FlagProps) => {
  const countryLower = _toLower(country)

  if (_includes(MISSING_FLAGS, countryLower)) {
    return <span className={props.className}>{country}</span>
  }

  return (
    <img
      src={`${FLAGS_PREFIX_PATH}/${countryLower}.svg`}
      alt={alt || `Flag of ${country}`}
      {...props}
      width={size}
      height={size}
    />
  )
}

export default Flag
