import cx from 'clsx'
import {
  InfoIcon,
  WarningIcon,
  WarningCircleIcon,
  CheckCircleIcon,
  LightbulbIcon,
} from '@phosphor-icons/react'

type AlertVariant = 'info' | 'warning' | 'error' | 'success' | 'tip'

interface AlertProps {
  variant: AlertVariant
  title?: string
  children: React.ReactNode
  className?: string
}

const variantConfig: Record<
  AlertVariant,
  {
    icon: React.ElementType
    containerClass: string
    iconClass: string
    titleClass: string
    textClass: string
  }
> = {
  info: {
    icon: InfoIcon,
    containerClass: 'bg-sky-50 dark:bg-sky-900/50',
    iconClass: 'text-sky-600 dark:text-sky-400',
    titleClass: 'text-sky-900 dark:text-sky-50',
    textClass: 'text-sky-800 dark:text-sky-50',
  },
  warning: {
    icon: WarningIcon,
    containerClass: 'bg-amber-50 dark:bg-amber-900/50',
    iconClass: 'text-amber-600 dark:text-amber-400',
    titleClass: 'text-amber-900 dark:text-amber-50',
    textClass: 'text-amber-800 dark:text-amber-50',
  },
  error: {
    icon: WarningCircleIcon,
    containerClass: 'bg-red-50 dark:bg-red-900/50',
    iconClass: 'text-red-600 dark:text-red-400',
    titleClass: 'text-red-900 dark:text-red-50',
    textClass: 'text-red-800 dark:text-red-50',
  },
  success: {
    icon: CheckCircleIcon,
    containerClass: 'bg-green-50 dark:bg-emerald-900/50',
    iconClass: 'text-green-600 dark:text-emerald-400',
    titleClass: 'text-green-900 dark:text-emerald-50',
    textClass: 'text-green-800 dark:text-emerald-50',
  },
  tip: {
    icon: LightbulbIcon,
    containerClass: 'bg-green-50 dark:bg-emerald-900/50',
    iconClass: 'text-green-600 dark:text-emerald-400',
    titleClass: 'text-green-900 dark:text-green-50',
    textClass: 'text-green-800 dark:text-green-50',
  },
}

export const Alert = ({ variant, title, children, className }: AlertProps) => {
  const {
    icon: Icon,
    containerClass,
    iconClass,
    titleClass,
    textClass,
  } = variantConfig[variant]

  return (
    <div
      className={cx(
        'flex w-full rounded-lg px-3 py-2 text-sm',
        containerClass,
        className,
      )}
    >
      <Icon
        className={cx('mt-0.5 mr-2 size-4 shrink-0', iconClass)}
        weight='duotone'
        aria-hidden='true'
      />
      <div className={cx('flex grow flex-col gap-y-1', textClass)}>
        {title && (
          <span className={cx('font-semibold', titleClass)}>{title}</span>
        )}
        <div>{children}</div>
      </div>
    </div>
  )
}

export default Alert
