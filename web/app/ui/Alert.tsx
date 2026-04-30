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
    containerClass:
      'bg-sky-50/80 ring-1 ring-sky-200/70 ring-inset dark:bg-sky-500/10 dark:ring-sky-400/20',
    iconClass: 'text-sky-600 dark:text-sky-400',
    titleClass: 'text-sky-900 dark:text-sky-100',
    textClass: 'text-sky-800 dark:text-sky-200',
  },
  warning: {
    icon: WarningIcon,
    containerClass:
      'bg-amber-50/80 ring-1 ring-amber-200/70 ring-inset dark:bg-amber-500/10 dark:ring-amber-400/20',
    iconClass: 'text-amber-600 dark:text-amber-400',
    titleClass: 'text-amber-900 dark:text-amber-100',
    textClass: 'text-amber-800 dark:text-amber-200',
  },
  error: {
    icon: WarningCircleIcon,
    containerClass:
      'bg-red-50/80 ring-1 ring-red-200/70 ring-inset dark:bg-red-500/10 dark:ring-red-400/20',
    iconClass: 'text-red-600 dark:text-red-400',
    titleClass: 'text-red-900 dark:text-red-100',
    textClass: 'text-red-800 dark:text-red-200',
  },
  success: {
    icon: CheckCircleIcon,
    containerClass:
      'bg-emerald-50/80 ring-1 ring-emerald-200/70 ring-inset dark:bg-emerald-500/10 dark:ring-emerald-400/20',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    titleClass: 'text-emerald-900 dark:text-emerald-100',
    textClass: 'text-emerald-800 dark:text-emerald-200',
  },
  tip: {
    icon: LightbulbIcon,
    containerClass:
      'bg-emerald-50/80 ring-1 ring-emerald-200/70 ring-inset dark:bg-emerald-500/10 dark:ring-emerald-400/20',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    titleClass: 'text-emerald-900 dark:text-emerald-100',
    textClass: 'text-emerald-800 dark:text-emerald-200',
  },
}

const Alert = ({ variant, title, children, className }: AlertProps) => {
  const {
    icon: Icon,
    containerClass,
    iconClass,
    titleClass,
    textClass,
  } = variantConfig[variant]

  return (
    <div
      role={variant === 'error' || variant === 'warning' ? 'alert' : 'status'}
      className={cx(
        'flex w-full items-start rounded-lg px-3.5 py-2.5 text-sm',
        containerClass,
        className,
      )}
    >
      <Icon
        className={cx('mt-0.5 mr-2.5 size-4 shrink-0', iconClass)}
        weight='duotone'
        aria-hidden='true'
      />
      <div className={cx('flex grow flex-col gap-y-0.5', textClass)}>
        {title && (
          <span className={cx('font-semibold', titleClass)}>{title}</span>
        )}
        <div>{children}</div>
      </div>
    </div>
  )
}

export default Alert
