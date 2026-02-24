import {
  RocketLaunchIcon,
  BellIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  CheckIcon,
} from '@phosphor-icons/react'
import { useCallback, useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useNavigate, useLoaderData } from 'react-router'
import { toast } from 'sonner'

import { usePaddle } from '~/hooks/usePaddle'
import {
  BillingFrequency,
  CURRENCIES,
  paddleLanguageMapping,
  PLAN_LIMITS,
  STANDARD_PLANS,
  TRIAL_DAYS,
} from '~/lib/constants'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
import type { CheckoutLoaderData } from '~/routes/checkout'
import Button from '~/ui/Button'
import { Text } from '~/ui/Text'
import { Switch } from '~/ui/Switch'
import { cn } from '~/utils/generic'
import routes from '~/utils/routes'

const INITIAL_VISIBLE_PLANS = 3
const formatEventsLong = (value: number) => value.toLocaleString('en-US')

const Checkout = () => {
  const { t, i18n } = useTranslation('common')
  const { theme } = useTheme()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { metainfo } = useLoaderData<CheckoutLoaderData>()

  const [selectedPlan, setSelectedPlan] = useState('100k')
  const [selectedBillingFrequency, setSelectedBillingFrequency] = useState<
    'monthly' | 'yearly'
  >('monthly')
  const [showAllPlans, setShowAllPlans] = useState(false)

  const [hasCompletedCheckout, setHasCompletedCheckout] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const onPaddleEvent = useCallback((eventData: any) => {
    if (eventData?.event === 'Checkout.Complete') {
      setHasCompletedCheckout(true)
    }
  }, [])

  const { isPaddleLoaded, paddleLoadError } = usePaddle({
    onEvent: onPaddleEvent,
  })

  const currencyCode = user?.tierCurrency || metainfo.code
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD
  const tier = PLAN_LIMITS[selectedPlan as keyof typeof PLAN_LIMITS]
  const monthlyPrice =
    tier?.price?.[currencyCode]?.monthly ?? tier?.price?.USD?.monthly
  const yearlyPrice =
    tier?.price?.[currencyCode]?.yearly ?? tier?.price?.USD?.yearly
  const displayPrice =
    selectedBillingFrequency === 'yearly' ? yearlyPrice : monthlyPrice

  useEffect(() => {
    if (hasCompletedCheckout) {
      const timer = setTimeout(() => {
        navigate(routes.dashboard)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [hasCompletedCheckout, navigate])

  const handleStartCheckout = () => {
    if (paddleLoadError) {
      toast.error(t('billing.paddleLoadError'))
      return
    }

    if (!isPaddleLoaded || !(window as any).Paddle) {
      toast.error(t('billing.paddleStillLoading'))
      return
    }

    if (!tier) return

    const product =
      selectedBillingFrequency === BillingFrequency.monthly
        ? (tier as any).pid
        : (tier as any).ypid

    setIsCheckoutOpen(true)
    ;(window as any).Paddle.Checkout.open({
      product,
      method: 'inline',
      frameTarget: 'checkout-container',
      frameInitialHeight: 416,
      frameStyle:
        'width:100%; min-width:312px; background-color: transparent; border: none; border-radius: 10px;',
      email: user?.email,
      passthrough: JSON.stringify({ uid: user?.id }),
      locale: paddleLanguageMapping[i18n.language] || i18n.language,
      displayModeTheme: theme,
      country: metainfo.country,
    })

    setTimeout(() => {
      document
        .querySelector('#checkout-container')
        ?.scrollIntoView({ behavior: 'smooth' })
    }, 500)
  }

  const today = new Date()
  const trialEndDate = new Date()
  trialEndDate.setDate(today.getDate() + TRIAL_DAYS)

  const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const formattedEndDate = dateFormatter.format(trialEndDate)

  return (
    <div className='flex min-h-screen flex-col items-center bg-gray-50 p-4 lg:p-8 dark:bg-slate-950'>
      <div className='grid w-full max-w-5xl grid-cols-1 items-start gap-12 lg:grid-cols-[1fr_400px] lg:gap-16'>
        {/* Left Column */}
        <div className='flex flex-col gap-8'>
          <div>
            <Text as='h1' size='4xl' weight='bold' tracking='tight'>
              {t('checkout.title')}
            </Text>

            <div className='mt-6 flex flex-col gap-3'>
              <div className='flex items-center gap-3'>
                <CheckIcon
                  className='size-5 shrink-0 text-emerald-500'
                  weight='bold'
                />
                <Text as='p' size='base'>
                  {t('checkout.freeTrialAnytime', { days: TRIAL_DAYS })}
                </Text>
              </div>
              <div className='flex items-center gap-3'>
                <CheckIcon
                  className='size-5 shrink-0 text-emerald-500'
                  weight='bold'
                />
                <Text as='p' size='base'>
                  {t('checkout.willRemind')}
                </Text>
              </div>
            </div>
          </div>

          <div>
            <div className='mb-3 flex items-center justify-between'>
              <Text as='p' size='sm' colour='secondary'>
                {t('checkout.selectPlan')}
              </Text>
              <button
                type='button'
                onClick={() =>
                  setSelectedBillingFrequency((f) =>
                    f === 'monthly' ? 'yearly' : 'monthly',
                  )
                }
                className='flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-2.5 py-1.5 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:hover:bg-slate-800'
              >
                <span className='text-xs font-medium text-gray-700 dark:text-gray-200'>
                  {t('pricing.billedYearly')}
                </span>
                <span className='rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'>
                  -17%
                </span>
                <Switch
                  checked={selectedBillingFrequency === 'yearly'}
                  visualOnly
                />
              </button>
            </div>

            <div className='space-y-2'>
              {STANDARD_PLANS.slice(
                0,
                showAllPlans ? undefined : INITIAL_VISIBLE_PLANS,
              ).map((planCode) => {
                const planTier =
                  PLAN_LIMITS[planCode as keyof typeof PLAN_LIMITS]
                if (!planTier) return null
                const isSelected = selectedPlan === planCode
                const price =
                  selectedBillingFrequency === 'monthly'
                    ? (planTier.price?.[currencyCode]?.monthly ??
                      planTier.price?.USD?.monthly)
                    : (planTier.price?.[currencyCode]?.yearly ??
                      planTier.price?.USD?.yearly)
                const priceLabel =
                  selectedBillingFrequency === 'monthly'
                    ? t('pricing.perMonth')
                    : t('pricing.perYear')

                return (
                  <button
                    key={planCode}
                    type='button'
                    onClick={() => setSelectedPlan(planCode)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-4 py-3 text-left ring-1 transition-all duration-150 ring-inset',
                      isSelected
                        ? 'bg-white shadow-sm ring-2 ring-indigo-500 dark:bg-slate-900 dark:ring-slate-200'
                        : 'bg-white ring-gray-200 hover:ring-gray-300 dark:bg-slate-900 dark:ring-slate-700 dark:hover:ring-slate-600',
                    )}
                  >
                    <Text as='span' size='base' weight='semibold'>
                      {currency.symbol}
                      {price}
                      <Text as='span' size='sm' colour='muted' weight='medium'>
                        /{priceLabel}
                      </Text>
                    </Text>
                    <Text as='span' size='sm' colour='muted'>
                      {t('pricing.upToXEvents', {
                        amount: formatEventsLong(planTier.monthlyUsageLimit),
                      })}
                    </Text>
                  </button>
                )
              })}
            </div>

            <div className='mt-3'>
              <button
                type='button'
                onClick={() => setShowAllPlans((v) => !v)}
                className='rounded-full bg-gray-100 px-3.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700'
              >
                {showAllPlans
                  ? t('common.showLess')
                  : t('common.showMore', {
                      count: STANDARD_PLANS.length - INITIAL_VISIBLE_PLANS,
                    })}
              </button>
            </div>
          </div>

          <div className='flex flex-col gap-4 border-t border-gray-200 pt-6 dark:border-slate-800'>
            <div className='flex items-center justify-between'>
              <Text as='p' size='base'>
                {t('checkout.dueEnd', { date: formattedEndDate })}
              </Text>
              <Text as='p' size='base' weight='semibold'>
                {currency.symbol}
                {displayPrice}
              </Text>
            </div>
            <div className='flex items-center justify-between'>
              <Text as='p' size='base' weight='bold'>
                {t('checkout.dueToday', { days: TRIAL_DAYS })}
              </Text>
              <Text
                as='p'
                size='base'
                weight='bold'
                className='text-emerald-600 dark:text-emerald-500'
              >
                {currency.symbol}0
              </Text>
            </div>
          </div>

          <div className='pt-2'>
            {hasCompletedCheckout ? (
              <div className='rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-800 dark:bg-emerald-900/20'>
                <div className='flex items-center justify-center gap-2'>
                  <ShieldCheckIcon className='size-5 text-emerald-600 dark:text-emerald-400' />
                  <Text
                    as='p'
                    size='sm'
                    weight='semibold'
                    className='text-emerald-700 dark:text-emerald-300'
                  >
                    {t('common.success')}! Redirecting...
                  </Text>
                </div>
              </div>
            ) : (
              <>
                {!isCheckoutOpen && (
                  <Button
                    className='w-full justify-center'
                    onClick={handleStartCheckout}
                    primary
                    giant
                  >
                    {t('checkout.next')}
                  </Button>
                )}

                <div id='checkout-container' className='min-h-0 w-full' />

                {!isCheckoutOpen && (
                  <Text
                    as='p'
                    size='xs'
                    colour='muted'
                    className='mt-4 text-center'
                  >
                    <Trans
                      t={t}
                      i18nKey='checkout.termsDesc'
                      components={{
                        privacy: (
                          <a
                            href={routes.privacy}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='font-medium underline decoration-dashed hover:decoration-solid'
                          />
                        ),
                      }}
                    />
                  </Text>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Column (Timeline) */}
        <div className='hidden lg:block lg:pt-16'>
          <div className='rounded-lg bg-white p-6 shadow-xs ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-700/80'>
            <div className='flex items-start gap-5'>
              <div className='relative flex flex-col items-center'>
                <div className='flex size-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30'>
                  <RocketLaunchIcon className='size-5 text-emerald-600 dark:text-emerald-400' />
                </div>
                <div className='my-1 h-12 w-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30' />
              </div>
              <div className='pt-2'>
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
                <div className='flex size-10 items-center justify-center rounded-full bg-amber-50 ring-1 ring-amber-100 dark:bg-amber-900/10 dark:ring-amber-900/30'>
                  <BellIcon className='size-5 text-amber-500 dark:text-amber-400' />
                </div>
                <div className='my-1 h-12 w-1 rounded-full bg-gray-100 dark:bg-slate-800' />
              </div>
              <div className='pt-2'>
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
                <div className='flex size-10 items-center justify-center rounded-full bg-blue-50 ring-1 ring-blue-100 dark:bg-blue-900/10 dark:ring-blue-900/30'>
                  <CreditCardIcon className='size-5 text-blue-500 dark:text-blue-400' />
                </div>
              </div>
              <div className='pt-2'>
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
        </div>
      </div>
    </div>
  )
}

export default Checkout
