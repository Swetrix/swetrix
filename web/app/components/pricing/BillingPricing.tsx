import dayjs from 'dayjs'
import _isNil from 'lodash/isNil'
import _round from 'lodash/round'
import { ArrowRightIcon, CheckIcon } from '@phosphor-icons/react'
import type { TFunction } from 'i18next'
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import {
  BillingFrequency,
  CONTACT_EMAIL,
  CURRENCIES,
  paddleLanguageMapping,
  PLAN_LIMITS,
} from '~/lib/constants'
import { Metainfo, DEFAULT_METAINFO } from '~/lib/models/Metainfo'
import {
  ADDONS,
  EVENT_TIER_CODES,
  EVENT_TIERS,
  PLAN_ENTITLEMENTS,
  PLAN_TYPES,
  getEffectivePlanType,
  getEventTierByPlanCode,
  getIncludedSessionReplays,
  getPlanMonthlyPrice,
  getPlanPrice,
  type BillingInterval,
  type CurrencyCode,
  type EventTierCode,
  type PlanTypeCode,
} from '~/lib/pricing/catalog'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
import type { UserSettingsActionData } from '~/routes/user-settings'
import Button from '~/ui/Button'
import Loader from '~/ui/Loader'
import Modal from '~/ui/Modal'
import { Switch } from '~/ui/Switch'
import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'
import routes from '~/utils/routes'

interface BillingPricingProps {
  lastEvent?: { event: string } | null
  metainfo?: Metainfo
  openCheckout: (options: Record<string, any>) => boolean
}

interface PendingSelection {
  planType: PlanTypeCode
  eventTier: EventTierCode
  billingFrequency: BillingInterval
  currency: CurrencyCode
}

const planTypeOptions: PlanTypeCode[] = ['standard', 'plus', 'enterprise']

const formatEventsLong = (value: number): string =>
  value.toLocaleString('en-US')

const formatPrice = (amount: number | null) => {
  if (amount === null) return null
  return Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2)
}

const formatReplayQuota = (value: number | string, t: TFunction) => {
  if (value === 0) return t('pricing.sessionReplay.none')
  if (typeof value === 'number') {
    return t('pricing.sessionReplay.included', {
      amount: formatEventsLong(value),
    })
  }
  return t('pricing.sessionReplay.customQuota')
}

const getPlanName = (planType: PlanTypeCode, t: TFunction) =>
  t(`pricing.planTypes.${planType}.name`)

const getCheckoutErrorMessage = (
  error: string | undefined,
  t: TFunction,
) => {
  if (error?.startsWith('billing.')) {
    return t(error)
  }

  return error || t('billing.checkoutPreparationError')
}

const getSelectionRank = (
  planType: PlanTypeCode,
  eventTier: EventTierCode,
) => PLAN_TYPES[planType].sortOrder * 100 + EVENT_TIERS[eventTier].sortOrder

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

  const currentPlanType = getEffectivePlanType(user?.planType, user?.planCode)
  const currentEventTier =
    getEventTierByPlanCode(user?.planCode)?.code || '100k'

  const [selectedPlanType, setSelectedPlanType] =
    useState<PlanTypeCode>(currentPlanType)
  const [selectedEventTier, setSelectedEventTier] =
    useState<EventTierCode>(currentEventTier)
  const [selectedBillingFrequency, setSelectedBillingFrequency] =
    useState<BillingInterval>(
      (user?.billingFrequency as BillingInterval) || BillingFrequency.monthly,
    )
  const [selectionLoading, setSelectionLoading] = useState(false)
  const [
    isNewPlanConfirmationModalOpened,
    setIsNewPlanConfirmationModalOpened,
  ] = useState(false)
  const [pendingSelection, setPendingSelection] =
    useState<PendingSelection | null>(null)
  const [showDowngradeModal, setShowDowngradeModal] = useState(false)

  useEffect(() => {
    setSelectedPlanType(currentPlanType)
    setSelectedEventTier(currentEventTier)
    setSelectedBillingFrequency(
      (user?.billingFrequency as BillingInterval) || BillingFrequency.monthly,
    )
  }, [currentEventTier, currentPlanType, user?.billingFrequency])

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

  const closeUpdateModal = useCallback(
    (force?: boolean) => {
      if (isSubUpdating && !force) return
      setIsNewPlanConfirmationModalOpened(false)
      setPendingSelection(null)
    },
    [isSubUpdating],
  )

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
      toast.error(t('billing.subscriptionUpdateError'))
      closeUpdateModal(true)
    }
  }, [changePlanFetcher.data, closeUpdateModal, loadUser, t])

  useEffect(() => {
    if (previewFetcher.data?.error) {
      console.error(
        '[ERROR] An error occured while loading subscription update pricing preview:',
        previewFetcher.data.error,
      )
      toast.error(t('billing.pricingPreviewError'))
    }
  }, [previewFetcher.data?.error, t])

  useEffect(() => {
    if (
      generatePayLinkFetcher.data?.success &&
      generatePayLinkFetcher.data?.data
    ) {
      const url = (generatePayLinkFetcher.data.data as any).url

      const opened = openCheckout({
        override: url,
        locale: paddleLanguageMapping[language] || language,
        title: t('pricing.selectedPlanWithEvents', {
          plan: getPlanName(selectedPlanType, t),
          events: formatEventsLong(EVENT_TIERS[selectedEventTier].monthlyEvents),
        }),
        displayModeTheme: theme,
        country: metainfo.country,
      })

      if (!opened) {
        toast.error(t('billing.paddleStillLoading'))
        setSelectionLoading(false)
      }

      generatePayLinkFetcher.data = undefined
    } else if (generatePayLinkFetcher.data?.error) {
      console.error(
        '[ERROR] An error occured while generating pay link:',
        generatePayLinkFetcher.data.error,
      )
      toast.error(
        getCheckoutErrorMessage(generatePayLinkFetcher.data.error, t),
      )
      setSelectionLoading(false)
    }
  }, [
    generatePayLinkFetcher.data,
    language,
    metainfo.country,
    openCheckout,
    selectedEventTier,
    selectedPlanType,
    t,
    theme,
  ])

  const currencyCode = (
    (user?.tierCurrency || metainfo.code) in CURRENCIES
      ? user?.tierCurrency || metainfo.code
      : 'USD'
  ) as CurrencyCode
  const currency = CURRENCIES[currencyCode]
  const selectedPrice = getPlanPrice(
    selectedPlanType,
    selectedEventTier,
    selectedBillingFrequency,
    currencyCode,
  )
  const selectedMonthlyPrice = getPlanMonthlyPrice(
    selectedPlanType,
    selectedEventTier,
    selectedBillingFrequency,
    currencyCode,
  )
  const currentPlanLimit = user?.planCode ? PLAN_LIMITS[user.planCode] : null
  const currentEvents = currentPlanLimit?.monthlyUsageLimit || 0
  const selectedEvents = EVENT_TIERS[selectedEventTier].monthlyEvents
  const selectedReplayQuota = getIncludedSessionReplays(
    selectedPlanType,
    selectedEventTier,
  )
  const isTrialingPaidPlan =
    !!user?.trialEndDate &&
    !['none', 'trial', 'free'].includes(user?.planCode || '') &&
    dayjs(user.trialEndDate).isAfter(dayjs())
  const sameSelection =
    user?.planCode === EVENT_TIERS[selectedEventTier].planCode &&
    currentPlanType === selectedPlanType &&
    user?.billingFrequency === selectedBillingFrequency
  const currentRank = getSelectionRank(currentPlanType, currentEventTier)
  const selectedRank = getSelectionRank(selectedPlanType, selectedEventTier)
  const isDowngrade =
    !user?.cancellationEffectiveDate && selectedRank < currentRank
  const isUnpaid = ['free', 'trial', 'none'].includes(user?.planCode || '')
  const cannotSelfServe =
    selectedPlanType === 'enterprise' || !selectedPrice?.paddlePlanId

  useEffect(() => {
    if (!lastEvent) return

    const lastEventHandler = async (eventData: { event: string }) => {
      if (_isNil(eventData)) return
      if (eventData.event === 'Checkout.Complete') {
        setTimeout(async () => {
          await loadUser()
          toast.success(t('apiNotifications.subscriptionUpdated'))
        }, 3000)
        setSelectionLoading(false)
      } else if (eventData.event === 'Checkout.Close') {
        setSelectionLoading(false)
      }
    }
    lastEventHandler(lastEvent)
  }, [lastEvent, t, loadUser])

  const submitSelection = (
    intent:
      | 'preview-subscription-update'
      | 'change-subscription-plan'
      | 'generate-pay-link',
    selection: PendingSelection,
  ) => {
    const formData = new FormData()
    formData.set('intent', intent)
    formData.set('planType', selection.planType)
    formData.set('eventTier', selection.eventTier)
    formData.set('billingFrequency', selection.billingFrequency)
    formData.set('currency', selection.currency)

    if (intent === 'preview-subscription-update') {
      previewFetcher.submit(formData, { method: 'POST', action: '/user-settings' })
    } else if (intent === 'change-subscription-plan') {
      changePlanFetcher.submit(formData, {
        method: 'POST',
        action: '/user-settings',
      })
    } else {
      generatePayLinkFetcher.submit(formData, {
        method: 'POST',
        action: '/user-settings',
      })
    }
  }

  const selectedSelection: PendingSelection = {
    planType: selectedPlanType,
    eventTier: selectedEventTier,
    billingFrequency: selectedBillingFrequency,
    currency: currencyCode,
  }

  const onPlanChange = async () => {
    if (!user || selectionLoading || sameSelection) return

    if (cannotSelfServe || !selectedPrice?.paddlePlanId) {
      toast.error(t('billing.planNotConfiguredForCheckout'))
      return
    }

    if (
      user.subID &&
      !user.cancellationEffectiveDate &&
      user.planCode !== 'none'
    ) {
      if (isTrialingPaidPlan) {
        toast.error(t('billing.cannotChangePlanDuringTrial'))
        return
      }

      setPendingSelection(selectedSelection)
      setIsNewPlanConfirmationModalOpened(true)
      submitSelection('preview-subscription-update', selectedSelection)
      return
    }

    setSelectionLoading(true)
    submitSelection('generate-pay-link', selectedSelection)
  }

  const updateSubscription = () => {
    if (!pendingSelection) return
    submitSelection('change-subscription-plan', pendingSelection)
  }

  const getActionLabel = (): string => {
    if (selectedPlanType === 'enterprise') {
      return t('pricing.contactUs')
    }

    if (!selectedPrice?.paddlePlanId) {
      return t('pricing.contactUs')
    }

    if (user?.cancellationEffectiveDate || isUnpaid) {
      return t('pricing.subscribe')
    }

    if (sameSelection) {
      return t('pricing.yourPlan')
    }

    if (selectedRank > currentRank) {
      return t('pricing.upgrade')
    }

    if (isDowngrade) {
      return t('pricing.downgrade')
    }

    return selectedBillingFrequency === BillingFrequency.monthly
      ? t('pricing.switchToMonthly')
      : t('pricing.switchToYearly')
  }

  const yearlyDiscount = useMemo(() => {
    const monthlyPrice = getPlanPrice(
      selectedPlanType,
      selectedEventTier,
      'monthly',
      currencyCode,
    )?.amount
    const yearlyPrice = getPlanPrice(
      selectedPlanType,
      selectedEventTier,
      'yearly',
      currencyCode,
    )?.amount

    if (!monthlyPrice || !yearlyPrice) return 0

    const annualCostIfMonthly = monthlyPrice * 12
    const savings = annualCostIfMonthly - yearlyPrice
    const discountPercentage = (savings / annualCostIfMonthly) * 100

    return _round(discountPercentage, 0)
  }, [currencyCode, selectedEventTier, selectedPlanType])

  const toggleBillingFrequency = () => {
    setSelectedBillingFrequency((currentFrequency) =>
      currentFrequency === 'yearly' ? 'monthly' : 'yearly',
    )
  }

  const actionLabel = getActionLabel()

  return (
    <>
      <div className='rounded-xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-white/10 dark:bg-slate-950'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <Text as='h2' size='2xl' weight='bold'>
              {t('common.billing')}
            </Text>
            <Text as='p' size='sm' colour='secondary' className='mt-1'>
              {t('pricing.planWithEvents', {
                plan: getPlanName(currentPlanType, t),
                events: formatEventsLong(currentEvents),
              })}
            </Text>
          </div>
          <button
            type='button'
            onClick={toggleBillingFrequency}
            className='flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 transition-colors hover:bg-gray-200 dark:border-white/10 dark:bg-slate-900 dark:hover:bg-slate-800'
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
              checked={selectedBillingFrequency === BillingFrequency.yearly}
              visualOnly
            />
          </button>
        </div>

        <div className='mt-5 grid gap-3 lg:grid-cols-3'>
          {planTypeOptions.map((planType) => {
            const entitlements = PLAN_ENTITLEMENTS[planType]
            const isSelected = selectedPlanType === planType
            const planMonthlyPrice =
              planType === 'enterprise'
                ? null
                : getPlanMonthlyPrice(
                    planType,
                    selectedEventTier,
                    selectedBillingFrequency,
                    currencyCode,
                  )

            return (
              <button
                key={planType}
                type='button'
                onClick={() => setSelectedPlanType(planType)}
                className={cn(
                  'rounded-lg p-4 text-left ring-1 ring-inset transition-all duration-150',
                  planType === 'enterprise'
                    ? 'bg-slate-900 text-gray-50 ring-slate-700 dark:bg-slate-900 dark:text-gray-50 dark:ring-slate-700'
                    : 'bg-gray-50 text-gray-950 ring-gray-200 hover:ring-gray-300 dark:bg-slate-900 dark:text-gray-50 dark:ring-slate-700 dark:hover:ring-slate-600',
                  isSelected && 'ring-2 ring-slate-900 dark:ring-slate-100',
                )}
              >
                <div className='flex items-center justify-between gap-2'>
                  <Text as='span' size='base' weight='semibold' colour='inherit'>
                    {getPlanName(planType, t)}
                  </Text>
                </div>
                <Text as='span' size='sm' colour='inherit' className='mt-3 block'>
                  {planType === 'enterprise'
                    ? t('pricing.custom')
                    : `${currency.symbol}${formatPrice(planMonthlyPrice)}/${t(
                        'pricing.perMonth',
                      )}`}
                </Text>
                <Text
                  as='span'
                  size='xs'
                  colour='inherit'
                  className='mt-1 block text-gray-500 dark:text-gray-400'
                >
                  {typeof entitlements.websites === 'number'
                    ? t('pricing.websiteCount', {
                        count: entitlements.websites,
                      })
                    : t('pricing.customLimits')}
                </Text>
              </button>
            )
          })}
        </div>

        <div className='mt-6'>
          <Text as='p' size='sm' weight='medium' colour='secondary'>
            {t('pricing.eventVolume')}
          </Text>
          <div className='mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6'>
            {EVENT_TIER_CODES.map((eventTier) => {
              const tier = EVENT_TIERS[eventTier]
              const isSelected = selectedEventTier === eventTier
              return (
                <button
                  key={eventTier}
                  type='button'
                  onClick={() => setSelectedEventTier(eventTier)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-left text-sm font-medium ring-1 ring-inset transition-colors',
                    isSelected
                      ? 'bg-slate-900 text-gray-50 ring-slate-900 dark:bg-slate-100 dark:text-slate-950 dark:ring-slate-100'
                      : 'bg-gray-50 text-gray-700 ring-gray-200 hover:bg-gray-100 dark:bg-slate-900 dark:text-gray-200 dark:ring-slate-700 dark:hover:bg-slate-800',
                  )}
                >
                  {formatEventsLong(tier.monthlyEvents)}
                </button>
              )
            })}
          </div>
        </div>

        <div className='mt-6 rounded-lg bg-gray-50 p-4 ring-1 ring-gray-200 ring-inset dark:bg-slate-900 dark:ring-slate-700'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <Text as='p' size='base' weight='semibold'>
                {t('pricing.selectedPlanWithEvents', {
                  plan: getPlanName(selectedPlanType, t),
                  events: formatEventsLong(selectedEvents),
                })}
              </Text>
              <Text as='p' size='sm' colour='secondary' className='mt-1'>
                {typeof PLAN_ENTITLEMENTS[selectedPlanType].websites === 'number'
                  ? t('pricing.websiteCount', {
                      count: PLAN_ENTITLEMENTS[selectedPlanType].websites,
                    })
                  : t('pricing.customLimits')}
                , {formatReplayQuota(selectedReplayQuota, t)}
              </Text>
            </div>
            <div className='flex flex-col items-start gap-3 sm:items-end'>
              <Text as='p' size='2xl' weight='bold'>
                {selectedPlanType === 'enterprise'
                  ? t('pricing.custom')
                  : `${currency.symbol}${formatPrice(selectedMonthlyPrice)}/${t(
                      'pricing.perMonth',
                    )}`}
              </Text>
              {cannotSelfServe ? (
                <Button to={routes.contact} size='sm' className='gap-1'>
                  {t('pricing.contactUs')}
                  <ArrowRightIcon className='size-4' />
                </Button>
              ) : (
                <Button
                  size='sm'
                  onClick={() => {
                    if (actionLabel === t('pricing.downgrade')) {
                      setShowDowngradeModal(true)
                    } else {
                      onPlanChange()
                    }
                  }}
                  type='button'
                  loading={selectionLoading}
                  disabled={selectionLoading || sameSelection || !isAuthenticated}
                  className='gap-1'
                >
                  {actionLabel}
                  {!sameSelection ? <ArrowRightIcon className='size-4' /> : null}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className='mt-6 grid gap-4 lg:grid-cols-2'>
          <div>
            <Text as='p' size='sm' weight='semibold'>
              {t('pricing.addons.websiteTitle')}
            </Text>
            <div className='mt-3 space-y-2'>
              {ADDONS.websiteBundles.map((bundle) => (
                <div
                  key={bundle.code}
                  className='flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-gray-200 ring-inset dark:bg-slate-900 dark:ring-slate-700'
                >
                  <div className='flex items-center gap-2'>
                    <CheckIcon className='size-4 text-gray-500 dark:text-gray-400' />
                    <Text as='span' size='sm'>
                      {t(bundle.labelKey, {
                        amount: formatEventsLong(bundle.quantity),
                      })}
                    </Text>
                  </div>
                  <Text as='span' size='sm' colour='secondary'>
                    {currency.symbol}
                    {formatPrice(bundle.monthly[currencyCode])}/{t('pricing.perMonth')}
                  </Text>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Text as='p' size='sm' weight='semibold'>
              {t('pricing.addons.sessionReplayTitle')}
            </Text>
            <div className='mt-3 space-y-2'>
              {ADDONS.sessionReplayBundles.map((bundle) => (
                <div
                  key={bundle.code}
                  className='flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-gray-200 ring-inset dark:bg-slate-900 dark:ring-slate-700'
                >
                  <div className='flex items-center gap-2'>
                    <CheckIcon className='size-4 text-gray-500 dark:text-gray-400' />
                    <Text as='span' size='sm'>
                      {t(bundle.labelKey, {
                        amount: formatEventsLong(bundle.quantity),
                      })}
                    </Text>
                  </div>
                  <Text as='span' size='sm' colour='secondary'>
                    {currency.symbol}
                    {formatPrice(bundle.monthly[currencyCode])}/{t('pricing.perMonth')}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className='checkout-container' id='checkout-container' />

      <Modal
        onClose={() => setShowDowngradeModal(false)}
        onSubmit={() => {
          setShowDowngradeModal(false)
          onPlanChange()
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
              <Text as='p' className='whitespace-pre-line'>
                <Trans
                  t={t}
                  i18nKey='billing.previewLoadingError'
                  values={{ email: CONTACT_EMAIL }}
                  components={{
                    mail: (
                      <a
                        title={t('ariaLabels.emailSupportTitle', {
                          email: CONTACT_EMAIL,
                        })}
                        aria-label={t('ariaLabels.emailSupport')}
                        href={`mailto:${CONTACT_EMAIL}`}
                        className='font-medium underline decoration-dashed hover:decoration-solid'
                      />
                    ),
                  }}
                />
              </Text>
            ) : null}
            {subUpdatePreview && typeof subUpdatePreview === 'object' ? (
              <div>
                <Text as='h2' size='base' weight='bold'>
                  {t('billing.dueNow')}
                </Text>
                <Text as='p' size='sm'>
                  {t('billing.dueNowDescription')}
                </Text>
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
                  <Text as='p' className='mt-2 italic'>
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
                  </Text>
                ) : null}
                <Text as='h2' size='base' weight='bold' className='mt-5'>
                  {t('billing.nextPayment')}
                </Text>
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
