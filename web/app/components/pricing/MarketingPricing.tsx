import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CaretDownIcon,
  CaretUpIcon,
  CheckIcon,
} from '@phosphor-icons/react'
import NumberFlow, { NumberFlowGroup } from '@number-flow/react'
import type { TFunction } from 'i18next'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CURRENCIES, TRIAL_DAYS } from '~/lib/constants'
import { DEFAULT_METAINFO, Metainfo } from '~/lib/models/Metainfo'
import {
  EVENT_TIER_CODES,
  EVENT_TIERS,
  PLAN_ENTITLEMENTS,
  getIncludedSessionReplays,
  getPlanPrice,
  type BillingInterval,
  type CurrencyCode,
  type EventTierCode,
  type PlanTypeCode,
} from '~/lib/pricing/catalog'
import { useAuth } from '~/providers/AuthProvider'
import { Link } from '~/ui/Link'
import { Switch } from '~/ui/Switch'
import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'
import routes from '~/utils/routes'

interface MarketingPricingProps {
  metainfo?: Metainfo
}

interface Benefit {
  label: string
  inherited?: boolean
}

const planCards: PlanTypeCode[] = ['standard', 'plus', 'enterprise']

const visibleBenefitsCount = 7

const formatEvents = (value: number) => value.toLocaleString('en-US')

const formatCompactEvents = (value: number) => {
  if (value >= 1000000) {
    return `${value / 1000000}M`
  }

  if (value >= 1000) {
    return `${value / 1000}K`
  }

  return value.toString()
}

const eventTierLabels = EVENT_TIER_CODES.map((tierCode) =>
  formatCompactEvents(EVENT_TIERS[tierCode].monthlyEvents),
)

const formatEntitlement = (value: number | string) =>
  typeof value === 'number' ? value.toLocaleString('en-US') : value

const getPriceFormat = (value: number) => ({
  minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
})

const formatPrice = (value: number | null, currencySymbol: string) =>
  value === null
    ? ''
    : `${currencySymbol}${value.toLocaleString('en-US', getPriceFormat(value))}`

const PriceAmount = ({
  value,
  currencySymbol,
  className,
}: {
  value: number | null
  currencySymbol: string
  className?: string
}) => {
  if (value === null) return null

  return (
    <NumberFlow
      value={value}
      prefix={currencySymbol}
      format={getPriceFormat(value)}
      className={className}
      willChange
    />
  )
}

const getPlanName = (planType: PlanTypeCode, t: TFunction) =>
  t(`pricing.planTypes.${planType}.name`)

const formatReplayBenefit = (
  replayQuota: number | string,
  t: TFunction,
) =>
  typeof replayQuota === 'number'
    ? t('pricing.sessionReplay.recordedSessions', {
        amount: formatEvents(replayQuota),
      })
    : t('pricing.sessionReplay.customQuota')

const getBenefits = (
  planType: PlanTypeCode,
  eventTier: EventTierCode,
  t: TFunction,
): Benefit[] => {
  const entitlements = PLAN_ENTITLEMENTS[planType]
  const replayQuota = getIncludedSessionReplays(planType, eventTier)

  const planLimits = [
    t('pricing.benefits.upToWebsites', {
      amount: formatEntitlement(entitlements.websites),
    }),
    t('pricing.benefits.upToTeamMembers', {
      amount: formatEntitlement(entitlements.teamMembers),
    }),
    t('pricing.benefits.upToOrganisations', {
      amount: formatEntitlement(entitlements.organisations),
    }),
  ]

  if (planType === 'standard') {
    return [
      ...planLimits.map((label) => ({ label })),
      { label: t('pricing.benefits.customEvents') },
      { label: t('pricing.benefits.goals') },
      { label: t('pricing.benefits.webVitals') },
      { label: t('pricing.benefits.errorTracking') },
      { label: t('pricing.benefits.emailReports') },
      { label: t('pricing.benefits.funnels') },
      { label: t('pricing.benefits.journeys') },
      { label: t('pricing.benefits.sessionsProfiles') },
      { label: t('pricing.benefits.featureFlags') },
      { label: t('pricing.benefits.abTests') },
      { label: t('pricing.benefits.revenueAnalytics') },
      { label: t('pricing.benefits.standardApi') },
    ]
  }

  if (planType === 'plus') {
    return [
      { label: t('pricing.benefits.everythingInStandard'), inherited: true },
      ...planLimits.map((label) => ({ label })),
      { label: formatReplayBenefit(replayQuota, t) },
      { label: t('pricing.benefits.prioritySupport') },
      { label: t('pricing.benefits.higherApiLimits') },
      { label: t('pricing.benefits.dataExports') },
      { label: t('pricing.benefits.agencyOrganisations') },
      { label: t('pricing.benefits.advancedExperiments') },
      { label: t('pricing.benefits.revenueAnalytics') },
    ]
  }

  return [
    { label: t('pricing.benefits.everythingInPlus'), inherited: true },
    { label: t('pricing.benefits.customUserLimit') },
    { label: t('pricing.benefits.customSiteLimit') },
    { label: t('pricing.benefits.customOrganisationLimit') },
    { label: t('pricing.benefits.customEventVolume') },
    { label: t('pricing.benefits.ssoSaml') },
    { label: t('pricing.benefits.dedicatedInstance') },
    { label: t('pricing.benefits.onPremise') },
    { label: t('pricing.benefits.manualInvoicing') },
    { label: t('pricing.benefits.sla') },
    { label: t('pricing.benefits.whitelabeling') },
    { label: t('pricing.benefits.securityLegalSupport') },
  ]
}

const BenefitRow = ({
  benefit,
  isEnterprise,
}: {
  benefit: Benefit
  isEnterprise: boolean
}) => {
  if (benefit.inherited) {
    return (
      <div className='flex items-center gap-2.5'>
        <ArrowLeftIcon
          className={cn(
            'size-4 shrink-0',
            isEnterprise ? 'text-gray-300' : 'text-gray-400 dark:text-gray-500',
          )}
        />
        <Text
          as='p'
          size='sm'
          weight='medium'
          colour={isEnterprise ? 'inherit' : 'muted'}
          className='italic'
        >
          {benefit.label}
        </Text>
      </div>
    )
  }

  return (
    <div className='flex items-center gap-2.5'>
      <CheckIcon className='size-4 shrink-0 text-emerald-600 dark:text-emerald-400' />
      <Text as='p' size='sm' colour={isEnterprise ? 'inherit' : 'primary'}>
        {benefit.label}
      </Text>
    </div>
  )
}

const MarketingPricing = ({
  metainfo = DEFAULT_METAINFO,
}: MarketingPricingProps) => {
  const { isAuthenticated } = useAuth()
  const { t } = useTranslation('common')
  const [billingFrequency, setBillingFrequency] =
    useState<BillingInterval>('monthly')
  const [selectedTierIndex, setSelectedTierIndex] = useState(0)
  const [showAllBenefits, setShowAllBenefits] = useState(false)

  const currencyCode = (
    metainfo.code in CURRENCIES ? metainfo.code : 'USD'
  ) as CurrencyCode
  const currency = CURRENCIES[currencyCode]
  const selectedTier = EVENT_TIER_CODES[selectedTierIndex]
  const selectedMonthlyEvents = EVENT_TIERS[selectedTier].monthlyEvents
  const isYearly = billingFrequency === 'yearly'

  const sliderPercent = useMemo(() => {
    if (EVENT_TIER_CODES.length <= 1) return 0
    return (selectedTierIndex / (EVENT_TIER_CODES.length - 1)) * 100
  }, [selectedTierIndex])

  const proMonthlyPrice = getPlanPrice(
    'standard',
    selectedTier,
    'monthly',
    currencyCode,
  )?.amount
  const proYearlyPrice = getPlanPrice(
    'standard',
    selectedTier,
    'yearly',
    currencyCode,
  )?.amount
  const yearlyDiscount =
    proMonthlyPrice && proYearlyPrice
      ? Math.round(
          ((proMonthlyPrice * 12 - proYearlyPrice) / (proMonthlyPrice * 12)) *
            100,
        )
      : 0

  const toggleBillingFrequency = () => {
    setBillingFrequency((currentFrequency) =>
      currentFrequency === 'yearly' ? 'monthly' : 'yearly',
    )
  }

  return (
    <section
      id='pricing'
      className='relative bg-gray-50 px-4 py-20 dark:bg-slate-950'
    >
      <div className='mx-auto max-w-7xl'>
        <div className='mx-auto max-w-3xl text-center'>
          <Text as='h2' size='4xl' weight='bold' className='sm:text-5xl'>
            {t('pricing.title')}
          </Text>
          <Text
            as='p'
            size='base'
            colour='secondary'
            className='mt-4 whitespace-pre-line'
          >
            {t('pricing.adv', { amount: TRIAL_DAYS })}
          </Text>
        </div>

        <div className='mx-auto mt-10 max-w-xl'>
          <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <Text as='h3' size='lg' weight='semibold'>
                {t('pricing.monthlyEvents')}
              </Text>
              <Text
                as='p'
                size='3xl'
                weight='bold'
                className='mt-1 text-blue-600 dark:text-blue-400'
              >
                {formatEvents(selectedMonthlyEvents)}
              </Text>
            </div>

            <div className='flex justify-start sm:justify-end'>
              <button
                type='button'
                onClick={toggleBillingFrequency}
                className='flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800'
              >
                <Text as='span' size='sm' weight='medium' colour='inherit'>
                  {t('pricing.billedYearly')}
                </Text>
                {yearlyDiscount > 0 ? (
                  <Text
                    as='span'
                    size='xs'
                    weight='semibold'
                    colour='success'
                    className='rounded-md bg-emerald-500/20 px-1.5 py-0.5'
                  >
                    -{yearlyDiscount} %
                  </Text>
                ) : null}
                <Switch checked={isYearly} visualOnly />
              </button>
            </div>
          </div>

          <input
            aria-label={t('pricing.monthlyEventVolume')}
            type='range'
            min={0}
            max={EVENT_TIER_CODES.length - 1}
            step={1}
            value={selectedTierIndex}
            onChange={(event) =>
              setSelectedTierIndex(Number(event.target.value))
            }
            className='h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-600 dark:bg-slate-700 dark:accent-blue-400 [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-blue-600 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-sm dark:[&::-moz-range-thumb]:border-blue-400 dark:[&::-moz-range-thumb]:bg-slate-950 [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-600 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm dark:[&::-webkit-slider-thumb]:border-blue-400 dark:[&::-webkit-slider-thumb]:bg-slate-950'
            style={{
              background: `linear-gradient(to right, rgb(37 99 235) 0%, rgb(37 99 235) ${sliderPercent}%, rgb(209 213 219) ${sliderPercent}%, rgb(209 213 219) 100%)`,
            }}
          />

          <div
            className='mt-3 grid gap-1'
            style={{
              gridTemplateColumns: `repeat(${EVENT_TIER_CODES.length}, minmax(0, 1fr))`,
            }}
          >
            {eventTierLabels.map((label, index) => (
              <Text
                key={label}
                as='button'
                type='button'
                size='xs'
                weight={index === selectedTierIndex ? 'bold' : 'medium'}
                colour={index === selectedTierIndex ? 'primary' : 'muted'}
                className={cn(
                  'text-center',
                  index === selectedTierIndex && 'text-blue-600 dark:text-blue-400',
                )}
                onClick={() => setSelectedTierIndex(index)}
              >
                {label}
              </Text>
            ))}
          </div>
        </div>

        <NumberFlowGroup>
          <div className='mx-auto mt-6 grid max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-3 lg:px-8'>
            {planCards.map((planType) => {
              const isEnterprise = planType === 'enterprise'
              const benefits = getBenefits(planType, selectedTier, t)
              const visibleBenefits = showAllBenefits
                ? benefits
                : benefits.slice(0, visibleBenefitsCount)
              const hiddenBenefitsCount = Math.max(
                0,
                benefits.length - visibleBenefits.length,
              )
              const monthlyPrice = getPlanPrice(
                planType,
                selectedTier,
                'monthly',
                currencyCode,
              )?.amount
              const yearlyPrice = getPlanPrice(
                planType,
                selectedTier,
                'yearly',
                currencyCode,
              )?.amount
              const yearlyMonthlyPrice = yearlyPrice
                ? Math.round((yearlyPrice / 12) * 100) / 100
                : null
              const monthlyPlan = getPlanPrice(
                planType,
                selectedTier,
                'monthly',
                currencyCode,
              )
              const yearlyPlan = getPlanPrice(
                planType,
                selectedTier,
                'yearly',
                currencyCode,
              )
              const hasPublishedPrice = Boolean(monthlyPrice && yearlyPrice)
              const canSelfServe = Boolean(
                monthlyPlan?.paddlePlanId && yearlyPlan?.paddlePlanId,
              )

              return (
                <div
                  key={planType}
                  className={cn(
                    'flex min-h-[520px] flex-col rounded-2xl p-5 ring-1',
                    isEnterprise
                      ? 'bg-slate-900 text-gray-50 ring-slate-700 dark:bg-slate-900 dark:text-gray-50 dark:ring-slate-700'
                      : 'bg-white text-gray-950 ring-gray-200 dark:bg-slate-900 dark:text-gray-50 dark:ring-slate-700/70',
                  )}
                >
                  <div className='flex items-start justify-between gap-3'>
                    <Text
                      as='h3'
                      size='lg'
                      weight='bold'
                      colour={isEnterprise ? 'inherit' : 'primary'}
                    >
                      {getPlanName(planType, t)}
                    </Text>
                  </div>

                  <div className='mt-2 min-h-[72px]'>
                    {hasPublishedPrice ? (
                      <>
                        <div className='flex min-h-10 flex-wrap items-end gap-2'>
                          <Text
                            as='p'
                            size='3xl'
                            weight='bold'
                            colour={isEnterprise ? 'inherit' : 'primary'}
                          >
                            <PriceAmount
                              value={
                                isYearly ? yearlyPrice ?? null : monthlyPrice ?? null
                              }
                              currencySymbol={currency.symbol}
                            />
                          </Text>
                          <Text
                            as='p'
                            size='base'
                            weight='semibold'
                            colour={isEnterprise ? 'inherit' : 'secondary'}
                            className='pb-1'
                          >
                            {`/${t(
                              isYearly
                                ? 'pricing.intervals.year'
                                : 'pricing.intervals.month',
                            )}`}
                          </Text>
                        </div>
                        {isYearly ? (
                          <div className='mt-2 flex h-6 flex-wrap items-baseline gap-1'>
                            <Text
                              as='span'
                              size='sm'
                              weight='semibold'
                              colour={isEnterprise ? 'inherit' : 'secondary'}
                              className='line-through'
                            >
                              {formatPrice(monthlyPrice ?? null, currency.symbol)}
                            </Text>
                            <Text
                              as='span'
                              size='sm'
                              weight='bold'
                              colour={isEnterprise ? 'inherit' : 'primary'}
                            >
                              {formatPrice(yearlyMonthlyPrice, currency.symbol)}
                            </Text>
                            <Text
                              as='span'
                              size='sm'
                              weight='semibold'
                              colour={isEnterprise ? 'inherit' : 'secondary'}
                            >
                              /{t('pricing.intervals.month')}
                            </Text>
                          </div>
                        ) : (
                          <div className='mt-2 h-6' aria-hidden='true' />
                        )}
                      </>
                    ) : (
                      <Text as='p' size='3xl' weight='bold' colour='inherit'>
                        {t('pricing.custom')}
                      </Text>
                    )}
                  </div>

                  <Link
                    to={
                      canSelfServe
                        ? isAuthenticated
                          ? routes.billing
                          : routes.signup
                        : routes.contact
                    }
                    className={cn(
                      'mt-5 inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 transition-colors',
                      isEnterprise
                        ? 'bg-gray-50 text-slate-950 hover:bg-gray-200 dark:bg-gray-50 dark:text-slate-950 dark:hover:bg-gray-200'
                        : 'bg-slate-900 text-gray-50 hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white',
                    )}
                  >
                    <Text as='span' size='sm' weight='semibold' colour='inherit'>
                      {canSelfServe
                        ? t('pricing.startFreeTrial')
                        : t('pricing.contactUs')}
                    </Text>
                    <ArrowRightIcon className='size-4' />
                  </Link>

                  <div className='mt-5 space-y-3'>
                    {visibleBenefits.map((benefit) => (
                      <BenefitRow
                        key={benefit.label}
                        benefit={benefit}
                        isEnterprise={isEnterprise}
                      />
                    ))}
                    {hiddenBenefitsCount > 0 || showAllBenefits ? (
                      <button
                        type='button'
                        onClick={() => setShowAllBenefits((value) => !value)}
                        className='flex items-center gap-2.5 underline-animate'
                      >
                        {showAllBenefits ? (
                          <CaretUpIcon className='size-4 text-gray-700 dark:text-gray-200' />
                        ) : (
                          <CaretDownIcon className='size-4 text-gray-700 dark:text-gray-200' />
                        )}
                        <Text as='span' size='sm' weight='medium' colour='primary'>
                          {showAllBenefits
                            ? t('common.showLess')
                            : t('common.showMore', {
                                count: hiddenBenefitsCount,
                              })}
                        </Text>
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </NumberFlowGroup>
      </div>
    </section>
  )
}

export default MarketingPricing
