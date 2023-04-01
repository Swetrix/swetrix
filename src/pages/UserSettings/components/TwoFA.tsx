import React, { useState, memo } from 'react'
import QRCode from 'react-qr-code'
import { useTranslation } from 'react-i18next'
import cx from 'clsx'
import _isNull from 'lodash/isNull'
import _isString from 'lodash/isString'

import Input from 'ui/Input'
import Button from 'ui/Button'
import {
  generate2FA, enable2FA, disable2FA,
} from 'api'
import { setAccessToken } from 'utils/accessToken'
import { setRefreshToken } from 'utils/refreshToken'
import { IUser } from 'redux/models/IUser'

const TwoFA = ({
  user, dontRemember, updateUserData, genericError,
}: {
  user: IUser,
  dontRemember: boolean,
  updateUserData: (data: Partial<IUser>) => void,
  genericError: (message: string) => void,
}): JSX.Element => {
  const { t }: {
    t: (key: string, options?: {
      [key: string]: string | number,
    }) => string,
  } = useTranslation('common')
  const [twoFAConfigurating, setTwoFAConfigurating] = useState<boolean>(false)
  const [twoFADisabling, setTwoFADisabling] = useState<boolean>(false)
  const [twoFAConfigData, setTwoFAConfigData] = useState<{
    secret?: string,
    otpauthUrl?: string,
  }>({}) // { secret, otpauthUrl }
  const [isTwoFaLoading, setIsTwoFaLoading] = useState<boolean>(false)
  const [twoFACode, setTwoFACode] = useState('')
  const [twoFACodeError, setTwoFACodeError] = useState<string | null>(null)
  const [twoFARecovery, setTwoFARecovery] = useState<string | null>(null)
  const { isTwoFactorAuthenticationEnabled } = user

  const handle2FAInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { target: { value } } = event
    setTwoFACode(value)
    setTwoFACodeError(null)
  }

  const _generate2FA = async () => {
    if (!isTwoFaLoading) {
      setIsTwoFaLoading(true)

      try {
        const result = await generate2FA()
        setTwoFAConfigurating(true)
        setTwoFAConfigData(result)
      } catch (e) {
        if (_isString(e)) {
          genericError(e)
        } else {
          genericError(t('apiNotifications.generate2FAError'))
        }
        console.error(`[ERROR] Failed to generate 2FA: ${e}`)
        setTwoFAConfigurating(false)
        setTwoFAConfigData({})
      }

      setIsTwoFaLoading(false)
    }
  }

  const _enable2FA = async () => {
    if (!isTwoFaLoading) {
      setIsTwoFaLoading(true)

      try {
        const { twoFactorRecoveryCode, accessToken, refreshToken } = await enable2FA(twoFACode)
        setRefreshToken(refreshToken)
        setAccessToken(accessToken, dontRemember)
        updateUserData({ isTwoFactorAuthenticationEnabled: true })
        setTwoFARecovery(twoFactorRecoveryCode)
      } catch (e) {
        if (_isString(e)) {
          genericError(e)
        }
        setTwoFACodeError(t('profileSettings.invalid2fa'))
      }

      setTwoFACode('')
      setIsTwoFaLoading(false)
    }
  }

  const _disable2FA = async () => {
    if (!isTwoFaLoading) {
      setIsTwoFaLoading(true)

      try {
        await disable2FA(twoFACode)
        updateUserData({ isTwoFactorAuthenticationEnabled: false })
      } catch (e) {
        if (_isString(e)) {
          genericError(e)
        }
        setTwoFACodeError(t('profileSettings.invalid2fa'))
      }

      setTwoFACode('')
      setIsTwoFaLoading(false)
    }
  }

  const callFnOnKeyPress = (fn: (e: any) => void, key = 'Enter') => (e: any) => {
    e.stopPropagation()
    if (e.key === key) {
      fn(e)
    }
  }

  const recoverySaved = () => {
    setTwoFARecovery(null)
    setTwoFAConfigurating(false)
  }

  if (twoFARecovery) {
    return (
      <div className='max-w-prose'>
        <p className='text-base text-gray-900 dark:text-gray-50'>
          {t('profileSettings.2faRecoveryNote')}
        </p>
        <Input type='text' className='mt-4' value={twoFARecovery} />
        <Button onClick={recoverySaved} primary large>
          {t('profileSettings.2faRecoverySaved')}
        </Button>
      </div>
    )
  }

  if (isTwoFactorAuthenticationEnabled) {
    if (twoFADisabling) {
      return (
        <>
          <p className='text-base max-w-prose text-gray-900 dark:text-gray-50'>
            {t('profileSettings.2faDisableHint')}
          </p>
          <div className='flex items-center mt-4'>
            <Input
              type='text'
              label={t('profileSettings.enter2faToDisable')}
              value={twoFACode}
              placeholder={t('profileSettings.yourOneTimeCode')}
              className='sm:col-span-3'
              onChange={handle2FAInput}
              onKeyDown={callFnOnKeyPress(_disable2FA)}
              error={twoFACodeError}
              disabled={isTwoFaLoading}
            />
            <Button
              className={cx('ml-2', {
                'mt-4': _isNull(twoFACodeError),
                'mb-1': !_isNull(twoFACodeError),
              })}
              onClick={_disable2FA}
              loading={isTwoFaLoading}
              danger
              large
            >
              {t('common.disable')}
            </Button>
          </div>
        </>
      )
    }

    return (
      <>
        <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>
          {t('profileSettings.2faEnabled')}
        </p>
        <Button className='mt-4' onClick={() => setTwoFADisabling(true)} danger large>
          {t('profileSettings.2faDisableBtn')}
        </Button>
      </>
    )
  }

  if (twoFAConfigurating) {
    return (
      <>
        <p className='text-base max-w-prose text-gray-900 dark:text-gray-50'>
          {t('profileSettings.2faDesc')}
        </p>
        <div className='mt-4 p-4 bg-white w-max'>
          <QRCode value={twoFAConfigData?.otpauthUrl || ''} />
        </div>
        <p className='text-base whitespace-pre-line mt-2 text-gray-900 dark:text-gray-50'>
          {t('profileSettings.2faQRAlt', { key: twoFAConfigData?.secret || '' })}
        </p>
        <div className='flex items-center mt-4'>
          <Input
            type='text'
            label={t('profileSettings.enter2faToEnable')}
            value={twoFACode}
            placeholder={t('profileSettings.yourOneTimeCode')}
            className='sm:col-span-3'
            onChange={handle2FAInput}
            onKeyDown={callFnOnKeyPress(_enable2FA)}
            error={twoFACodeError}
            disabled={isTwoFaLoading}
          />
          <Button
            className={cx('ml-2', {
              'mt-8  xs:mt-4': _isNull(twoFACodeError),
              'mb-1': !_isNull(twoFACodeError),
            })}
            onClick={_enable2FA}
            loading={isTwoFaLoading}
            primary
            large
          >
            {t('common.enable')}
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>
        {t('profileSettings.2faEnable')}
      </p>
      <Button className='mt-4' onClick={_generate2FA} loading={isTwoFaLoading} primary large>
        {t('profileSettings.2faEnableBtn')}
      </Button>
    </>
  )
}

export default memo(TwoFA)
