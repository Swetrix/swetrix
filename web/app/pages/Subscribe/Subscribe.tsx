import {
  ArrowRightIcon,
  BellIcon,
  CheckIcon,
  CreditCardIcon,
  RocketLaunchIcon,
  StarIcon,
} from '@phosphor-icons/react'
import type { TFunction } from 'i18next'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useFetcher, useLoaderData, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { usePaddle } from '~/hooks/usePaddle'
import { CURRENCIES, paddleLanguageMapping, TRIAL_DAYS } from '~/lib/constants'
import {
  EVENT_TIER_CODES,
  EVENT_TIERS,
  PLAN_ENTITLEMENTS,
  SELF_SERVE_PLAN_TYPES,
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
import type { SubscribeLoaderData } from '~/routes/subscribe'
import Button from '~/ui/Button'
import { FAQ } from '~/ui/FAQ'
import { Switch } from '~/ui/Switch'
import { Text } from '~/ui/Text'
import { trackCustom } from '~/utils/analytics'
import { cn } from '~/utils/generic'
import routes from '~/utils/routes'

const INITIAL_VISIBLE_TIERS = 4

const formatEventsLong = (value: number, locale = 'en-US') =>
  value.toLocaleString(locale)

const formatPrice = (amount: number | null) => {
  if (amount === null) return null
  return Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2)
}

const formatReplayQuota = (
  value: number | string,
  t: TFunction,
  locale = 'en-US',
) => {
  if (value === 0) return t('pricing.sessionReplay.none')
  if (typeof value === 'number') {
    return t('pricing.sessionReplay.included', {
      amount: formatEventsLong(value, locale),
    })
  }
  return t('pricing.sessionReplay.customQuota')
}

const getPlanName = (planType: PlanTypeCode, t: TFunction) =>
  t(`pricing.planTypes.${planType}.name`)

const getCheckoutErrorMessage = (error: string | undefined, t: TFunction) => {
  if (error?.startsWith('billing.')) {
    return t(error)
  }

  return error || t('billing.checkoutPreparationError')
}

const Subscribe = () => {
  const { t, i18n } = useTranslation('common')
  const { theme } = useTheme()
  const { user, loadUser } = useAuth()
  const navigate = useNavigate()
  const { metainfo } = useLoaderData<SubscribeLoaderData>()

  const [selectedPlanType, setSelectedPlanType] =
    useState<PlanTypeCode>('standard')
  const [selectedEventTier, setSelectedEventTier] =
    useState<EventTierCode>('100k')
  const [selectedBillingFrequency, setSelectedBillingFrequency] =
    useState<BillingInterval>('monthly')
  const [showAllTiers, setShowAllTiers] = useState(false)
  const [hasCompletedCheckout, setHasCompletedCheckout] = useState(false)

  const onPaddleEvent = useCallback(
    (eventData: any) => {
      if (eventData?.event === 'Checkout.Complete') {
        setHasCompletedCheckout(true)
      }
    },
    [setHasCompletedCheckout],
  )

  const { isPaddleLoaded, paddleLoadError, openCheckout } = usePaddle({
    onEvent: onPaddleEvent,
  })

  const currencyCode = (
    (user?.tierCurrency || metainfo.code) in CURRENCIES
      ? user?.tierCurrency || metainfo.code
      : 'USD'
  ) as CurrencyCode
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD
  const selectedPrice = getPlanPrice(
    selectedPlanType,
    selectedEventTier,
    selectedBillingFrequency,
    currencyCode,
  )
  const monthlyPrice = getPlanMonthlyPrice(
    selectedPlanType,
    selectedEventTier,
    selectedBillingFrequency,
    currencyCode,
  )
  const replayQuota = getIncludedSessionReplays(
    selectedPlanType,
    selectedEventTier,
  )

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!hasCompletedCheckout) return

    let attempts = 0
    const maxPollAttempts = 30

    pollRef.current = setInterval(async () => {
      attempts += 1

      try {
        const freshUser = await loadUser()

        if (freshUser?.planCode && freshUser.planCode !== 'none') {
          if (pollRef.current) clearInterval(pollRef.current)
          navigate(routes.dashboard)
          return
        }
      } catch (error) {
        void error
      }

      if (attempts >= maxPollAttempts) {
        if (pollRef.current) clearInterval(pollRef.current)
        navigate(routes.dashboard)
      }
    }, 2000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [hasCompletedCheckout, navigate, loadUser])

  const generatePayLinkFetcher = useFetcher<any>()

  useEffect(() => {
    if (
      generatePayLinkFetcher.data?.success &&
      generatePayLinkFetcher.data?.data
    ) {
      const url = generatePayLinkFetcher.data.data.url

      const opened = openCheckout({
        override: url,
        locale: paddleLanguageMapping[i18n.language] || i18n.language,
        displayModeTheme: theme,
        country: metainfo.country,
      })

      if (!opened) {
        toast.error(t('apiNotifications.somethingWentWrong'))
      }

      generatePayLinkFetcher.data = undefined
    } else if (generatePayLinkFetcher.data?.error) {
      toast.error(getCheckoutErrorMessage(generatePayLinkFetcher.data.error, t))
    }
  }, [
    generatePayLinkFetcher.data,
    openCheckout,
    i18n.language,
    theme,
    metainfo.country,
    t,
  ])

  const handleStartCheckout = () => {
    trackCustom('SUBSCRIBE_START_CHECKOUT', {
      planType: selectedPlanType,
      eventTier: selectedEventTier,
      billingFrequency: selectedBillingFrequency,
      currency: currencyCode,
      paddleLoadError,
      isPaddleLoaded,
      paddleWindowExists: !!(window as any).Paddle,
    })

    if (!selectedPrice?.paddlePlanId) {
      toast.error(t('billing.planNotConfiguredForCheckout'))
      return
    }

    if (paddleLoadError) {
      toast.error(t('billing.paddleLoadError'))
      return
    }

    if (!isPaddleLoaded || !(window as any).Paddle) {
      toast.error(t('billing.paddleStillLoading'))
      return
    }

    generatePayLinkFetcher.submit(
      {
        intent: 'generate-pay-link',
        planType: selectedPlanType,
        eventTier: selectedEventTier,
        billingFrequency: selectedBillingFrequency,
        currency: currencyCode,
      },
      { method: 'POST', action: '/user-settings' },
    )
  }

  const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const formattedEndDate = dateFormatter.format(
    new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
  )

  const dueEndAmount = selectedPrice?.amount ?? 0

  const faqItems = useMemo(() => {
    const faqValues = {
      lowestPlanEventsAmount:
        EVENT_TIERS['100k'].monthlyEvents.toLocaleString('en-US'),
      moderatePlanEventsAmount:
        EVENT_TIERS['500k'].monthlyEvents.toLocaleString('en-US'),
    }

    return [0, 1, 4].map((idx) => ({
      question: (
        <Trans t={t} i18nKey={`main.faq.items.${idx}.q`} values={faqValues} />
      ),
      answer: (
        <Trans t={t} i18nKey={`main.faq.items.${idx}.a`} values={faqValues} />
      ),
    }))
  }, [t])

  const visibleTiers = showAllTiers
    ? EVENT_TIER_CODES
    : EVENT_TIER_CODES.slice(0, INITIAL_VISIBLE_TIERS)

  return (
    <div className='flex min-h-screen flex-col items-center bg-gray-50 p-4 lg:p-8 dark:bg-slate-950'>
      <div className='grid w-full max-w-6xl grid-cols-1 items-start gap-12 lg:grid-cols-[1fr_380px] lg:gap-16'>
        <div className='flex flex-col gap-8'>
          <div>
            <Text as='h1' size='4xl' weight='bold'>
              {t('checkout.title')}
            </Text>
            <Text as='p' size='lg' colour='secondary' className='mt-2'>
              {t('checkout.subtitle', { days: TRIAL_DAYS })}
            </Text>

            <div className='mt-6 flex flex-col gap-3'>
              <div className='flex items-center gap-3'>
                <CheckIcon
                  className='size-5 shrink-0 text-green-500'
                  weight='bold'
                />
                <Text as='p' size='base'>
                  {t('auth.signup.features.realTimeAnalytics')}
                </Text>
              </div>
              <div className='flex items-center gap-3'>
                <CheckIcon
                  className='size-5 shrink-0 text-green-500'
                  weight='bold'
                />
                <Text as='p' size='base'>
                  {t('checkout.willRemind')}
                </Text>
              </div>
            </div>
          </div>

          <div>
            <div className='mb-3 flex items-center justify-between gap-3'>
              <Text as='p' size='sm' colour='secondary'>
                {t('checkout.selectPlan')}
              </Text>
              <button
                type='button'
                onClick={() =>
                  setSelectedBillingFrequency((frequency) =>
                    frequency === 'monthly' ? 'yearly' : 'monthly',
                  )
                }
                className='flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-2.5 py-1.5 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:hover:bg-slate-900'
              >
                <Text as='span' colour='secondary' size='xs' weight='medium'>
                  {t('pricing.billedYearly')}
                </Text>
                <span className='rounded-md bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-500/20 dark:text-green-300'>
                  -17%
                </span>
                <Switch
                  checked={selectedBillingFrequency === 'yearly'}
                  visualOnly
                />
              </button>
            </div>

            <div className='grid gap-2 sm:grid-cols-2'>
              {SELF_SERVE_PLAN_TYPES.map((planType) => {
                const entitlements = PLAN_ENTITLEMENTS[planType]
                const isSelected = selectedPlanType === planType
                const price = getPlanMonthlyPrice(
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
                      'rounded-lg bg-white p-4 text-left ring-1 transition-all duration-150 ring-inset dark:bg-slate-950',
                      isSelected
                        ? 'ring-2 ring-slate-900 dark:ring-slate-200'
                        : 'ring-gray-200 hover:ring-gray-300 dark:ring-slate-700 dark:hover:ring-slate-600',
                    )}
                  >
                    <div className='flex items-center justify-between gap-2'>
                      <Text as='span' size='base' weight='semibold'>
                        {getPlanName(planType, t)}
                      </Text>
                    </div>
                    <Text
                      as='span'
                      size='sm'
                      colour='secondary'
                      className='mt-3 block'
                    >
                      {currency.symbol}
                      {formatPrice(price)}/{t('pricing.perMonth')}
                    </Text>
                    <Text
                      as='span'
                      size='xs'
                      colour='muted'
                      className='mt-1 block'
                    >
                      {t('pricing.websiteCount', {
                        count: entitlements.websites,
                      })}
                      ,{' '}
                      {t('pricing.teamMemberCount', {
                        count: entitlements.teamMembers,
                      })}
                    </Text>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <Text as='p' size='sm' colour='secondary' className='mb-3'>
              {t('pricing.eventVolume')}
            </Text>
            <div className='grid gap-2 sm:grid-cols-2'>
              {visibleTiers.map((eventTier) => {
                const tier = EVENT_TIERS[eventTier]
                const isSelected = selectedEventTier === eventTier
                const price = getPlanMonthlyPrice(
                  selectedPlanType,
                  eventTier,
                  selectedBillingFrequency,
                  currencyCode,
                )

                return (
                  <button
                    key={eventTier}
                    type='button'
                    onClick={() => setSelectedEventTier(eventTier)}
                    className={cn(
                      'flex items-center justify-between rounded-lg bg-white px-4 py-3 text-left ring-1 transition-all duration-150 ring-inset dark:bg-slate-950',
                      isSelected
                        ? 'ring-2 ring-slate-900 dark:ring-slate-200'
                        : 'ring-gray-200 hover:ring-gray-300 dark:ring-slate-700 dark:hover:ring-slate-600',
                    )}
                  >
                    <Text as='span' size='sm' weight='semibold'>
                      {formatEventsLong(tier.monthlyEvents, i18n.language)}
                    </Text>
                    <Text as='span' size='sm' colour='secondary'>
                      {currency.symbol}
                      {formatPrice(price)}/{t('pricing.perMonth')}
                    </Text>
                  </button>
                )
              })}
            </div>

            <div className='mt-3'>
              <Button
                variant='ghost'
                size='xs'
                onClick={() => setShowAllTiers((value) => !value)}
              >
                {showAllTiers
                  ? t('common.showLess')
                  : t('common.showMore', {
                      count: EVENT_TIER_CODES.length - INITIAL_VISIBLE_TIERS,
                    })}
              </Button>
            </div>
          </div>

          <div className='rounded-lg bg-white p-4 ring-1 ring-gray-200 ring-inset dark:bg-slate-950 dark:ring-slate-800'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <Text as='p' size='base' weight='semibold'>
                  {getPlanName(selectedPlanType, t)}
                </Text>
                <Text as='p' size='sm' colour='secondary' className='mt-1'>
                  {formatEventsLong(
                    EVENT_TIERS[selectedEventTier].monthlyEvents,
                    i18n.language,
                  )}{' '}
                  {t('pricing.eventsWithReplay', {
                    replayQuota: formatReplayQuota(
                      replayQuota,
                      t,
                      i18n.language,
                    ),
                  })}
                </Text>
              </div>
              <Text as='p' size='2xl' weight='bold'>
                {currency.symbol}
                {formatPrice(monthlyPrice)}
                <Text as='span' size='sm' colour='secondary' weight='medium'>
                  /{t('pricing.perMonth')}
                </Text>
              </Text>
            </div>
          </div>

          <div className='flex flex-col gap-3 border-t border-gray-200 pt-6 dark:border-slate-800'>
            <div className='flex items-center justify-between'>
              <Text as='p' size='base' weight='semibold'>
                {t('checkout.dueToday', { days: TRIAL_DAYS })}
              </Text>
              <Text
                as='p'
                size='base'
                weight='bold'
                className='text-green-600 dark:text-green-500'
              >
                {currency.symbol}0
              </Text>
            </div>
            <div className='flex items-center justify-between'>
              <Text as='p' size='base'>
                {t('checkout.dueEnd', { date: formattedEndDate })}
              </Text>
              <Text as='p' size='base'>
                {currency.symbol}
                {formatPrice(dueEndAmount)}
                {selectedBillingFrequency === 'yearly'
                  ? `/${t('pricing.perYear')}`
                  : `/${t('pricing.perMonth')}`}
              </Text>
            </div>
          </div>

          <div className='pt-2'>
            {hasCompletedCheckout ? (
              <div className='rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-900/20'>
                <div className='flex items-center justify-center gap-2'>
                  <CheckIcon className='size-5 text-green-600 dark:text-green-400' />
                  <Text
                    as='p'
                    size='sm'
                    weight='semibold'
                    className='text-green-700 dark:text-green-300'
                  >
                    {t('common.success')}! {t('common.redirecting')}
                  </Text>
                </div>
              </div>
            ) : selectedPrice?.paddlePlanId ? (
              <Button
                size='xl'
                className='flex w-full items-center justify-center gap-1'
                onClick={handleStartCheckout}
                loading={generatePayLinkFetcher.state !== 'idle'}
                disabled={generatePayLinkFetcher.state !== 'idle'}
              >
                <span>{t('checkout.next')}</span>
                <ArrowRightIcon className='size-4 translate-y-px' />
              </Button>
            ) : (
              <Button
                to={routes.contact}
                size='xl'
                variant='secondary'
                className='flex w-full items-center justify-center gap-1'
              >
                <span>{t('pricing.contactUs')}</span>
                <ArrowRightIcon className='size-4 translate-y-px' />
              </Button>
            )}
          </div>

          <FAQ items={faqItems} />
        </div>

        <div className='hidden lg:block lg:pt-16'>
          <div className='rounded-lg bg-white p-6 ring-1 ring-gray-200 ring-inset dark:bg-slate-950 dark:ring-slate-800'>
            <div className='flex items-start gap-5'>
              <div className='relative flex flex-col items-center'>
                <div className='flex size-8 items-center justify-center'>
                  <RocketLaunchIcon
                    weight='duotone'
                    className='size-7 text-green-600 dark:text-green-500'
                  />
                </div>
                <div className='my-2 h-14 w-px bg-linear-to-b from-green-200 to-gray-200 dark:from-green-900/60 dark:to-slate-800' />
              </div>
              <div className='pt-1'>
                <Text as='p' size='sm' weight='bold'>
                  {t('onboarding.selectPlan.timeline.today')}
                </Text>
                <Text as='p' size='sm' colour='secondary' className='mt-1'>
                  {t('onboarding.selectPlan.timeline.todayDesc')}
                </Text>
              </div>
            </div>

            <div className='flex items-start gap-5'>
              <div className='relative flex flex-col items-center'>
                <div className='flex size-8 items-center justify-center'>
                  <BellIcon
                    weight='duotone'
                    className='size-7 text-amber-500 dark:text-amber-500/90'
                  />
                </div>
                <div className='my-2 h-14 w-px bg-gray-200 dark:bg-slate-800' />
              </div>
              <div className='pt-1'>
                <Text as='p' size='sm' weight='semibold'>
                  {t('onboarding.selectPlan.timeline.reminder', {
                    days: TRIAL_DAYS - 2,
                  })}
                </Text>
                <Text as='p' size='sm' colour='secondary' className='mt-1'>
                  {t('onboarding.selectPlan.timeline.reminderDesc')}
                </Text>
              </div>
            </div>

            <div className='flex items-start gap-5'>
              <div className='relative flex flex-col items-center'>
                <div className='flex size-8 items-center justify-center'>
                  <CreditCardIcon
                    weight='duotone'
                    className='size-7 text-blue-500 dark:text-blue-500/90'
                  />
                </div>
              </div>
              <div className='pt-1'>
                <Text as='p' size='sm' weight='semibold'>
                  {t('onboarding.selectPlan.timeline.charge', {
                    days: TRIAL_DAYS,
                  })}
                </Text>
                <Text as='p' size='sm' colour='secondary' className='mt-1'>
                  {t('onboarding.selectPlan.timeline.chargeDesc')}
                </Text>
              </div>
            </div>
          </div>

          <div className='mt-6 rounded-lg bg-white p-6 ring-1 ring-gray-200 ring-inset dark:bg-slate-950 dark:ring-slate-800'>
            <div className='mb-3 flex items-center gap-1'>
              <StarIcon className='size-5 text-yellow-500' weight='fill' />
              <StarIcon className='size-5 text-yellow-500' weight='fill' />
              <StarIcon className='size-5 text-yellow-500' weight='fill' />
              <StarIcon className='size-5 text-yellow-500' weight='fill' />
              <StarIcon className='size-5 text-yellow-500' weight='fill' />
            </div>
            <blockquote>
              <Text
                as='p'
                size='sm'
                className='leading-relaxed'
                colour='secondary'
              >
                {t('auth.signup.testimonial')}
              </Text>
              <footer className='mt-4 flex items-center gap-3'>
                <img
                  src='/assets/users/alper-phalcode.jpg'
                  alt='Alper Alkan'
                  className='size-10 rounded-full ring-2 ring-gray-100 dark:ring-slate-800'
                />
                <div>
                  <Text as='p' size='sm' weight='medium' colour='primary'>
                    Alper Alkan
                  </Text>
                  <Text as='p' size='xs' colour='secondary'>
                    Co-founder of Phalcode
                  </Text>
                </div>
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Subscribe
