import { SpinnerIcon } from '@phosphor-icons/react'
import { cn } from '~/utils/generic'

interface SpinProps {
  className?: string
  alwaysLight?: boolean
  inherit?: boolean
}

const Spin = ({ className, alwaysLight, inherit }: SpinProps) => (
  <SpinnerIcon
    className={cn(
      'mr-2 -ml-1 h-4 w-4 animate-spin',
      {
        'text-current': inherit,
        'text-slate-900 dark:text-white': !alwaysLight && !inherit,
        'text-white': alwaysLight && !inherit,
      },
      className,
    )}
  />
)

export default Spin
