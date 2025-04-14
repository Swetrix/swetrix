import dayjs from 'dayjs'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import React, { useState, useEffect } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { toast } from 'sonner'

import { generateRefCode, getPayoutsInfo, getReferrals, setPaypalEmail } from '~/api'
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
} from '~/lib/constants'
import { User } from '~/lib/models/User'
import { useAuth } from '~/providers/AuthProvider'
import Button from '~/ui/Button'
import Highlighted from '~/ui/Highlighted'
import Spin from '~/ui/icons/Spin'
import Input from '~/ui/Input'
import Tooltip from '~/ui/Tooltip'
import { isValidEmail } from '~/utils/validator'

const Referral = () => {
  const { user, mergeUser } = useAuth()

  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const [refCodeGenerating, setRefCodeGenerating] = useState(false)
  const [paypalInputError, setPaypalInputError] = useState<string | null>(null)
  const [isPaypalEmailLoading, setIsPaypalEmailLoading] = useState(false)
  const [paypalEmailAddress, setPaypalEmailAddress] = useState<string | null>(user?.paypalPaymentsEmail || null)

  const [referralStatistics, setReferralStatistics] = useState<{
    trials: number
    subscribers: number
    paid: number
    nextPayout: number
    pending: number
  } | null>(null)
  const [activeReferrals, setActiveReferrals] = useState<Partial<User>[]>([])

  const [isLoading, setIsLoading] = useState<boolean | null>(null)

  const uiIsLoading = isLoading || isLoading === null

  const refUrl = `${REF_URL_PREFIX}${user?.refCode}`

  const loadStatistics = async () => {
    if (isLoading) {
      return
    }
    setIsLoading(true)

    try {
      const [payoutsInfo, referrals] = await Promise.all([getPayoutsInfo(), getReferrals()])
      setReferralStatistics(payoutsInfo)
      setActiveReferrals(referrals)
    } catch (reason: any) {
      console.error('[loadStatistics] Something went wrong whilst requesting referrals info', reason)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStatistics()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onRefCodeGenerate = async () => {
    if (refCodeGenerating || user?.refCode) {
      return
    }

    setRefCodeGenerating(true)

    try {
      const { refCode } = await generateRefCode()
      mergeUser({
        refCode,
      })
    } catch {
      toast.error(t('apiNotifications.somethingWentWrong'))
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
      mergeUser({
        paypalPaymentsEmail: paypalEmailAddress,
      })
      toast.success(t('profileSettings.referral.payoutEmailUpdated'))
    } catch (reason) {
      console.error('[Referral][updatePaypalEmail] Something went wrong whilst updating paypal email', reason)
      toast.error(t('apiNotifications.somethingWentWrong'))
    }

    setIsPaypalEmailLoading(false)
  }

  return (
    <>
      <p className='text-base text-gray-900 dark:text-gray-50'>
        <Trans
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
      {user?.refCode ? (
        <div className='grid grid-cols-1 gap-x-4 gap-y-6 lg:grid-cols-2'>
          <Input
            label={t('profileSettings.referral.yourReferralLink')}
            name='refCode'
            className='mt-4'
            value={refUrl}
            disabled
          />
        </div>
      ) : (
        <Button className='mt-2' onClick={onRefCodeGenerate} loading={refCodeGenerating} primary large>
          {t('profileSettings.referral.generateRefLink')}
        </Button>
      )}
      <h3 className='mt-5 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
        {t('profileSettings.referral.referralStats')}
      </h3>
      {referralStatistics ? (
        <div>
          <Tooltip
            text={t('profileSettings.referral.trialDesc')}
            tooltipNode={
              <span className='text-gray-900 dark:text-gray-50'>
                {t('profileSettings.referral.trial')}: <Highlighted>{referralStatistics.trials}</Highlighted>
              </span>
            }
            className='block'
          />
          <Tooltip
            text={t('profileSettings.referral.activeDesc')}
            tooltipNode={
              <span className='text-gray-900 dark:text-gray-50'>
                {t('profileSettings.referral.active')}: <Highlighted>{referralStatistics.subscribers}</Highlighted>
              </span>
            }
            className='block'
          />
          <Tooltip
            text={t('profileSettings.referral.paidDesc')}
            tooltipNode={
              <span className='text-gray-900 dark:text-gray-50'>
                {t('profileSettings.referral.paid')}: <Highlighted>US$ {referralStatistics.paid}</Highlighted>
              </span>
            }
            className='block'
          />
          <Tooltip
            text={t('profileSettings.referral.nextPayoutDesc')}
            tooltipNode={
              <span className='text-gray-900 dark:text-gray-50'>
                {t('profileSettings.referral.nextPayout')}:{' '}
                <Highlighted>US$ {referralStatistics.nextPayout}</Highlighted>
              </span>
            }
            className='block'
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
            className='block'
          />
        </div>
      ) : (
        <Spin className='mt-2 !ml-0' />
      )}
      <h3 className='mt-5 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
        {t('profileSettings.referral.activeReferrals')}
      </h3>
      {!_isEmpty(activeReferrals) ? (
        <table className='200 mt-2 min-w-full divide-y divide-gray-300 ring-1 ring-black/10 md:rounded-lg dark:divide-gray-500'>
          <thead className='bg-gray-50 dark:bg-slate-800'>
            <tr>
              <th
                scope='col'
                className='py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-50'
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
                  className='block'
                />
              </th>
              <th scope='col' className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-50'>
                {t('profileSettings.referral.activeReferralsTable.registrationDate')}
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-200 bg-white dark:divide-gray-600 dark:bg-slate-800'>
            {_map(activeReferrals, ({ billingFrequency, created, planCode, tierCurrency }, index) => {
              // @ts-expect-error
              const planPrice = PLAN_LIMITS[planCode].price[tierCurrency][billingFrequency]
              const referrerCut = calculateReferralCut(planPrice)
              const currencySymbol = CURRENCIES[tierCurrency as 'EUR' | 'USD' | 'GBP'].symbol
              const tBillingFrequency = t(
                billingFrequency === BillingFrequency.monthly ? 'pricing.perMonth' : 'pricing.perYear',
              )

              return (
                <tr key={index}>
                  <td className='px-3 py-4 text-sm whitespace-nowrap text-gray-900 sm:pl-6 dark:text-gray-50'>
                    {currencySymbol}
                    {planPrice}/{tBillingFrequency}
                  </td>
                  <td className='px-3 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-gray-50'>
                    {currencySymbol}
                    {referrerCut}/{tBillingFrequency}
                  </td>
                  <td className='px-3 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-gray-50'>
                    {language === 'en'
                      ? dayjs(created).locale(language).format('MMMM D, YYYY')
                      : dayjs(created).locale(language).format('D MMMM, YYYY')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : uiIsLoading ? (
        <Spin className='mt-2 !ml-0' />
      ) : (
        <p className='mt-2 text-sm text-gray-900 dark:text-gray-50'>
          {t('profileSettings.referral.noActiveReferrals')}
        </p>
      )}
    </>
  )
}

export default Referral
