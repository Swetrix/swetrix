import {
  RocketLaunchIcon,
  BellIcon,
  CreditCardIcon,
  CheckIcon,
  StarIcon,
} from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
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
import type { SubscribeLoaderData } from '~/routes/subscribe'
import Button from '~/ui/Button'
import { Text } from '~/ui/Text'
import { Switch } from '~/ui/Switch'
import { cn } from '~/utils/generic'
import routes from '~/utils/routes'

const INITIAL_VISIBLE_PLANS = 3
const formatEventsLong = (value: number, locale = 'en-US') =>
  value.toLocaleString(locale)

const Subscribe = () => {
  const { t, i18n } = useTranslation('common')
  const { theme } = useTheme()
  const { user, loadUser } = useAuth()
  const navigate = useNavigate()
  const { metainfo } = useLoaderData<SubscribeLoaderData>()

  const [selectedPlan, setSelectedPlan] = useState('100k')
  const [selectedBillingFrequency, setSelectedBillingFrequency] = useState<
    'monthly' | 'yearly'
  >('monthly')
  const [showAllPlans, setShowAllPlans] = useState(false)

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

  const currencyCode = user?.tierCurrency || metainfo.code
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD
  const tier = PLAN_LIMITS[selectedPlan as keyof typeof PLAN_LIMITS]
  const monthlyPrice =
    tier?.price?.[currencyCode]?.monthly ?? tier?.price?.USD?.monthly
  const yearlyPrice =
    tier?.price?.[currencyCode]?.yearly ?? tier?.price?.USD?.yearly
  const displayPrice =
    selectedBillingFrequency === 'yearly' ? yearlyPrice : monthlyPrice

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!hasCompletedCheckout) return

    let attempts = 0
    const MAX_POLL_ATTEMPTS = 30

    pollRef.current = setInterval(async () => {
      attempts += 1

      try {
        const freshUser = await loadUser()

        if (freshUser?.planCode && freshUser.planCode !== 'none') {
          if (pollRef.current) clearInterval(pollRef.current)
          navigate(routes.dashboard)
          return
        }
      } catch {
        // ignore, keep polling
      }

      if (attempts >= MAX_POLL_ATTEMPTS) {
        if (pollRef.current) clearInterval(pollRef.current)
        navigate(routes.dashboard)
      }
    }, 2000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [hasCompletedCheckout, navigate, loadUser])

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

    const hasPid = 'pid' in tier && typeof tier.pid === 'number'
    const hasYpid = 'ypid' in tier && typeof tier.ypid === 'number'

    const product =
      selectedBillingFrequency === BillingFrequency.monthly
        ? hasPid
          ? tier.pid
          : undefined
        : hasYpid
          ? tier.ypid
          : undefined

    if (!product) {
      toast.error(t('apiNotifications.somethingWentWrong'))
      return
    }

    const opened = openCheckout({
      product,
      email: user?.email,
      passthrough: JSON.stringify({ uid: user?.id }),
      locale: paddleLanguageMapping[i18n.language] || i18n.language,
      displayModeTheme: theme,
      country: metainfo.country,
    })

    if (!opened) {
      toast.error(t('apiNotifications.somethingWentWrong'))
    }
  }

  const trialEndDate = user?.trialEndDate
    ? new Date(user.trialEndDate)
    : new Date()

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
            <Text as='p' size='lg' colour='secondary' className='mt-2'>
              {t('checkout.subtitle', { days: TRIAL_DAYS })}
            </Text>

            <div className='mt-6 flex flex-col gap-3'>
              <div className='flex items-center gap-3'>
                <CheckIcon
                  className='size-5 shrink-0 text-emerald-500'
                  weight='bold'
                />
                <Text as='p' size='base'>
                  {t('auth.signup.features.realTimeAnalytics')}
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
                        amount: formatEventsLong(
                          planTier.monthlyUsageLimit,
                          i18n.language,
                        ),
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
            ) : (
              <>
                <Button
                  className='w-full justify-center'
                  onClick={handleStartCheckout}
                  primary
                  giant
                >
                  {t('checkout.next')}
                </Button>

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
                      tos: (
                        <a
                          href={routes.terms}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='font-medium underline decoration-dashed hover:decoration-solid'
                        />
                      ),
                    }}
                  />
                </Text>
              </>
            )}
          </div>
        </div>

        {/* Right Column (Timeline) */}
        <div className='hidden lg:block lg:pt-16'>
          <div className='rounded-lg bg-white p-6 ring-1 ring-gray-200 ring-inset dark:bg-slate-900/80 dark:ring-slate-800'>
            <div className='flex items-start gap-5'>
              <div className='relative flex flex-col items-center'>
                <div className='flex size-8 items-center justify-center'>
                  <RocketLaunchIcon
                    weight='duotone'
                    className='size-7 text-emerald-600 dark:text-emerald-500'
                  />
                </div>
                <div className='my-2 h-14 w-px bg-linear-to-b from-emerald-200 to-gray-200 dark:from-emerald-900/60 dark:to-slate-800' />
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

          <div className='mt-6 rounded-lg bg-white p-6 ring-1 ring-gray-200 ring-inset dark:bg-slate-900/80 dark:ring-slate-800'>
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
                className='leading-relaxed text-gray-700 dark:text-gray-300'
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
                  <Text
                    as='p'
                    size='sm'
                    weight='medium'
                    className='text-gray-900 dark:text-white'
                  >
                    Alper Alkan
                  </Text>
                  <Text
                    as='p'
                    size='xs'
                    className='text-gray-500 dark:text-slate-400'
                  >
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
