import React from 'react'
import { useTranslation } from 'react-i18next'

import Button from 'ui/Button'
import GoogleGSVG from 'ui/icons/GoogleG'


interface IGoogleAuth {
  setIsLoading: (isLoading: boolean) => void,
  authSSO: any, // TODO add types
  dontRemember?: boolean,
}

const GoogleAuth: React.FC<IGoogleAuth> = ({ setIsLoading, authSSO, dontRemember }) => {
  const { t } = useTranslation()

  const googleLogin = async () => {
    setIsLoading(true)
    authSSO(dontRemember, t, () => {
      setIsLoading(false)
    })
  }

  return (
    <Button
      className='mr-2 border-indigo-100 dark:text-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600'
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

export default GoogleAuth
