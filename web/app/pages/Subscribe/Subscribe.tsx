import { CheckIcon } from '@phosphor-icons/react'
import type { TFunction } from 'i18next'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useFetcher, useLoaderData, useNavigate } from 'react-router'
import { toast } from 'sonner'

import {
  PricingInternal,
  type MarketingPricingSelection,
} from '~/components/pricing/MarketingPricing'
import { usePaddle } from '~/hooks/usePaddle'
import { paddleLanguageMapping, TRIAL_DAYS } from '~/lib/constants'
import {
  EVENT_TIERS,
  getPlanPrice,
  type PlanTypeCode,
} from '~/lib/pricing/catalog'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
import type { SubscribeLoaderData } from '~/routes/subscribe'
import type { UserSettingsActionData } from '~/routes/user-settings'
import { FAQ } from '~/ui/FAQ'
import { Text } from '~/ui/Text'
import { trackCustom } from '~/utils/analytics'
import routes from '~/utils/routes'

import { TrialTimeline } from './TrialTimeline'

type PayLinkResponse = {
  url?: string
}

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

const Subscribe = () => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { theme } = useTheme()
  const { loadUser } = useAuth()
  const navigate = useNavigate()
  const { metainfo } = useLoaderData<SubscribeLoaderData>()

  const [selectionLoading, setSelectionLoading] =
    useState<MarketingPricingSelection | null>(null)
  const [hasCompletedCheckout, setHasCompletedCheckout] = useState(false)

  const onPaddleEvent = useCallback((eventData: any) => {
    if (eventData?.event === 'Checkout.Complete') {
      setHasCompletedCheckout(true)
      setSelectionLoading(null)
      return
    }

    if (eventData?.event === 'Checkout.Close') {
      setSelectionLoading(null)
    }
  }, [])

  const { isPaddleLoaded, paddleLoadError, openCheckout } = usePaddle({
    onEvent: onPaddleEvent,
  })

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

  const generatePayLinkFetcher = useFetcher<UserSettingsActionData>()

  useEffect(() => {
    if (
      generatePayLinkFetcher.data?.success &&
      generatePayLinkFetcher.data?.data
    ) {
      const url = (generatePayLinkFetcher.data.data as PayLinkResponse).url

      if (!url) {
        toast.error(t('billing.checkoutPreparationError'))
        setSelectionLoading(null)
        generatePayLinkFetcher.data = undefined
        return
      }

      const opened = openCheckout({
        override: url,
        locale: paddleLanguageMapping[language] || language,
        title: selectionLoading
          ? t('pricing.selectedPlanWithEvents', {
              plan: getPlanName(selectionLoading.planType, t),
              events: formatEventsLong(
                EVENT_TIERS[selectionLoading.eventTier].monthlyEvents,
              ),
            })
          : t('checkout.title'),
        displayModeTheme: theme,
        country: metainfo.country,
      })

      if (!opened) {
        toast.error(t('billing.paddleStillLoading'))
        setSelectionLoading(null)
      }

      generatePayLinkFetcher.data = undefined
    } else if (generatePayLinkFetcher.data?.error) {
      toast.error(getCheckoutErrorMessage(generatePayLinkFetcher.data.error, t))
      setSelectionLoading(null)
    }
  }, [
    generatePayLinkFetcher.data,
    language,
    metainfo.country,
    openCheckout,
    selectionLoading,
    t,
    theme,
  ])

  const handlePlanSelection = (selection: MarketingPricingSelection) => {
    if (selectionLoading || hasCompletedCheckout) return

    const selectedPrice = getPlanPrice(
      selection.planType,
      selection.eventTier,
      selection.billingFrequency,
      selection.currency,
    )

    trackCustom('SUBSCRIBE_START_CHECKOUT', {
      planType: selection.planType,
      eventTier: selection.eventTier,
      billingFrequency: selection.billingFrequency,
      currency: selection.currency,
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

    setSelectionLoading(selection)
    generatePayLinkFetcher.submit(
      {
        intent: 'generate-pay-link',
        planType: selection.planType,
        eventTier: selection.eventTier,
        billingFrequency: selection.billingFrequency,
        currency: selection.currency,
      },
      { method: 'POST', action: '/user-settings' },
    )
  }

  const faqItems = useMemo(() => {
    const faqValues = {
      lowestPlanEventsAmount:
        EVENT_TIERS['100k'].monthlyEvents.toLocaleString('en-US'),
      moderatePlanEventsAmount:
        EVENT_TIERS['500k'].monthlyEvents.toLocaleString('en-US'),
    }

    const reusedItems = [0, 1, 4].map((idx) => ({
      question: (
        <Trans t={t} i18nKey={`main.faq.items.${idx}.q`} values={faqValues} />
      ),
      answer: (
        <Trans t={t} i18nKey={`main.faq.items.${idx}.a`} values={faqValues} />
      ),
    }))

    return [
      {
        question: <Trans t={t} i18nKey='checkout.faqTrial.q' />,
        answer: (
          <Trans
            t={t}
            i18nKey='checkout.faqTrial.a'
            values={{ days: TRIAL_DAYS }}
          />
        ),
      },
      ...reusedItems,
    ]
  }, [t])

  return (
    <>
      <main className='min-h-min-footer bg-gray-50 pb-16 dark:bg-slate-950'>
        <div className='mx-auto max-w-3xl px-4 pt-10 text-center sm:px-6 lg:px-8'>
          <Text
            as='h1'
            size='4xl'
            weight='bold'
            colour='primary'
            className='text-balance'
          >
            {t('checkout.title')}
          </Text>
          <Text
            as='p'
            size='lg'
            colour='secondary'
            className='mx-auto mt-4 max-w-xl text-pretty'
          >
            {t('checkout.subtitle', { days: TRIAL_DAYS })}
          </Text>
        </div>

        {hasCompletedCheckout ? (
          <div className='mx-auto mt-6 w-full max-w-xl px-4 sm:px-6 lg:px-8'>
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
          </div>
        ) : null}

        <div className='mt-2'>
          <PricingInternal
            metainfo={metainfo}
            onSelectPlan={handlePlanSelection}
            loadingPlanType={selectionLoading?.planType ?? null}
            disabled={Boolean(selectionLoading) || hasCompletedCheckout}
          />
        </div>

        <TrialTimeline />

        <div className='mx-auto w-full max-w-4xl px-4 pt-10 sm:px-6 lg:px-8'>
          <Text as='h2' size='2xl' weight='bold'>
            {t('main.faq.title')}
          </Text>
          <FAQ items={faqItems} className='mt-3' defaultOpenFirst />
        </div>
      </main>

      <div className='checkout-container' id='checkout-container' />
    </>
  )
}

export default Subscribe
