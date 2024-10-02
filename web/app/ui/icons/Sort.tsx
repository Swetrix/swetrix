import React from 'react'
import { ChevronUpDownIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import cx from 'clsx'

interface ISort {
  sortByAscend?: boolean
  sortByDescend?: boolean
  className?: string
}

const Sort: React.FC<ISort> = ({ sortByAscend, sortByDescend, className }: ISort): JSX.Element => {
  if (sortByAscend) {
    return <ChevronUpIcon className={cx(className, 'h-4 w-4')} />
  }

  if (sortByDescend) {
    return <ChevronDownIcon className={cx(className, 'h-4 w-4')} />
  }

  return <ChevronUpDownIcon className={cx(className, 'h-4 w-4')} />
}

export default Sort
