import React from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import cx from 'clsx'

import Button from 'ui/Button'
import { StateType } from 'redux/store/index'
import GithubDarkSVG from 'ui/icons/GithubDark'
import GithubLightSVG from 'ui/icons/GithubLight'
import { SSO_PROVIDERS } from 'redux/constants'

interface IGoogleAuth {
  setIsLoading: (isLoading: boolean) => void,
  authSSO: (provider: string, dontRemember: boolean, t: (key: string) => string, callback: (res: any) => void) => void
  callback?: any,
  dontRemember?: boolean,
  isMiniButton?: boolean,
  className?: string
}

const GithubAuth: React.FC<IGoogleAuth> = ({
  setIsLoading, authSSO, dontRemember, callback, isMiniButton, className,
}) => {
  const { t } = useTranslation()
  const { theme } = useSelector((state: StateType) => state.ui.theme)

  const googleLogin = async () => {
    setIsLoading(true)
    authSSO(
      SSO_PROVIDERS.GITHUB,
      dontRemember as boolean,
      t,
      callback,
    )
  }

  if (isMiniButton) {
    return (
      <Button
        className={cx(className, 'border-indigo-100 dark:text-gray-50 dark:border-gray-700 dark:bg-slate-800 dark:hover:bg-slate-700')}
        onClick={googleLogin}
        secondary
        regular
      >
        {theme === 'dark' ? (
          <GithubLightSVG className='w-5 h-5' />
        ) : (
          <GithubDarkSVG className='w-5 h-5' />
        )}
      </Button>
    )
  }

  return (
    <Button
      className={cx(className, 'border-indigo-100 dark:text-gray-50 dark:border-gray-700 dark:bg-slate-800 dark:hover:bg-slate-700')}
      onClick={googleLogin}
      secondary
      regular
    >
      <>
        {theme === 'dark' ? (
          <GithubLightSVG className='w-5 h-5 mr-2' />
        ) : (
          <GithubDarkSVG className='w-5 h-5 mr-2' />
        )}
        {t('auth.common.continueWithGithub')}
      </>
    </Button>
  )
}

GithubAuth.defaultProps = {
  dontRemember: false,
  isMiniButton: false,
  callback: () => { },
  className: '',
}

export default GithubAuth
