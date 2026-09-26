import cx from 'clsx'
import React from 'react'
import { useTranslation } from 'react-i18next'

interface LoadingBarProps {
  className?: string
}

const LoadingBar: React.FC<LoadingBarProps> = ({ className }) => {
  const { t } = useTranslation('common')

  return (
    <div
      className={cx(
        'fixed top-0 right-0 left-0 z-50 h-0.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/70',
        className,
      )}
    >
      <progress className='sr-only' aria-label={t('common.loading')} />
      <div className='indeterminate-bar absolute inset-y-0 left-0 w-[42%] rounded-full bg-linear-to-r from-slate-400 via-slate-900 to-slate-400 will-change-transform dark:from-slate-500 dark:via-white dark:to-slate-500' />
    </div>
  )
}

export default LoadingBar
