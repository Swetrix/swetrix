import {
  ChevronUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import cx from 'clsx'

interface SortProps {
  sortByAscend: boolean | null
  sortByDescend: boolean | null
  className?: string
}

const Sort = ({ sortByAscend, sortByDescend, className }: SortProps) => {
  if (sortByAscend) {
    return <ChevronUpIcon className={cx(className, 'h-4 w-4')} />
  }

  if (sortByDescend) {
    return <ChevronDownIcon className={cx(className, 'h-4 w-4')} />
  }

  return <ChevronUpDownIcon className={cx(className, 'h-4 w-4')} />
}

export default Sort
