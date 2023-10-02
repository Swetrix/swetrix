import React from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import cx from 'clsx'

import Button from 'ui/Button'
import { StateType } from 'redux/store/index'
import GithubDarkSVG from 'ui/icons/GithubDark'
import GithubLightSVG from 'ui/icons/GithubLight'
import { SSO_PROVIDERS, isBrowser } from 'redux/constants'

interface IGoogleAuth {
  setIsLoading: (isLoading: boolean) => void,
  authSSO: (provider: string, dontRemember: boolean, t: (key: string) => string, callback: (res: any) => void) => void
  ssrTheme: string,
  callback?: any,
  dontRemember?: boolean,
  isMiniButton?: boolean,
  className?: string
}

const GithubAuth: React.FC<IGoogleAuth> = ({
  setIsLoading, authSSO, dontRemember, callback, isMiniButton, className, ssrTheme,
}) => {
  const { t } = useTranslation()
  const reduxTheme = useSelector((state: StateType) => state.ui.theme.theme)
  const theme = isBrowser ? reduxTheme : ssrTheme

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
        className={cx(className, 'ring-1 ring-slate-300 bg-transparent hover:bg-slate-100 dark:ring-slate-700 dark:hover:bg-slate-800/60')}
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
      className={cx(className, 'flex items-center justify-center border-indigo-100 dark:text-gray-50 dark:border-slate-700/50 dark:bg-slate-800 dark:hover:bg-slate-700')}
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
        {t('auth.common.github')}
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
