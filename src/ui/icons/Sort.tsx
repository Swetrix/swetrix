import React from 'react'
import { BarsArrowUpIcon, BarsArrowDownIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline'

const Sort = ({ sortByAscend, sortByDescend, onClick }: {
  sortByAscend?: boolean,
  sortByDescend?: boolean,
  onClick?: () => void
}): JSX.Element => {
  if (sortByAscend) {
    return (
      <BarsArrowUpIcon onClick={onClick} className='w-6 h-6' />
    )
  }

  if (sortByDescend) {
    return (
      <BarsArrowDownIcon onClick={onClick} className='w-6 h-6' />
    )
  }

  return (
    <ChevronUpDownIcon onClick={onClick} className='w-6 h-6' />
  )
}

Sort.defaultProps = {
  sortByAscend: undefined,
  sortByDescend: undefined,
  onClick: () => {},
}

export default Sort
