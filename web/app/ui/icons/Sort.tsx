import {
  CaretUpDownIcon,
  CaretUpIcon,
  CaretDownIcon,
} from '@phosphor-icons/react'
import cx from 'clsx'

interface SortProps {
  sortByAscend: boolean | null
  sortByDescend: boolean | null
  className?: string
}

const Sort = ({ sortByAscend, sortByDescend, className }: SortProps) => {
  if (sortByAscend) {
    return <CaretUpIcon className={cx(className, 'h-4 w-4')} />
  }

  if (sortByDescend) {
    return <CaretDownIcon className={cx(className, 'h-4 w-4')} />
  }

  return <CaretUpDownIcon className={cx(className, 'h-4 w-4')} />
}

export default Sort
