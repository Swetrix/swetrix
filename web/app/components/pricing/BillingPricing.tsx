import dayjs from 'dayjs'
import _isNil from 'lodash/isNil'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import type { TFunction } from 'i18next'
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import {
  PricingInternal,
  type MarketingPricingSelection,
} from '~/components/pricing/MarketingPricing'
import {
  CONTACT_EMAIL,
  paddleLanguageMapping,
  PLAN_LIMITS,
} from '~/lib/constants'
import { Metainfo, DEFAULT_METAINFO } from '~/lib/models/Metainfo'
import type { UsageInfo } from '~/lib/models/Usageinfo'
import {
  EVENT_TIERS,
  PLAN_TYPES,
  getEffectivePlanType,
  getEventTierByPlanCode,
  getPlanPrice,
  type EventTierCode,
  type PlanTypeCode,
} from '~/lib/pricing/catalog'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
import type { UserSettingsActionData } from '~/routes/user-settings'
import Button from '~/ui/Button'
import { FAQ } from '~/ui/FAQ'
import { Link } from '~/ui/Link'
import Loader from '~/ui/Loader'
import Modal from '~/ui/Modal'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'

interface BillingPricingProps {
  lastEvent?: { event: string } | null
  metainfo?: Metainfo
  usageInfo?: UsageInfo | null
  openCheckout: (options: Record<string, any>) => boolean
}

type PendingSelection = MarketingPricingSelection

const formatEventsLong = (value: number): string =>
  value.toLocaleString('en-US')

const getPlanName = (planType: PlanTypeCode, t: TFunction) =>
  t(`pricing.planTypes.${planType}.name`)

const getCheckoutErrorMessage = (error: string | undefined, t: TFunction) => {
  if (error?.startsWith('billing.')) {
    return t(error)
  }

  return error || t('billing.checkoutPreparationError')
}

const getSelectionRank = (planType: PlanTypeCode, eventTier: EventTierCode) =>
  PLAN_TYPES[planType].sortOrder * 100 + EVENT_TIERS[eventTier].sortOrder

const BillingPricing = ({
  lastEvent,
  metainfo = DEFAULT_METAINFO,
  usageInfo,
  openCheckout,
}: BillingPricingProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { user, loadUser } = useAuth()
  const { theme } = useTheme()

  const previewFetcher = useFetcher<UserSettingsActionData>()
  const changePlanFetcher = useFetcher<UserSettingsActionData>()
  const generatePayLinkFetcher = useFetcher<UserSettingsActionData>()

  const currentPlanType = getEffectivePlanType(user?.planType, user?.planCode)
  const currentEventTier =
    getEventTierByPlanCode(user?.planCode)?.code || '100k'
  const currentPlanLimit = user?.planCode ? PLAN_LIMITS[user.planCode] : null
  const hasPaidPlan = !['none', 'trial', 'free'].includes(user?.planCode || '')

  const [activeSelection, setActiveSelection] =
    useState<PendingSelection | null>(null)
  const [selectionLoading, setSelectionLoading] =
    useState<PendingSelection | null>(null)
  const [
    isNewPlanConfirmationModalOpened,
    setIsNewPlanConfirmationModalOpened,
  ] = useState(false)
  const [pendingSelection, setPendingSelection] =
    useState<PendingSelection | null>(null)
  const [downgradeSelection, setDowngradeSelection] =
    useState<PendingSelection | null>(null)

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
      const checkoutSelection = activeSelection || selectionLoading

      const opened = openCheckout({
        override: url,
        locale: paddleLanguageMapping[language] || language,
        title: checkoutSelection
          ? t('pricing.selectedPlanWithEvents', {
              plan: getPlanName(checkoutSelection.planType, t),
              events: formatEventsLong(
                EVENT_TIERS[checkoutSelection.eventTier].monthlyEvents,
              ),
            })
          : t('pricing.title'),
        displayModeTheme: theme,
        country: metainfo.country,
      })

      if (!opened) {
        toast.error(t('billing.paddleStillLoading'))
        setSelectionLoading(null)
      }

      generatePayLinkFetcher.data = undefined
    } else if (generatePayLinkFetcher.data?.error) {
      console.error(
        '[ERROR] An error occured while generating pay link:',
        generatePayLinkFetcher.data.error,
      )
      toast.error(getCheckoutErrorMessage(generatePayLinkFetcher.data.error, t))
      setSelectionLoading(null)
    }
  }, [
    activeSelection,
    generatePayLinkFetcher.data,
    language,
    metainfo.country,
    openCheckout,
    selectionLoading,
    t,
    theme,
  ])

  useEffect(() => {
    if (!lastEvent) return

    const lastEventHandler = async (eventData: { event: string }) => {
      if (_isNil(eventData)) return
      if (eventData.event === 'Checkout.Complete') {
        setTimeout(async () => {
          await loadUser()
          toast.success(t('apiNotifications.subscriptionUpdated'))
        }, 3000)
        setSelectionLoading(null)
        setActiveSelection(null)
      } else if (eventData.event === 'Checkout.Close') {
        setSelectionLoading(null)
      }
    }
    lastEventHandler(lastEvent)
  }, [lastEvent, t, loadUser])

  const isTrialingPaidPlan =
    !!user?.trialEndDate &&
    hasPaidPlan &&
    dayjs(user.trialEndDate).isAfter(dayjs())

  const hasActiveSubscription =
    !!user?.subID && !user.cancellationEffectiveDate && hasPaidPlan

  const choosePlanDescription = hasPaidPlan
    ? t('billing.choosePlanCurrentPlanDesc', {
        plan: getPlanName(currentPlanType, t),
        events: formatEventsLong(currentPlanLimit?.monthlyUsageLimit || 0),
      })
    : t('billing.choosePlanPageDesc')

  const getSelectionMeta = (selection: PendingSelection) => {
    const selectedPrice = getPlanPrice(
      selection.planType,
      selection.eventTier,
      selection.billingFrequency,
      selection.currency,
    )
    const sameSelection =
      user?.planCode === EVENT_TIERS[selection.eventTier].planCode &&
      currentPlanType === selection.planType &&
      user?.billingFrequency === selection.billingFrequency
    const currentRank = getSelectionRank(currentPlanType, currentEventTier)
    const selectedRank = getSelectionRank(
      selection.planType,
      selection.eventTier,
    )

    return {
      selectedPrice,
      sameSelection,
      selectedRank,
      isDowngrade:
        !user?.cancellationEffectiveDate && selectedRank < currentRank,
      cannotSelfServe:
        selection.planType === 'enterprise' || !selectedPrice?.paddlePlanId,
    }
  }

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
      previewFetcher.submit(formData, {
        method: 'POST',
        action: '/user-settings',
      })
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

  const startPlanChange = (selection: PendingSelection) => {
    setActiveSelection(selection)

    if (hasActiveSubscription) {
      if (isTrialingPaidPlan) {
        toast.error(t('billing.cannotChangePlanDuringTrial'))
        return
      }

      setPendingSelection(selection)
      setIsNewPlanConfirmationModalOpened(true)
      submitSelection('preview-subscription-update', selection)
      return
    }

    setSelectionLoading(selection)
    submitSelection('generate-pay-link', selection)
  }

  const handlePlanSelection = (selection: PendingSelection) => {
    const { cannotSelfServe, isDowngrade, sameSelection } =
      getSelectionMeta(selection)

    if (selectionLoading || sameSelection) return

    if (cannotSelfServe) {
      toast.error(t('billing.planNotConfiguredForCheckout'))
      return
    }

    if (isTrialingPaidPlan) {
      toast.error(t('billing.cannotChangePlanDuringTrial'))
      return
    }

    if (isDowngrade) {
      setDowngradeSelection(selection)
      return
    }

    startPlanChange(selection)
  }

  const updateSubscription = () => {
    if (!pendingSelection) return
    submitSelection('change-subscription-plan', pendingSelection)
  }

  const getActionLabel = (selection: MarketingPricingSelection): string => {
    const { cannotSelfServe, isDowngrade, sameSelection, selectedRank } =
      getSelectionMeta(selection)
    const currentRank = getSelectionRank(currentPlanType, currentEventTier)

    if (cannotSelfServe) {
      return t('pricing.contactUs')
    }

    if (user?.cancellationEffectiveDate || !hasPaidPlan) {
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

    return selection.billingFrequency === 'monthly'
      ? t('pricing.switchToMonthly')
      : t('pricing.switchToYearly')
  }

  const faqItems = useMemo(() => {
    const faqValues = {
      lowestPlanEventsAmount:
        EVENT_TIERS['100k'].monthlyEvents.toLocaleString('en-US'),
      moderatePlanEventsAmount:
        EVENT_TIERS['500k'].monthlyEvents.toLocaleString('en-US'),
    }

    const sharedItems = [0, 1, 4].map((idx) => ({
      question: (
        <Trans t={t} i18nKey={`main.faq.items.${idx}.q`} values={faqValues} />
      ),
      answer: (
        <Trans t={t} i18nKey={`main.faq.items.${idx}.a`} values={faqValues} />
      ),
    }))

    const currentUsageItem = {
      question: t('billing.currentUsageFaqQuestion'),
      answer: (
        <p>
          <Trans
            t={t}
            i18nKey='billing.currentUsageFaqAnswer'
            values={{
              events: formatEventsLong(usageInfo?.last30Days?.total || 0),
            }}
            components={{
              subscriptionLink: (
                <Link
                  to={`${routes.user_settings}?tab=billing`}
                  className='font-medium underline decoration-dashed hover:decoration-solid'
                />
              ),
            }}
          />
        </p>
      ),
    }

    return [sharedItems[0]!, currentUsageItem, ...sharedItems.slice(1)]
  }, [t, usageInfo?.last30Days?.total])

  return (
    <>
      <main className='min-h-min-footer bg-gray-50 pb-16 dark:bg-slate-950'>
        <div className='mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8'>
          <div className='grid gap-6 lg:grid-cols-[1fr_minmax(0,40rem)_1fr] lg:items-start'>
            <Button
              to={`${routes.user_settings}?tab=billing`}
              variant='ghost'
              size='sm'
              className='w-fit gap-1 justify-self-start lg:mt-1'
            >
              <ArrowLeftIcon className='size-4' />
              {t('billing.backToBilling')}
            </Button>

            <div className='mx-auto max-w-3xl text-center'>
              <Text
                as='h1'
                size='3xl'
                weight='bold'
                colour='primary'
                className='text-balance sm:text-4xl'
              >
                {t('billing.choosePlanTitle')}
              </Text>
              <Text
                as='p'
                size='base'
                colour='secondary'
                className='mt-4 text-pretty'
              >
                {choosePlanDescription}
              </Text>
            </div>

            <div aria-hidden='true' />
          </div>
        </div>

        <div className='mt-2'>
          <PricingInternal
            metainfo={metainfo}
            onSelectPlan={handlePlanSelection}
            getActionLabel={getActionLabel}
            loadingPlanType={selectionLoading?.planType ?? null}
            disabled={Boolean(selectionLoading)}
          />
        </div>

        <div className='mx-auto w-full max-w-4xl px-4 pt-10 sm:px-6 lg:px-8'>
          <Text as='h2' size='2xl' weight='bold'>
            {t('billing.planFaqTitle')}
          </Text>
          <FAQ items={faqItems} className='mt-3' defaultOpenFirst />
        </div>
      </main>

      <div className='checkout-container' id='checkout-container' />

      <Modal
        onClose={() => setDowngradeSelection(null)}
        onSubmit={() => {
          if (!downgradeSelection) return
          const selection = downgradeSelection
          setDowngradeSelection(null)
          startPlanChange(selection)
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
        isOpened={Boolean(downgradeSelection)}
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
