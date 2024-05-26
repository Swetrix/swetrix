import React, { memo, useState, useRef, useEffect } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'

import { generateRefCode, getPayoutsInfo, getReferrals, setPaypalEmail } from 'api'
import Tooltip from 'ui/Tooltip'
import Highlighted from 'ui/Highlighted'
import Input from 'ui/Input'
import Button from 'ui/Button'
import { IUser } from 'redux/models/IUser'
import {
  REF_URL_PREFIX,
  DOCS_REFERRAL_PROGRAM_URL,
  REFERRAL_PENDING_PAYOUT_DAYS,
  calculateReferralCut,
  PLAN_LIMITS,
  CURRENCIES,
  BillingFrequency,
  MERCHANT_FEE,
  REFERRAL_CUT,
} from 'redux/constants'
import { isValidEmail } from 'utils/validator'

interface IReferral {
  user: IUser
  genericError: (message: string) => void
  updateUserData: (data: Partial<IUser>) => void
  setCache: (key: string, value: any) => void
  activeReferrals: any[]
  referralStatistics: any
  accountUpdated: (t: string) => void
}

const Referral = ({
  user,
  genericError,
  updateUserData,
  referralStatistics,
  activeReferrals,
  setCache,
  accountUpdated,
}: IReferral) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const [copied, setCopied] = useState(false)
  const [refCodeGenerating, setRefCodeGenerating] = useState(false)
  const [referralStatsRequested, setReferralStatsRequested] = useState(false)
  const [activeReferralsRequested, setActiveReferralsRequested] = useState(false)
  const [paypalInputError, setPaypalInputError] = useState<string | null>(null)
  const [isPaypalEmailLoading, setIsPaypalEmailLoading] = useState<boolean>(false)
  const [paypalEmailAddress, setPaypalEmailAddress] = useState<string | null>(user.paypalPaymentsEmail)
  const copyTimerRef = useRef(null)

  const refUrl = `${REF_URL_PREFIX}${user?.refCode}`

  useEffect(() => {
    return () => {
      // @ts-ignore
      clearTimeout(copyTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const getRefStats = async () => {
      try {
        const info = await getPayoutsInfo()
        setCache('referralStatistics', info)
      } catch (reason) {
        console.error('[Referral][getRefStats] Something went wrong whilst requesting payouts information', reason)
        genericError(t('apiNotifications.payoutInfoError'))
      }
    }

    const getActiveReferrals = async () => {
      try {
        const info = await getReferrals()
        setCache('activeReferrals', info)
      } catch (reason) {
        console.error('[Referral][getActiveReferrals] Something went wrong whilst requesting active referrals', reason)
        genericError(t('apiNotifications.payoutInfoError'))
      }
    }

    if (!referralStatsRequested && _isEmpty(referralStatistics)) {
      setReferralStatsRequested(true)
      getRefStats()
    }

    if (!activeReferralsRequested && _isEmpty(activeReferrals)) {
      setActiveReferralsRequested(true)
      getActiveReferrals()
    }
  }, [referralStatistics, referralStatsRequested, setCache, genericError, activeReferralsRequested, activeReferrals, t])

  const onRefCodeGenerate = async () => {
    if (refCodeGenerating || user.refCode) {
      return
    }

    setRefCodeGenerating(true)

    try {
      const { refCode } = await generateRefCode()
      updateUserData({
        refCode,
      })
    } catch (e) {
      genericError(t('apiNotifications.somethingWentWrong'))
    } finally {
      setRefCodeGenerating(false)
    }
  }

  const handlePaypalInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPaypalInputError(null)
    setPaypalEmailAddress(e.target.value)
  }

  const updatePaypalEmail = async () => {
    if (paypalEmailAddress) {
      const isValid = isValidEmail(paypalEmailAddress)

      if (!isValid) {
        setPaypalInputError(t('auth.common.badEmailError'))
        return
      }
    }

    setIsPaypalEmailLoading(true)

    try {
      await setPaypalEmail(paypalEmailAddress)
      updateUserData({
        paypalPaymentsEmail: paypalEmailAddress,
      })
      accountUpdated(t('profileSettings.referral.payoutEmailUpdated'))
    } catch (reason) {
      console.error('[Referral][updatePaypalEmail] Something went wrong whilst updating paypal email', reason)
      genericError(t('apiNotifications.somethingWentWrong'))
    }

    setIsPaypalEmailLoading(false)
  }

  const setToClipboard = (value: string) => {
    if (!copied) {
      navigator.clipboard.writeText(value)
      setCopied(true)
      // @ts-ignore
      copyTimerRef.current = setTimeout(() => {
        setCopied(false)
      }, 2000)
    }
  }

  return (
    <>
      <p className='text-base text-gray-900 dark:text-gray-50'>
        <Trans
          // @ts-ignore
          t={t}
          i18nKey='profileSettings.referral.desc'
          components={{
            url: (
              <a
                href={DOCS_REFERRAL_PROGRAM_URL}
                className='font-medium text-indigo-600 hover:text-indigo-500 hover:underline dark:text-indigo-400 dark:hover:text-indigo-500'
                target='_blank'
                rel='noreferrer noopener'
              />
            ),
          }}
        />
      </p>
      <h3 className='mt-5 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
        {t('profileSettings.referral.payoutEmail')}
      </h3>
      <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>
        {t('profileSettings.referral.payoutEmailDesc')}
      </p>
      <div className='mt-2 flex space-x-2'>
        <Input
          type='email'
          value={paypalEmailAddress || ''}
          placeholder='you@paypal.com'
          onChange={handlePaypalInput}
          error={paypalInputError}
        />
        <Button type='button' className='h-9' loading={isPaypalEmailLoading} onClick={updatePaypalEmail} primary large>
          {t('common.save')}
        </Button>
      </div>
      <h3 className='mt-5 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
        {t('profileSettings.referral.referralLink')}
      </h3>
      <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>
        {t('profileSettings.referral.referralLinkDesc')}
      </p>
      {user.refCode && (
        <p className='mt-2 max-w-prose text-base text-gray-900 dark:text-gray-50'>
          {t('profileSettings.referral.yourReferralLink')}
        </p>
      )}
      {user.refCode ? (
        <div className='grid grid-cols-1 gap-x-4 gap-y-6 lg:grid-cols-2'>
          <div className='group relative'>
            <Input name='refCode' className='pr-9' value={refUrl} disabled />
            <div className='absolute right-2 top-3'>
              <div className='group relative'>
                <Button
                  type='button'
                  onClick={() => setToClipboard(refUrl)}
                  className='opacity-70 hover:opacity-100'
                  noBorder
                >
                  <>
                    <ClipboardDocumentIcon className='h-6 w-6' />
                    {copied && (
                      <div className='absolute right-8 top-0.5 animate-appear cursor-auto rounded bg-white p-1 text-xs text-green-600 dark:bg-slate-800 sm:top-0'>
                        {t('common.copied')}
                      </div>
                    )}
                  </>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Button className='mt-2' onClick={onRefCodeGenerate} loading={refCodeGenerating} primary large>
          {t('profileSettings.referral.generateRefLink')}
        </Button>
      )}
      {!_isEmpty(referralStatistics) && (
        <>
          <h3 className='mt-5 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
            {t('profileSettings.referral.referralStats')}
          </h3>
          <div>
            <Tooltip
              text={t('profileSettings.referral.trialDesc')}
              tooltipNode={
                <span className='text-gray-900 dark:text-gray-50'>
                  {t('profileSettings.referral.trial')}: <Highlighted>{referralStatistics.trials}</Highlighted>
                </span>
              }
              className='!h-auto !w-auto max-w-max'
            />
            <Tooltip
              text={t('profileSettings.referral.activeDesc')}
              tooltipNode={
                <span className='text-gray-900 dark:text-gray-50'>
                  {t('profileSettings.referral.active')}: <Highlighted>{referralStatistics.subscribers}</Highlighted>
                </span>
              }
              className='!h-auto !w-auto max-w-max'
            />
            <Tooltip
              text={t('profileSettings.referral.paidDesc')}
              tooltipNode={
                <span className='text-gray-900 dark:text-gray-50'>
                  {t('profileSettings.referral.paid')}: <Highlighted>US$ {referralStatistics.paid}</Highlighted>
                </span>
              }
              className='!h-auto !w-auto max-w-max'
            />
            <Tooltip
              text={t('profileSettings.referral.nextPayoutDesc')}
              tooltipNode={
                <span className='text-gray-900 dark:text-gray-50'>
                  {t('profileSettings.referral.nextPayout')}:{' '}
                  <Highlighted>US$ {referralStatistics.nextPayout}</Highlighted>
                </span>
              }
              className='!h-auto !w-auto max-w-max'
            />
            <Tooltip
              text={t('profileSettings.referral.pendingDesc', {
                days: REFERRAL_PENDING_PAYOUT_DAYS,
              })}
              tooltipNode={
                <span className='text-gray-900 dark:text-gray-50'>
                  {t('profileSettings.referral.pending')}: <Highlighted>US$ {referralStatistics.pending}</Highlighted>
                </span>
              }
              className='!h-auto !w-auto max-w-max'
            />
          </div>
        </>
      )}
      {!_isEmpty(activeReferrals) && (
        <>
          <h3 className='mt-5 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
            {t('profileSettings.referral.activeReferrals')}
          </h3>
          <table className='200 mt-2 min-w-full divide-y divide-gray-300 shadow ring-1 ring-black ring-opacity-5 dark:divide-gray-500 md:rounded-lg'>
            <thead className='bg-gray-50 dark:bg-slate-800'>
              <tr>
                <th
                  scope='col'
                  className='py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50'
                >
                  {t('profileSettings.referral.activeReferralsTable.plan')}
                </th>
                <th scope='col' className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-50'>
                  <Tooltip
                    text={t('profileSettings.referral.activeReferralsTable.yourCutDesc', {
                      fee: MERCHANT_FEE,
                      amount: REFERRAL_CUT * 100,
                    })}
                    tooltipNode={<>{t('profileSettings.referral.activeReferralsTable.yourCut')}</>}
                    className='!h-auto !w-auto max-w-max'
                  />
                </th>
                <th scope='col' className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-50'>
                  {t('profileSettings.referral.activeReferralsTable.registrationDate')}
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200 bg-white dark:divide-gray-600 dark:bg-slate-800'>
              {_map(activeReferrals, ({ billingFrequency, created, planCode, tierCurrency }, index) => {
                // @ts-ignore
                const planPrice = PLAN_LIMITS[planCode].price[tierCurrency][billingFrequency]
                const referrerCut = calculateReferralCut(planPrice)
                const currencySymbol = CURRENCIES[tierCurrency as 'EUR' | 'USD' | 'GBP'].symbol
                const tBillingFrequency = t(
                  billingFrequency === BillingFrequency.monthly ? 'pricing.perMonth' : 'pricing.perYear',
                )

                return (
                  <tr key={index}>
                    <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-gray-50 sm:pl-6'>
                      {currencySymbol}
                      {planPrice}/{tBillingFrequency}
                    </td>
                    <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-gray-50'>
                      {currencySymbol}
                      {referrerCut}/{tBillingFrequency}
                    </td>
                    <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-gray-50'>
                      {language === 'en'
                        ? dayjs(created).locale(language).format('MMMM D, YYYY')
                        : dayjs(created).locale(language).format('D MMMM, YYYY')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}
    </>
  )
}

export default memo(Referral)
