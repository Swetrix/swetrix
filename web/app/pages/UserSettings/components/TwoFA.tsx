import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import QRCode from 'react-qr-code'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'
import { LockIcon } from '@phosphor-icons/react'

import { useAuth } from '~/providers/AuthProvider'
import type { UserSettingsActionData } from '~/routes/user-settings'
import Alert from '~/ui/Alert'
import Button from '~/ui/Button'
import Input from '~/ui/Input'

const TwoFA = () => {
  const { user, mergeUser } = useAuth()
  const fetcher = useFetcher<UserSettingsActionData>()

  const { t } = useTranslation('common')
  const [twoFAConfigurating, setTwoFAConfigurating] = useState(false)
  const [twoFADisabling, setTwoFADisabling] = useState(false)
  const [twoFAConfigData, setTwoFAConfigData] = useState<{
    secret?: string
    otpauthUrl?: string
  }>({})
  const [twoFACode, setTwoFACode] = useState('')
  const [twoFACodeError, setTwoFACodeError] = useState<string | null>(null)
  const [twoFARecovery, setTwoFARecovery] = useState<string | null>(null)
  const { isTwoFactorAuthenticationEnabled } = user || {}

  const isLoading =
    fetcher.state === 'submitting' || fetcher.state === 'loading'

  useEffect(() => {
    if (fetcher.data?.success) {
      const { intent, twoFAData } = fetcher.data

      if (intent === 'generate-2fa' && twoFAData) {
        setTimeout(() => {
          setTwoFAConfigurating(true)
          setTwoFAConfigData({
            secret: twoFAData.secret,
            otpauthUrl: twoFAData.otpauthUrl,
          })
        }, 0)
      } else if (intent === 'enable-2fa' && twoFAData?.twoFactorRecoveryCode) {
        mergeUser({ isTwoFactorAuthenticationEnabled: true })
        setTimeout(() => {
          setTwoFARecovery(twoFAData.twoFactorRecoveryCode ?? null)
          setTwoFACode('')
        }, 0)
      } else if (intent === 'disable-2fa') {
        mergeUser({ isTwoFactorAuthenticationEnabled: false })
        setTimeout(() => {
          setTwoFADisabling(false)
          setTwoFACode('')
        }, 0)
      }
    } else if (fetcher.data?.error) {
      const { intent, error } = fetcher.data

      if (intent === 'enable-2fa' || intent === 'disable-2fa') {
        setTimeout(() => {
          setTwoFACodeError(t('profileSettings.invalid2fa'))
          setTwoFACode('')
        }, 0)
      } else {
        toast.error(error)
        if (intent === 'generate-2fa') {
          setTimeout(() => {
            setTwoFAConfigurating(false)
            setTwoFAConfigData({})
          }, 0)
        }
      }
    }
  }, [fetcher.data, mergeUser, t])

  const handle2FAInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {
      target: { value },
    } = event
    setTwoFACode(value)
    setTwoFACodeError(null)
  }

  const _generate2FA = () => {
    const formData = new FormData()
    formData.set('intent', 'generate-2fa')
    fetcher.submit(formData, { method: 'post' })
  }

  const _enable2FA = () => {
    const formData = new FormData()
    formData.set('intent', 'enable-2fa')
    formData.set('code', twoFACode)
    fetcher.submit(formData, { method: 'post' })
  }

  const _disable2FA = () => {
    const formData = new FormData()
    formData.set('intent', 'disable-2fa')
    formData.set('code', twoFACode)
    fetcher.submit(formData, { method: 'post' })
  }

  const callFnOnKeyPress =
    (fn: (e: React.KeyboardEvent) => void, key = 'Enter') =>
    (e: React.KeyboardEvent) => {
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
        <Alert variant='warning' className='mb-4'>
          {t('profileSettings.2faRecoveryWarning')}
        </Alert>
        <p className='mb-4 text-base text-gray-900 dark:text-gray-50'>
          {t('profileSettings.2faRecoveryNote')}
        </p>
        <Input className='mt-4' value={twoFARecovery} disabled />
        <Button className='mt-4' onClick={recoverySaved} primary large>
          {t('profileSettings.2faRecoverySaved')}
        </Button>
      </div>
    )
  }

  if (isTwoFactorAuthenticationEnabled) {
    if (twoFADisabling) {
      return (
        <>
          <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>
            {t('profileSettings.2faDisableHint')}
          </p>
          <div className='mt-4 flex items-end gap-2'>
            <Input
              label={t('profileSettings.enter2faToDisable')}
              value={twoFACode}
              placeholder={t('profileSettings.yourOneTimeCode')}
              className='sm:col-span-3'
              onChange={handle2FAInput}
              onKeyDown={callFnOnKeyPress(_disable2FA)}
              error={twoFACodeError}
              disabled={isLoading}
            />
            <Button
              className={twoFACodeError ? 'mb-5' : ''}
              onClick={_disable2FA}
              loading={isLoading}
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
        <Alert variant='success' className='mb-4'>
          {t('profileSettings.2faEnabledSuccess')}
        </Alert>
        <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>
          {t('profileSettings.2faEnabled')}
        </p>
        <Button
          className='mt-4'
          onClick={() => setTwoFADisabling(true)}
          danger
          large
        >
          {t('profileSettings.2faDisableBtn')}
        </Button>
      </>
    )
  }

  if (twoFAConfigurating) {
    return (
      <>
        <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>
          {t('profileSettings.2faDesc')}
        </p>
        <div className='mt-4 w-max bg-white p-4'>
          <QRCode value={twoFAConfigData?.otpauthUrl || ''} />
        </div>

        <Alert variant='info' className='mt-4 max-w-prose'>
          <p className='font-medium'>{t('profileSettings.2faQRTitle')}</p>
          <p className='mt-1'>{t('profileSettings.2faQRHint')}</p>
          <code className='mt-2 block rounded bg-sky-100 p-2 font-mono text-sm dark:bg-sky-900/50'>
            {twoFAConfigData?.secret || ''}
          </code>
        </Alert>

        <div className='mt-4 flex items-end gap-2'>
          <Input
            label={t('profileSettings.enter2faToEnable')}
            value={twoFACode}
            placeholder={t('profileSettings.yourOneTimeCode')}
            className='sm:col-span-3'
            onChange={handle2FAInput}
            onKeyDown={callFnOnKeyPress(_enable2FA)}
            error={twoFACodeError}
            disabled={isLoading}
          />
          <Button
            className={twoFACodeError ? 'mb-5' : ''}
            onClick={_enable2FA}
            loading={isLoading}
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
      <Alert
        variant='tip'
        title={t('profileSettings.securityRecommendation')}
        className='mb-4'
      >
        {t('profileSettings.2faSecurityRecommendation')}
      </Alert>
      <Button onClick={_generate2FA} loading={isLoading} primary large>
        <LockIcon className='mr-2 size-4' weight='duotone' />
        {t('profileSettings.2faEnableBtn')}
      </Button>
    </>
  )
}

export default TwoFA
