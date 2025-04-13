import cx from 'clsx'
import _isNull from 'lodash/isNull'
import _isString from 'lodash/isString'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import QRCode from 'react-qr-code'
import { toast } from 'sonner'

import { generate2FA, enable2FA, disable2FA } from '~/api'
import { useAuth } from '~/providers/AuthProvider'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import { setAccessToken } from '~/utils/accessToken'
import { setRefreshToken } from '~/utils/refreshToken'

const TwoFA = () => {
  const { user, mergeUser } = useAuth()

  const { t } = useTranslation('common')
  const [twoFAConfigurating, setTwoFAConfigurating] = useState(false)
  const [twoFADisabling, setTwoFADisabling] = useState(false)
  const [twoFAConfigData, setTwoFAConfigData] = useState<{
    secret?: string
    otpauthUrl?: string
  }>({}) // { secret, otpauthUrl }
  const [isTwoFaLoading, setIsTwoFaLoading] = useState(false)
  const [twoFACode, setTwoFACode] = useState('')
  const [twoFACodeError, setTwoFACodeError] = useState<string | null>(null)
  const [twoFARecovery, setTwoFARecovery] = useState<string | null>(null)
  const { isTwoFactorAuthenticationEnabled } = user || {}

  const handle2FAInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {
      target: { value },
    } = event
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
      } catch (reason) {
        if (_isString(reason)) {
          toast.error(reason)
        } else {
          toast.error(t('apiNotifications.generate2FAError'))
        }
        console.error(`[ERROR] Failed to generate 2FA: ${reason}`)
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
        // TODO: Should probably pass dontRemember here if user session is temporary
        setAccessToken(accessToken)
        mergeUser({ isTwoFactorAuthenticationEnabled: true })
        setTwoFARecovery(twoFactorRecoveryCode)
      } catch (reason) {
        if (_isString(reason)) {
          toast.error(reason)
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
        mergeUser({ isTwoFactorAuthenticationEnabled: false })
      } catch (reason) {
        if (_isString(reason)) {
          toast.error(reason)
        }
        setTwoFACodeError(t('profileSettings.invalid2fa'))
      }

      setTwoFACode('')
      setIsTwoFaLoading(false)
    }
  }

  const callFnOnKeyPress =
    (fn: (e: any) => void, key = 'Enter') =>
    (e: any) => {
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
        <p className='text-base text-gray-900 dark:text-gray-50'>{t('profileSettings.2faRecoveryNote')}</p>
        <Input className='mt-4' value={twoFARecovery} />
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
          <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>{t('profileSettings.2faDisableHint')}</p>
          <div className='mt-4 flex items-center'>
            <Input
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
        <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>{t('profileSettings.2faEnabled')}</p>
        <Button className='mt-4' onClick={() => setTwoFADisabling(true)} danger large>
          {t('profileSettings.2faDisableBtn')}
        </Button>
      </>
    )
  }

  if (twoFAConfigurating) {
    return (
      <>
        <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>{t('profileSettings.2faDesc')}</p>
        <div className='mt-4 w-max bg-white p-4'>
          <QRCode value={twoFAConfigData?.otpauthUrl || ''} />
        </div>
        <p className='mt-2 text-base whitespace-pre-line text-gray-900 dark:text-gray-50'>
          {t('profileSettings.2faQRAlt', { key: twoFAConfigData?.secret || '' })}
        </p>
        <div className='mt-4 flex items-center'>
          <Input
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
              'xs:mt-4 mt-8': _isNull(twoFACodeError),
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
      <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>{t('profileSettings.2faEnable')}</p>
      <Button className='mt-4' onClick={_generate2FA} loading={isTwoFaLoading} primary large>
        {t('profileSettings.2faEnableBtn')}
      </Button>
    </>
  )
}

export default TwoFA
