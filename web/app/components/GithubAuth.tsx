import React from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import cx from 'clsx'

import Button from 'ui/Button'
import { StateType } from 'lib/store/index'
import GithubDarkSVG from 'ui/icons/GithubDark'
import GithubLightSVG from 'ui/icons/GithubLight'
import { isBrowser } from 'lib/constants'

interface GoogleAuthProps {
  ssrTheme: string
  isMiniButton?: boolean
  className?: string
  onClick: () => void
  disabled?: boolean
}

const GithubAuth = ({ isMiniButton, className, ssrTheme, onClick, disabled }: GoogleAuthProps) => {
  const { t } = useTranslation()
  const reduxTheme = useSelector((state: StateType) => state.ui.theme.theme)
  const theme = isBrowser ? reduxTheme : ssrTheme

  if (isMiniButton) {
    return (
      <Button
        title={t('auth.common.continueWithGithub')}
        className={cx(
          className,
          'bg-transparent ring-1 ring-slate-300 hover:bg-slate-100 dark:ring-slate-700 dark:hover:bg-slate-800/60',
        )}
        onClick={onClick}
        secondary
        regular
        disabled={disabled}
      >
        {theme === 'dark' ? <GithubLightSVG className='size-5' /> : <GithubDarkSVG className='size-5' />}
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
        {theme === 'dark' ? <GithubLightSVG className='mr-2 size-5' /> : <GithubDarkSVG className='mr-2 size-5' />}
        {t('auth.common.github')}
      </>
    </Button>
  )
}

export default GithubAuth
