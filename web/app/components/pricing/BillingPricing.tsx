import dayjs from 'dayjs'
import _includes from 'lodash/includes'
import _isNil from 'lodash/isNil'
import _map from 'lodash/map'
import _round from 'lodash/round'
import { QuestionIcon } from '@phosphor-icons/react'
import React, { memo, useEffect, useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import {
  BillingFrequency,
  CURRENCIES,
  CONTACT_EMAIL,
  PLAN_LIMITS,
  STANDARD_PLANS,
  PURCHASABLE_LEGACY_PLANS,
  paddleLanguageMapping,
} from '~/lib/constants'
import { Metainfo, DEFAULT_METAINFO } from '~/lib/models/Metainfo'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
import type { UserSettingsActionData } from '~/routes/user-settings'
import { Badge } from '~/ui/Badge'
import Button from '~/ui/Button'
import Loader from '~/ui/Loader'
import Modal from '~/ui/Modal'
import { Switch } from '~/ui/Switch'
import Tooltip from '~/ui/Tooltip'
import { cn } from '~/utils/generic'
import routes from '~/utils/routes'

interface BillingPricingProps {
  lastEvent?: { event: string } | null
  metainfo?: Metainfo
  openCheckout: (options: Record<string, any>) => boolean
}

const formatEventsLong = (value: number): string =>
  value.toLocaleString('en-US')

const BillingPricing = ({
  lastEvent,
  metainfo = DEFAULT_METAINFO,
  openCheckout,
}: BillingPricingProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { isAuthenticated, user, loadUser } = useAuth()
  const { theme } = useTheme()

  const previewFetcher = useFetcher<UserSettingsActionData>()
  const changePlanFetcher = useFetcher<UserSettingsActionData>()
  const generatePayLinkFetcher = useFetcher<UserSettingsActionData>()

  const [planCodeLoading, setPlanCodeLoading] = useState<string | null>(null)
  const [loadingTier, setLoadingTier] = useState<any>(null)
  const [
    isNewPlanConfirmationModalOpened,
    setIsNewPlanConfirmationModalOpened,
  ] = useState(false)
  const [newPlanId, setNewPlanId] = useState<number | null>(null)
  const [downgradeTo, setDowngradeTo] = useState<{
    planCode: string
    name: string
    pid: string
    ypid: string
  } | null>(null)
  const [showDowngradeModal, setShowDowngradeModal] = useState(false)
  const [billingFrequency, setBillingFrequency] = useState(
    user?.billingFrequency || BillingFrequency.monthly,
  )
  const [enableLegacyPlans, setEnableLegacyPlans] = useState(false)

  const subUpdatePreview = useMemo(() => {
    if (
      previewFetcher.state === 'loading' ||
      previewFetcher.state === 'submitting'
    ) {
      return null
    }
    if (previewFetcher.data?.success && previewFetcher.data.data) {
      return previewFetcher.data.data
    }
    if (previewFetcher.data?.error) {
      return false
    }
    return null
  }, [previewFetcher.data, previewFetcher.state])

  const isSubUpdating =
    changePlanFetcher.state === 'submitting' ||
    changePlanFetcher.state === 'loading'

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const legacyParam = urlParams.get('__ENABLE_LEGACY_PLANS')
    if (legacyParam === 'true') {
      setEnableLegacyPlans(true)
    }
  }, [])

  // Handle change plan fetcher response
  useEffect(() => {
    if (changePlanFetcher.data?.success) {
      loadUser()
      toast.success(t('apiNotifications.subscriptionUpdated'))
      closeUpdateModal(true)
    } else if (changePlanFetcher.data?.error) {
      console.error(
        '[ERROR] An error occured while updating subscription:',
        changePlanFetcher.data.error,
      )
      toast.error('An error occured while updating subscription')
      closeUpdateModal(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changePlanFetcher.data])

  // Handle preview fetcher error
  useEffect(() => {
    if (previewFetcher.data?.error) {
      console.error(
        '[ERROR] An error occured while loading subscription update pricing preview:',
        previewFetcher.data.error,
      )
      toast.error(
        'An error occured while loading subscription update pricing preview',
      )
    }
  }, [previewFetcher.data?.error])

  // Handle generate pay link fetcher response
  useEffect(() => {
    if (
      generatePayLinkFetcher.data?.success &&
      generatePayLinkFetcher.data?.data
    ) {
      const url = (generatePayLinkFetcher.data.data as any).url

      const opened = openCheckout({
        override: url,
        locale: paddleLanguageMapping[language] || language,
        title: loadingTier?.name,
        displayModeTheme: theme,
        country: metainfo.country,
      })

      if (!opened) {
        toast.error(t('billing.paddleStillLoading'))
        setPlanCodeLoading(null)
        setLoadingTier(null)
      }

      // Clear data to prevent infinite loops if re-rendering occurs
      generatePayLinkFetcher.data = undefined
    } else if (generatePayLinkFetcher.data?.error) {
      console.error(
        '[ERROR] An error occured while generating pay link:',
        generatePayLinkFetcher.data.error,
      )
      toast.error('An error occured while preparing checkout')
      setPlanCodeLoading(null)
      setLoadingTier(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatePayLinkFetcher.data])

  const PLAN_CODES_ARRAY = useMemo(() => {
    let basePlans = STANDARD_PLANS

    if (enableLegacyPlans) {
      basePlans = [...PURCHASABLE_LEGACY_PLANS, ...STANDARD_PLANS]
    }

    if (!isAuthenticated) return basePlans

    const userPlan = user?.planCode

    if (userPlan === 'trial' || userPlan === 'none') {
      return basePlans
    }

    return _includes(basePlans, userPlan) ? basePlans : [userPlan, ...basePlans]
  }, [isAuthenticated, user?.planCode, enableLegacyPlans])

  const currencyCode = user?.tierCurrency || metainfo.code
  const currency = CURRENCIES[currencyCode]

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

  const loadSubUpdatePreview = (planId: number) => {
    setIsNewPlanConfirmationModalOpened(true)
    previewFetcher.submit(
      { intent: 'preview-subscription-update', planId: String(planId) },
      { method: 'POST', action: '/user-settings' },
    )
  }

  const onPlanChange = async (tier: any) => {
    if (!user) return

    const isSelectingDifferentPlan =
      user.planCode !== tier.planCode ||
      user.billingFrequency !== billingFrequency ||
      !isUnselectablePlanCode(user.planCode)

    if (planCodeLoading || !isSelectingDifferentPlan) return

    if (
      user.subID &&
      !user.cancellationEffectiveDate &&
      user.planCode !== 'none'
    ) {
      if (isTrialingPaidPlan) {
        toast.error(t('billing.cannotChangePlanDuringTrial'))
        return
      }

      const planId = Number(
        billingFrequency === BillingFrequency.monthly ? tier.pid : tier.ypid,
      )
      setNewPlanId(planId)
      loadSubUpdatePreview(planId)
      return
    }

    setPlanCodeLoading(tier.planCode)
    setLoadingTier(tier)

    const planId = Number(
      billingFrequency === BillingFrequency.monthly ? tier.pid : tier.ypid,
    )

    generatePayLinkFetcher.submit(
      { intent: 'generate-pay-link', planId: String(planId) },
      { method: 'POST', action: '/user-settings' },
    )
  }

  const closeUpdateModal = (force?: boolean) => {
    if (isSubUpdating && !force) return
    setIsNewPlanConfirmationModalOpened(false)
    setNewPlanId(null)
  }

  const updateSubscription = () => {
    changePlanFetcher.submit(
      { intent: 'change-subscription-plan', planId: String(newPlanId) },
      { method: 'POST', action: '/user-settings' },
    )
  }

  const downgradeHandler = (tier: any) => {
    if (!user) return

    if (isTrialingPaidPlan) {
      toast.error(t('billing.cannotChangePlanDuringTrial'))
      return
    }

    if (planCodeLoading === null && user.planCode !== tier.planCode) {
      setDowngradeTo(tier)
      setShowDowngradeModal(true)
    }
  }

  const isUnselectablePlanCode = (planCode: any): boolean => {
    return ['free', 'trial', 'none'].includes(planCode)
  }

  const isTrialingPaidPlan =
    !!user?.trialEndDate &&
    !['none', 'trial', 'free'].includes(user?.planCode || '') &&
    dayjs(user.trialEndDate).isAfter(dayjs())

  const userPlancodeID = user?.planCode ? PLAN_LIMITS[user.planCode]?.index : 0

  const getActionLabel = (tier: any): string => {
    const planCodeID = tier.index
    const downgrade =
      !user?.cancellationEffectiveDate && planCodeID < userPlancodeID
    if (
      user?.cancellationEffectiveDate ||
      isUnselectablePlanCode(user?.planCode)
    ) {
      return t('pricing.subscribe')
    }
    if (planCodeID > userPlancodeID) {
      return t('pricing.upgrade')
    }
    if (downgrade) {
      return t('pricing.downgrade')
    }
    if (
      user?.billingFrequency === billingFrequency &&
      user?.planCode === tier.planCode
    ) {
      return t('pricing.yourPlan')
    }
    return billingFrequency === BillingFrequency.monthly
      ? t('pricing.switchToMonthly')
      : t('pricing.switchToYearly')
  }

  const isDisabledForTier = (tier: any): boolean => {
    return (
      planCodeLoading !== null ||
      (tier.planCode === user?.planCode &&
        (user?.billingFrequency === billingFrequency ||
          isUnselectablePlanCode(user?.planCode)))
    )
  }

  const tiers = useMemo(() => {
    const validCodes = PLAN_CODES_ARRAY.filter(
      (code): code is keyof typeof PLAN_LIMITS =>
        typeof code === 'string' && code in PLAN_LIMITS,
    )
    return validCodes.map((code) => PLAN_LIMITS[code])
  }, [PLAN_CODES_ARRAY])

  const yearlyDiscount = useMemo(() => {
    const firstTier = tiers[0]
    if (!firstTier) return 0

    const monthlyPrice = firstTier.price[currencyCode]?.monthly ?? 0
    const yearlyPrice = firstTier.price[currencyCode]?.yearly ?? 0

    if (monthlyPrice === 0) return 0

    const annualCostIfMonthly = monthlyPrice * 12
    const savings = annualCostIfMonthly - yearlyPrice
    const discountPercentage = (savings / annualCostIfMonthly) * 100

    return _round(discountPercentage, 0)
  }, [tiers, currencyCode])

  const toggleBillingFrequency = () => {
    setBillingFrequency((currentFrequency) =>
      currentFrequency === BillingFrequency.yearly
        ? BillingFrequency.monthly
        : BillingFrequency.yearly,
    )
  }

  return (
    <>
      <div className='rounded-xl border border-gray-200 p-4 sm:p-6 dark:border-white/10'>
        <div className='mb-3 flex items-center justify-between'>
          <h2 className='text-2xl font-bold text-black dark:text-gray-50'>
            {t('common.billing')}
          </h2>
          <button
            type='button'
            onClick={toggleBillingFrequency}
            className='flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 transition-colors hover:bg-gray-200 dark:border-white/10 dark:bg-slate-950 dark:hover:bg-slate-900'
          >
            <span className='text-sm font-medium text-gray-700 dark:text-gray-200'>
              {t('pricing.billedYearly')}
            </span>
            {yearlyDiscount > 0 ? (
              <span className='rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'>
                -{yearlyDiscount} %
              </span>
            ) : null}
            <Switch
              checked={billingFrequency === BillingFrequency.yearly}
              visualOnly
            />
          </button>
        </div>

        <div className='space-y-2'>
          {_map(tiers, (tier) => (
            <div
              key={tier.planCode}
              className={cn(
                'flex items-center justify-between rounded-xl border px-4 py-3 text-black backdrop-blur-sm dark:bg-white/2 dark:text-white',
                {
                  'border-gray-200 dark:border-white/10':
                    user?.planCode !== tier.planCode ||
                    isUnselectablePlanCode(tier.planCode),
                  'border-indigo-500 dark:border-gray-50':
                    user?.planCode === tier.planCode &&
                    !isUnselectablePlanCode(tier.planCode),
                },
              )}
            >
              <div>
                <span className='text-base font-medium'>
                  {formatEventsLong(tier.monthlyUsageLimit)}
                </span>
                &nbsp;
                <span className='text-sm text-gray-500 dark:text-gray-400'>
                  {t('pricing.eventsPerMonth')}
                </span>
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
                            <QuestionIcon className='size-4 stroke-yellow-800 dark:stroke-yellow-500' />
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
                    /
                    {t(
                      billingFrequency === BillingFrequency.monthly
                        ? 'pricing.perMonth'
                        : 'pricing.perYear',
                    )}
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

          <a
            href={routes.contact}
            target='_blank'
            rel='noopener noreferrer'
            className='group flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-black backdrop-blur-sm dark:border-white/10 dark:bg-white/2 dark:text-white'
          >
            <span className='text-base font-medium'>
              {t('pricing.overXEvents', { amount: formatEventsLong(20000000) })}
            </span>
            <p className='text-sm group-hover:underline'>
              {t('pricing.contactUs')}
            </p>
          </a>
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
        message={
          <Trans
            t={t}
            i18nKey='pricing.downgradeDesc'
            values={{ email: CONTACT_EMAIL }}
          />
        }
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
                        className='font-medium underline decoration-dashed hover:decoration-solid'
                      />
                    ),
                  }}
                />
              </p>
            ) : null}
            {subUpdatePreview && typeof subUpdatePreview === 'object' ? (
              <div>
                <h2 className='text-base font-bold'>{t('billing.dueNow')}</h2>
                <p className='text-sm'>{t('billing.dueNowDescription')}</p>
                <div className='mt-2 overflow-hidden ring-1 ring-black/5 md:rounded-lg'>
                  <table className='200 min-w-full divide-y divide-gray-300 dark:divide-slate-700'>
                    <thead className='bg-gray-50 dark:bg-slate-900'>
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
                    <tbody className='divide-y divide-gray-200 bg-white dark:divide-slate-700 dark:bg-slate-950'>
                      <tr>
                        <td className='px-3 py-4 text-sm whitespace-nowrap text-gray-900 sm:pl-6 dark:text-gray-50'>
                          {`${(subUpdatePreview as any).immediatePayment.symbol}${(subUpdatePreview as any).immediatePayment.amount}`}
                        </td>
                        <td className='px-3 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-gray-50'>
                          {language === 'en'
                            ? dayjs(
                                (subUpdatePreview as any).immediatePayment.date,
                              )
                                .locale(language)
                                .format('MMMM D, YYYY')
                            : dayjs(
                                (subUpdatePreview as any).immediatePayment.date,
                              )
                                .locale(language)
                                .format('D MMMM, YYYY')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {(subUpdatePreview as any).immediatePayment.amount < 0 ? (
                  <p className='mt-2 italic'>
                    {t('billing.negativePayment', {
                      currency: (subUpdatePreview as any).immediatePayment
                        .symbol,
                      dueNowAmount: -(subUpdatePreview as any).immediatePayment
                        .amount,
                      dueNowDate:
                        language === 'en'
                          ? dayjs(
                              (subUpdatePreview as any).immediatePayment.date,
                            )
                              .locale(language)
                              .format('MMMM D, YYYY')
                          : dayjs(
                              (subUpdatePreview as any).immediatePayment.date,
                            )
                              .locale(language)
                              .format('D MMMM, YYYY'),
                      nextPaymentAmount: (subUpdatePreview as any).nextPayment
                        .amount,
                    })}
                  </p>
                ) : null}
                <h2 className='mt-5 text-base font-bold'>
                  {t('billing.nextPayment')}
                </h2>
                <div className='mt-2 overflow-hidden ring-1 ring-black/5 md:rounded-lg'>
                  <table className='200 min-w-full divide-y divide-gray-300 dark:divide-slate-700'>
                    <thead className='bg-gray-50 dark:bg-slate-900'>
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
                    <tbody className='divide-y divide-gray-200 bg-white dark:divide-slate-700 dark:bg-slate-950'>
                      <tr>
                        <td className='px-3 py-4 text-sm whitespace-nowrap text-gray-900 sm:pl-6 dark:text-gray-50'>
                          {`${(subUpdatePreview as any).nextPayment.symbol}${(subUpdatePreview as any).nextPayment.amount}`}
                        </td>
                        <td className='px-3 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-gray-50'>
                          {language === 'en'
                            ? dayjs((subUpdatePreview as any).nextPayment.date)
                                .locale(language)
                                .format('MMMM D, YYYY')
                            : dayjs((subUpdatePreview as any).nextPayment.date)
                                .locale(language)
                                .format('D MMMM, YYYY')}
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
