import { Label, Radio, RadioGroup } from '@headlessui/react'
import cx from 'clsx'
import dayjs from 'dayjs'
import _includes from 'lodash/includes'
import _isNil from 'lodash/isNil'
import _map from 'lodash/map'
import { CircleHelpIcon } from 'lucide-react'
import React, { memo, useEffect, useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { changeSubscriptionPlan, getPaymentMetainfo, previewSubscriptionUpdate } from '~/api'
import {
  BillingFrequency,
  CURRENCIES,
  CONTACT_EMAIL,
  PLAN_LIMITS,
  REFERRAL_DISCOUNT_CODE,
  STANDARD_PLANS,
  paddleLanguageMapping,
} from '~/lib/constants'
import { DEFAULT_METAINFO, Metainfo } from '~/lib/models/Metainfo'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
import { Badge } from '~/ui/Badge'
import Button from '~/ui/Button'
import Loader from '~/ui/Loader'
import Modal from '~/ui/Modal'
import Tooltip from '~/ui/Tooltip'
import { cn } from '~/utils/generic'
import routes from '~/utils/routes'

interface BillingPricingProps {
  lastEvent?: { event: string } | null
}

const formatEventsLong = (value: number): string => value.toLocaleString('en-US')

const BillingPricing = ({ lastEvent }: BillingPricingProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { isAuthenticated, user, loadUser } = useAuth()
  const { theme } = useTheme()

  const [metainfo, setMetainfo] = useState<Metainfo>(DEFAULT_METAINFO)
  const [planCodeLoading, setPlanCodeLoading] = useState<string | null>(null)
  const [isNewPlanConfirmationModalOpened, setIsNewPlanConfirmationModalOpened] = useState(false)
  const [subUpdatePreview, setSubUpdatePreview] = useState<any>(null)
  const [newPlanId, setNewPlanId] = useState<number | null>(null)
  const [isSubUpdating, setIsSubUpdating] = useState(false)
  const [downgradeTo, setDowngradeTo] = useState<{
    planCode: string
    name: string
    pid: string
    ypid: string
  } | null>(null)
  const [showDowngradeModal, setShowDowngradeModal] = useState(false)
  const [billingFrequency, setBillingFrequency] = useState(user?.billingFrequency || BillingFrequency.monthly)

  const PLAN_CODES_ARRAY = useMemo(() => {
    if (!isAuthenticated) return STANDARD_PLANS

    const userPlan = user?.planCode

    // Hide non-purchasable pseudo-plans from the list
    if (userPlan === 'trial' || userPlan === 'none') {
      return STANDARD_PLANS
    }

    return _includes(STANDARD_PLANS, userPlan) ? STANDARD_PLANS : [userPlan, ...STANDARD_PLANS]
  }, [isAuthenticated, user?.planCode])

  const currencyCode = user?.tierCurrency || metainfo.code
  const currency = CURRENCIES[currencyCode]

  useEffect(() => {
    const abortController = new AbortController()
    getPaymentMetainfo({ signal: abortController.signal })
      .then(setMetainfo)
      .catch(() => {})
    return () => abortController.abort()
  }, [])

  useEffect(() => {
    if (!lastEvent) return

    const lastEventHandler = async (data: { event: string }) => {
      if (_isNil(data)) return
      if (data.event === 'Checkout.Complete') {
        setTimeout(async () => {
          await loadUser()
          toast.success(t('apiNotifications.subscriptionUpdated'))
        }, 3000)
        setPlanCodeLoading(null)
        setDowngradeTo(null)
      } else if (data.event === 'Checkout.Close') {
        setPlanCodeLoading(null)
        setDowngradeTo(null)
      }
    }
    lastEventHandler(lastEvent)
  }, [lastEvent, t, loadUser])

  const loadSubUpdatePreview = async (planId: number) => {
    setIsNewPlanConfirmationModalOpened(true)
    try {
      const preview = await previewSubscriptionUpdate(planId)
      setSubUpdatePreview(preview)
    } catch (reason) {
      console.error('[ERROR] An error occured while loading subscription update pricing preview:', reason)
      toast.error('An error occured while loading subscription update pricing preview')
      setSubUpdatePreview(false)
    }
  }

  const onPlanChange = async (tier: any) => {
    if (!user) return

    const isSelectingDifferentPlan =
      user.planCode !== tier.planCode ||
      user.billingFrequency !== billingFrequency ||
      !isUnselectablePlanCode(user.planCode)

    if (planCodeLoading || !isSelectingDifferentPlan) return

    if (user.subID && !user.cancellationEffectiveDate && user.planCode !== 'none') {
      const planId = Number(billingFrequency === BillingFrequency.monthly ? tier.pid : tier.ypid)
      setNewPlanId(planId)
      await loadSubUpdatePreview(planId)
      return
    }

    setPlanCodeLoading(tier.planCode)

    if (!window.Paddle) {
      toast.error('Payment script has not yet loaded! Please, try again.')
      setPlanCodeLoading(null)
      return
    }

    const discountMayBeApplied =
      user.referrerID && (user.planCode === 'trial' || user.planCode === 'none') && !user.cancellationEffectiveDate
    const coupon = discountMayBeApplied ? REFERRAL_DISCOUNT_CODE : undefined

    window.Paddle.Checkout.open({
      product: billingFrequency === BillingFrequency.monthly ? tier.pid : tier.ypid,
      email: user.email,
      passthrough: JSON.stringify({ uid: user.id }),
      locale: paddleLanguageMapping[language] || language,
      title: tier.name,
      displayModeTheme: theme,
      country: metainfo.country,
      coupon,
    })
  }

  const closeUpdateModal = (force?: boolean) => {
    if (isSubUpdating && !force) return
    setIsNewPlanConfirmationModalOpened(false)
    setSubUpdatePreview(null)
    setNewPlanId(null)
    setIsSubUpdating(false)
  }

  const updateSubscription = async () => {
    setIsSubUpdating(true)
    try {
      await changeSubscriptionPlan(newPlanId as number)
      await loadUser()
      toast.success(t('apiNotifications.subscriptionUpdated'))
      closeUpdateModal(true)
    } catch (reason) {
      console.error('[ERROR] An error occured while updating subscription:', reason)
      toast.error('An error occured while updating subscription')
      closeUpdateModal(true)
    }
  }

  const downgradeHandler = (tier: any) => {
    if (!user) return
    if (planCodeLoading === null && user.planCode !== tier.planCode) {
      setDowngradeTo(tier)
      setShowDowngradeModal(true)
    }
  }

  const isUnselectablePlanCode = (planCode: any): boolean => {
    return ['free', 'trial', 'none'].includes(planCode)
  }

  const userPlancodeID = user?.planCode ? PLAN_LIMITS[user.planCode]?.index : 0

  const getActionLabel = (tier: any): string => {
    const planCodeID = tier.index
    const downgrade = !user?.cancellationEffectiveDate && planCodeID < userPlancodeID
    if (user?.cancellationEffectiveDate || isUnselectablePlanCode(user?.planCode)) {
      return t('pricing.subscribe')
    }
    if (planCodeID > userPlancodeID) {
      return t('pricing.upgrade')
    }
    if (downgrade) {
      return t('pricing.downgrade')
    }
    if (user?.billingFrequency === billingFrequency && user?.planCode === tier.planCode) {
      return t('pricing.yourPlan')
    }
    return billingFrequency === BillingFrequency.monthly ? t('pricing.switchToMonthly') : t('pricing.switchToYearly')
  }

  const isDisabledForTier = (tier: any): boolean => {
    return (
      planCodeLoading !== null ||
      (tier.planCode === user?.planCode &&
        (user?.billingFrequency === billingFrequency || isUnselectablePlanCode(user?.planCode)))
    )
  }

  const tiers = useMemo(() => {
    const validCodes = PLAN_CODES_ARRAY.filter(
      (code): code is keyof typeof PLAN_LIMITS => typeof code === 'string' && code in PLAN_LIMITS,
    )
    return validCodes.map((code) => PLAN_LIMITS[code])
  }, [PLAN_CODES_ARRAY])

  return (
    <>
      <div className='rounded-xl border border-gray-200 p-4 sm:p-6 dark:border-white/10'>
        <div className='mb-3 flex justify-between'>
          <h2 className='text-2xl font-bold text-black dark:text-gray-50'>{t('common.billing')}</h2>
          <RadioGroup
            value={billingFrequency}
            onChange={setBillingFrequency}
            className='grid grid-cols-2 gap-x-1 rounded-md p-1 text-center text-xs leading-5 font-semibold ring-1 ring-gray-200 dark:ring-white/20'
          >
            <Label className='sr-only'>{t('pricing.frequency')}</Label>
            <Radio
              key={BillingFrequency.monthly}
              value={BillingFrequency.monthly}
              className={({ checked }) =>
                cx(
                  checked
                    ? 'bg-slate-900 text-gray-50 dark:bg-white/90 dark:text-slate-900'
                    : 'text-slate-700 dark:text-gray-200',
                  'flex cursor-pointer items-center justify-center rounded-md px-2.5 py-1 transition-all',
                )
              }
            >
              <span>{t('pricing.monthlyBilling')}</span>
            </Radio>
            <Radio
              key={BillingFrequency.yearly}
              value={BillingFrequency.yearly}
              className={({ checked }) =>
                cx(
                  checked
                    ? 'bg-slate-900 text-gray-50 dark:bg-white/90 dark:text-slate-900'
                    : 'text-slate-700 dark:text-gray-200',
                  'flex cursor-pointer items-center justify-center rounded-md px-2.5 py-1 transition-all',
                )
              }
            >
              <span>{t('pricing.yearlyBilling')}</span>
            </Radio>
          </RadioGroup>
        </div>

        <div className='space-y-2'>
          {_map(tiers, (tier) => (
            <div
              key={tier.planCode}
              className={cn(
                'flex items-center justify-between rounded-xl border px-4 py-3 text-black backdrop-blur-sm dark:bg-white/2 dark:text-white',
                {
                  'border-gray-200 dark:border-white/10':
                    user?.planCode !== tier.planCode || isUnselectablePlanCode(tier.planCode),
                  'border-indigo-500': user?.planCode === tier.planCode && !isUnselectablePlanCode(tier.planCode),
                },
              )}
            >
              <div>
                <span className='text-base font-medium'>{formatEventsLong(tier.monthlyUsageLimit)}</span>
                &nbsp;
                <span className='text-sm text-gray-500 dark:text-gray-400'>{t('pricing.eventsPerMonth')}</span>
              </div>
              <div className='flex items-center gap-3 text-sm'>
                {tier.legacy ? (
                  <Badge
                    label={
                      <Tooltip
                        text={t('pricing.legacyDescription')}
                        tooltipNode={
                          <span className='flex items-center gap-1'>
                            {t('pricing.legacy')}
                            <CircleHelpIcon
                              className='size-4 stroke-yellow-800 dark:stroke-yellow-500'
                              strokeWidth={1.5}
                            />
                          </span>
                        }
                      />
                    }
                    colour='yellow'
                  />
                ) : null}
                <div className='text-sm'>
                  <span className='font-semibold text-black dark:text-white'>
                    {currency.symbol}
                    {Number(
                      (billingFrequency === BillingFrequency.monthly
                        ? tier.price[currencyCode]?.monthly
                        : tier.price[currencyCode]?.yearly) ?? 0,
                    ).toFixed(2)}
                  </span>
                  &nbsp;
                  <span className='text-sm'>
                    /{t(billingFrequency === BillingFrequency.monthly ? 'pricing.perMonth' : 'pricing.perYear')}
                  </span>
                </div>
                <Button
                  onClick={() => {
                    const action = getActionLabel(tier)

                    if (action === t('pricing.downgrade')) {
                      downgradeHandler(tier)
                    } else {
                      onPlanChange(tier)
                    }
                  }}
                  type='button'
                  loading={planCodeLoading === tier.planCode}
                  disabled={isDisabledForTier(tier)}
                  small
                  primary
                >
                  {getActionLabel(tier)}
                </Button>
              </div>
            </div>
          ))}

          <p className='mt-6 text-slate-800 dark:text-slate-200'>
            <Trans
              t={t}
              i18nKey='billing.contact'
              values={{ amount: 10 }}
              components={{
                url: (
                  <Link
                    to={routes.contact}
                    className='underline decoration-dashed hover:decoration-solid'
                    aria-label={t('footer.tos')}
                  />
                ),
              }}
            />
          </p>
        </div>
      </div>

      <div className='checkout-container' id='checkout-container' />

      <Modal
        onClose={() => {
          setDowngradeTo(null)
          setShowDowngradeModal(false)
        }}
        onSubmit={() => {
          setShowDowngradeModal(false)
          if (downgradeTo) onPlanChange(downgradeTo)
        }}
        submitText={t('common.yes')}
        closeText={t('common.no')}
        title={t('pricing.downgradeTitle')}
        type='warning'
        message={<Trans t={t} i18nKey='pricing.downgradeDesc' values={{ email: CONTACT_EMAIL }} />}
        isOpened={showDowngradeModal}
      />

      <Modal
        onClose={closeUpdateModal}
        onSubmit={updateSubscription}
        submitText={t('common.confirm')}
        closeText={t('common.goBack')}
        title={t('billing.confirmNewPlan')}
        submitType='regular'
        type='info'
        isLoading={isSubUpdating}
        message={
          <>
            {subUpdatePreview === null ? <Loader /> : null}
            {subUpdatePreview === false ? (
              <p className='whitespace-pre-line'>
                <Trans
                  t={t}
                  i18nKey='billing.previewLoadingError'
                  values={{ email: CONTACT_EMAIL }}
                  components={{
                    mail: (
                      <a
                        title={`Email us at ${CONTACT_EMAIL}`}
                        href={`mailto:${CONTACT_EMAIL}`}
                        className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                      />
                    ),
                  }}
                />
              </p>
            ) : null}
            {subUpdatePreview ? (
              <div>
                <h2 className='text-base font-bold'>{t('billing.dueNow')}</h2>
                <p className='text-sm'>{t('billing.dueNowDescription')}</p>
                <div className='mt-2 overflow-hidden ring-1 ring-black/5 md:rounded-lg'>
                  <table className='200 min-w-full divide-y divide-gray-300 dark:divide-gray-500'>
                    <thead className='bg-gray-50 dark:bg-slate-800'>
                      <tr>
                        <th
                          scope='col'
                          className='py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6 dark:text-gray-50'
                        >
                          {t('common.amount')}
                        </th>
                        <th
                          scope='col'
                          className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-50'
                        >
                          {t('common.date')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-200 bg-white dark:divide-gray-600 dark:bg-slate-800'>
                      <tr>
                        <td className='px-3 py-4 text-sm whitespace-nowrap text-gray-900 sm:pl-6 dark:text-gray-50'>
                          {`${subUpdatePreview.immediatePayment.symbol}${subUpdatePreview.immediatePayment.amount}`}
                        </td>
                        <td className='px-3 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-gray-50'>
                          {language === 'en'
                            ? dayjs(subUpdatePreview.immediatePayment.date).locale(language).format('MMMM D, YYYY')
                            : dayjs(subUpdatePreview.immediatePayment.date).locale(language).format('D MMMM, YYYY')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {subUpdatePreview.immediatePayment.amount < 0 ? (
                  <p className='mt-2 italic'>
                    {t('billing.negativePayment', {
                      currency: subUpdatePreview.immediatePayment.symbol,
                      dueNowAmount: -subUpdatePreview.immediatePayment.amount,
                      dueNowDate:
                        language === 'en'
                          ? dayjs(subUpdatePreview.immediatePayment.date).locale(language).format('MMMM D, YYYY')
                          : dayjs(subUpdatePreview.immediatePayment.date).locale(language).format('D MMMM, YYYY'),
                      nextPaymentAmount: subUpdatePreview.nextPayment.amount,
                    })}
                  </p>
                ) : null}
                <h2 className='mt-5 text-base font-bold'>{t('billing.nextPayment')}</h2>
                <div className='mt-2 overflow-hidden ring-1 ring-black/5 md:rounded-lg'>
                  <table className='200 min-w-full divide-y divide-gray-300 dark:divide-gray-500'>
                    <thead className='bg-gray-50 dark:bg-slate-800'>
                      <tr>
                        <th
                          scope='col'
                          className='py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6 dark:text-gray-50'
                        >
                          {t('common.amount')}
                        </th>
                        <th
                          scope='col'
                          className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-50'
                        >
                          {t('common.date')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-200 bg-white dark:divide-gray-600 dark:bg-slate-800'>
                      <tr>
                        <td className='px-3 py-4 text-sm whitespace-nowrap text-gray-900 sm:pl-6 dark:text-gray-50'>
                          {`${subUpdatePreview.nextPayment.symbol}${subUpdatePreview.nextPayment.amount}`}
                        </td>
                        <td className='px-3 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-gray-50'>
                          {language === 'en'
                            ? dayjs(subUpdatePreview.nextPayment.date).locale(language).format('MMMM D, YYYY')
                            : dayjs(subUpdatePreview.nextPayment.date).locale(language).format('D MMMM, YYYY')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </>
        }
        isOpened={isNewPlanConfirmationModalOpened}
      />
    </>
  )
}

export default memo(BillingPricing)
