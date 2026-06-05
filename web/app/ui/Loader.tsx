import { useTranslation } from 'react-i18next'

import Spin from './icons/Spin'
import { cn } from '~/utils/generic'

interface LoaderProps {
  className?: string
  label?: string
  labelClassName?: string
  showLabel?: boolean
  spinnerAlwaysLight?: boolean
  spinnerClassName?: string
}

const Loader = ({
  className,
  label,
  labelClassName,
  showLabel,
  spinnerAlwaysLight,
  spinnerClassName,
}: LoaderProps) => {
  const { t } = useTranslation('common')
  const resolvedLabel = label ?? t('common.loading')

  return (
    <output
      className={cn('flex items-center justify-center pt-10', className)}
      aria-live='polite'
    >
      <Spin
        alwaysLight={spinnerAlwaysLight}
        className={cn('mr-0! ml-0!', spinnerClassName)}
      />
      <span
        className={cn(
          showLabel ? 'text-sm font-medium' : 'sr-only',
          labelClassName,
        )}
      >
        {resolvedLabel}
      </span>
    </output>
  )
}

export default Loader
