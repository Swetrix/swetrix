import React from 'react'
import { useTranslation } from 'react-i18next'

import Button from 'ui/Button'
import GoogleGSVG from 'ui/icons/GoogleG'

interface IGoogleAuth {
  setIsLoading: (isLoading: boolean) => void,
  authSSO: (dontRemember: boolean, t: (key: string) => string, callback: (res: any) => void) => void
  callback?: any,
  dontRemember?: boolean,
  isMiniButton?: boolean,
}

const GoogleAuth: React.FC<IGoogleAuth> = ({
  setIsLoading, authSSO, dontRemember, callback, isMiniButton,
}) => {
  const { t } = useTranslation()

  const googleLogin = async () => {
    setIsLoading(true)
    authSSO(
      dontRemember as boolean,
      t,
      callback,
    )
  }

  if (isMiniButton) {
    <Button
      className='border-indigo-100 dark:text-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600'
      onClick={googleLogin}
      secondary
      regular
    >
      <GoogleGSVG className='w-5 h-5 mr-2' />
    </Button>
  }

  return (
    <Button
      className='border-indigo-100 dark:text-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600'
      onClick={googleLogin}
      secondary
      regular
    >
      <>
        <GoogleGSVG className='w-5 h-5 mr-2' />
        {t('auth.common.continueWithGoogle')}
      </>
    </Button>
  )
}

GoogleAuth.defaultProps = {
  dontRemember: false,
  isMiniButton: false,
  callback: () => { },
}

export default GoogleAuth
