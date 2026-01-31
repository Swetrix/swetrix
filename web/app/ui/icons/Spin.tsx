import { SpinnerIcon } from '@phosphor-icons/react'
import { cn } from '~/utils/generic'

interface SpinProps {
  className?: string
  alwaysLight?: boolean
}

const Spin = ({ className, alwaysLight }: SpinProps) => (
  <SpinnerIcon
    className={cn(
      'mr-2 -ml-1 h-4 w-4 animate-spin text-slate-900 dark:text-white',
      {
        'text-slate-900 dark:text-white': !alwaysLight,
        'text-white': alwaysLight,
      },
      className,
    )}
  />
)

export default Spin
