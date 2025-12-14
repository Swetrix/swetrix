import { ChevronLeftIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { cn } from '~/utils/generic'

interface BackButtonLinkProps {
  to: string
  onClick?: never
  className?: string
}

interface BackButtonCallbackProps {
  to?: never
  onClick: () => void
  className?: string
}

type BackButtonProps = BackButtonLinkProps | BackButtonCallbackProps

export const BackButton = ({ to, onClick, className }: BackButtonProps) => {
  const { t } = useTranslation('common')

  const buttonClasses = cn(
    'rounded-md border border-transparent p-2 hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200',
    className,
  )

  if (onClick) {
    return (
      <button type='button' title={t('common.back')} onClick={onClick} className={buttonClasses}>
        <ChevronLeftIcon className='h-5 w-5 text-gray-700 dark:text-gray-50' />
      </button>
    )
  }

  return (
    <Link to={to!} title={t('common.back')} className={buttonClasses}>
      <ChevronLeftIcon className='h-5 w-5 text-gray-700 dark:text-gray-50' />
    </Link>
  )
}
