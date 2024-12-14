import React from 'react'
import { useTranslation } from 'react-i18next'
import cx from 'clsx'

import Button from '~/ui/Button'
import GoogleGSVG from '~/ui/icons/GoogleG'

interface GoogleAuthProps {
  onClick: () => void
  isMiniButton?: boolean
  className?: string
  disabled?: boolean
}

const GoogleAuth = ({ onClick, isMiniButton, className, disabled }: GoogleAuthProps) => {
  const { t } = useTranslation()

  if (isMiniButton) {
    return (
      <Button
        title={t('auth.common.continueWithGoogle')}
        className={cx(
          className,
          'bg-transparent ring-1 ring-slate-300 hover:bg-slate-100 dark:ring-slate-700 dark:hover:bg-slate-800/60',
        )}
        onClick={onClick}
        disabled={disabled}
        secondary
        regular
      >
        <GoogleGSVG className='size-5' />
      </Button>
    )
  }

  return (
    <Button
      className={cx(
        className,
        'flex items-center justify-center border-indigo-100 dark:border-slate-700/50 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700',
      )}
      onClick={onClick}
      secondary
      regular
      disabled={disabled}
    >
      <>
        <GoogleGSVG className='mr-2 size-5' />
        {t('auth.common.google')}
      </>
    </Button>
  )
}

export default GoogleAuth
