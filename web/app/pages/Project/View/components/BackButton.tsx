import { CaretLeftIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { cn } from '~/utils/generic'

interface BackButtonLinkProps {
  to: string
  onClick?: never
  className?: string
  label?: string
}

interface BackButtonCallbackProps {
  to?: never
  onClick: () => void
  className?: string
  label?: string
}

type BackButtonProps = BackButtonLinkProps | BackButtonCallbackProps

export const BackButton = ({
  to,
  onClick,
  className,
  label,
}: BackButtonProps) => {
  const { t } = useTranslation('common')
  const backLabel = label || t('common.goBack')

  const buttonClasses = cn(
    'flex items-center gap-2 rounded-md border border-transparent p-2 transition-colors ring-inset hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-slate-900 focus:outline-hidden hover:dark:border-slate-700/80 dark:hover:bg-slate-900 dark:focus:ring-slate-300',
    className,
  )

  const content = (
    <>
      <CaretLeftIcon className='h-5 w-5 text-gray-700 dark:text-gray-50' />
      <span className='text-sm font-medium text-gray-700 dark:text-gray-50'>
        {backLabel}
      </span>
    </>
  )

  if (onClick) {
    return (
      <button
        type='button'
        title={backLabel}
        onClick={onClick}
        className={buttonClasses}
      >
        {content}
      </button>
    )
  }

  return (
    <Link to={to!} title={backLabel} className={buttonClasses}>
      {content}
    </Link>
  )
}
