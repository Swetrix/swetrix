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

import { FLOW_VALUE_CLASS } from '~/hooks/useFlowValue'
import { CURRENCIES, TRIAL_DAYS } from '~/lib/constants'
import { DEFAULT_METAINFO, Metainfo } from '~/lib/models/Metainfo'
import {
  EVENT_TIER_CODES,
  EVENT_TIERS,
  getPlanPrice,
  type BillingInterval,
  type CurrencyCode,
  type EventTierCode,
  type PlanTypeCode,
} from '~/lib/pricing/catalog'
import { useAuth } from '~/providers/AuthProvider'
import { Badge } from '~/ui/Badge'
import Button from '~/ui/Button'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { cn } from '~/utils/generic'
import routes from '~/utils/routes'

import SessionReplayPricingTooltip from './SessionReplayPricingTooltip'

interface MarketingPricingProps {
  metainfo?: Metainfo
  onSelectPlan?: (selection: MarketingPricingSelection) => void
  getActionLabel?: (selection: MarketingPricingSelection) => string
  loadingPlanType?: PlanTypeCode | null
  disabled?: boolean
  showVatNote?: boolean
}

export interface MarketingPricingSelection {
  planType: PlanTypeCode
  eventTier: EventTierCode
  billingFrequency: BillingInterval
  currency: CurrencyCode
}

interface BenefitTooltip {
  description: string
  href?: string
  linkLabel?: string
  ariaLabel: string
}

interface Benefit {
  label: string
  tooltip?: BenefitTooltip
  tooltipType?: 'sessionReplays'
}

const planCards: PlanTypeCode[] = ['standard', 'plus', 'enterprise']

const visibleBenefitsCount = 10
const dataImportDocsUrl = 'https://swetrix.com/docs/data-import'
const goalsDocsUrl = 'https://swetrix.com/docs/analytics-dashboard/goals'
const performanceDocsUrl =
  'https://swetrix.com/docs/analytics-dashboard/performance'
const featureFlagsDocsUrl =
  'https://swetrix.com/docs/analytics-dashboard/feature-flags'
const experimentsDocsUrl =
  'https://swetrix.com/docs/analytics-dashboard/experiments'
const errorTrackingDocsUrl = 'https://swetrix.com/docs/error-tracking'
const emailReportsDocsUrl = 'https://swetrix.com/docs/email-reports'
const eventsApiDocsUrl = 'https://swetrix.com/docs/events-api'
const statsApiDocsUrl = 'https://swetrix.com/docs/api/stats'
const funnelsDocsUrl = 'https://swetrix.com/docs/analytics-dashboard/funnels'
const profilesAndSessionsDocsUrl =
  'https://swetrix.com/docs/analytics-dashboard/profiles-and-sessions'
const captchaDocsUrl = 'https://swetrix.com/docs/captcha/introduction'
const botProtectionDocsUrl =
  'https://swetrix.com/docs/sitesettings/bot-protection'
const managedProxyDocsUrl = 'https://swetrix.com/docs/adblockers/managed-proxy'

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
const customEventTierLabel = '50M+'
const eventTierOptionLabels = [...eventTierLabels, customEventTierLabel]
const customEventTierIndex = eventTierOptionLabels.length - 1

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
      className={cn(FLOW_VALUE_CLASS, className)}
      willChange
    />
  )
}

const getPlanName = (planType: PlanTypeCode, t: TFunction) =>
  t(`pricing.planTypes.${planType}.name`)

const benefitWithTooltip = (
  labelKey: string,
  tooltipKey: string,
  t: TFunction,
  href?: string,
): Benefit => {
  const label = t(labelKey)

  return {
    label,
    tooltip: {
      description: t(tooltipKey),
      href,
      linkLabel: href ? t('common.learnMore') : undefined,
      ariaLabel: `${t('common.learnMore')}: ${label}`,
    },
  }
}

const getBenefits = (planType: PlanTypeCode, t: TFunction): Benefit[] => {
  if (planType === 'standard') {
    return [
      { label: t('pricing.websiteCount', { count: 10 }) },
      { label: t('pricing.benefits.unlimitedMembers') },
      benefitWithTooltip(
        'pricing.benefits.googleAnalyticsImport',
        'pricing.benefits.tooltips.googleAnalyticsImport',
        t,
        dataImportDocsUrl,
      ),
      benefitWithTooltip(
        'pricing.benefits.eventsAndGoals',
        'pricing.benefits.tooltips.eventsAndGoals',
        t,
        goalsDocsUrl,
      ),
      benefitWithTooltip(
        'pricing.benefits.performanceMonitoring',
        'pricing.benefits.tooltips.performanceMonitoring',
        t,
        performanceDocsUrl,
      ),
      benefitWithTooltip(
        'pricing.benefits.funnels',
        'pricing.benefits.tooltips.funnels',
        t,
        funnelsDocsUrl,
      ),
      benefitWithTooltip(
        'pricing.benefits.sessionUserProfileAnalysis',
        'pricing.benefits.tooltips.sessionUserProfileAnalysis',
        t,
        profilesAndSessionsDocsUrl,
      ),
      benefitWithTooltip(
        'pricing.benefits.advancedBotDetection',
        'pricing.benefits.tooltips.advancedBotDetection',
        t,
        botProtectionDocsUrl,
      ),
      benefitWithTooltip(
        'pricing.benefits.adBlockerBypass',
        'pricing.benefits.tooltips.adBlockerBypass',
        t,
        managedProxyDocsUrl,
      ),
      benefitWithTooltip(
        'pricing.benefits.errorTracking',
        'pricing.benefits.tooltips.errorTracking',
        t,
        errorTrackingDocsUrl,
      ),
      benefitWithTooltip(
        'pricing.benefits.emailReports',
        'pricing.benefits.tooltips.emailReports',
        t,
        emailReportsDocsUrl,
      ),
      benefitWithTooltip(
        'pricing.benefits.recaptchaAlternative',
        'pricing.benefits.tooltips.recaptchaAlternative',
        t,
        captchaDocsUrl,
      ),
      benefitWithTooltip(
        'pricing.benefits.restfulApiSdks',
        'pricing.benefits.tooltips.restfulApiSdks',
        t,
        eventsApiDocsUrl,
      ),
      { label: t('pricing.benefits.humanSupport') },
    ]
  }

  if (planType === 'plus') {
    return [
      {
        label: t('pricing.websiteCount', { count: 100 }),
        tooltip: {
          description: t('pricing.benefits.tooltips.plusWebsites'),
          ariaLabel: `${t('common.learnMore')}: ${t('pricing.websiteCount', {
            count: 100,
          })}`,
        },
      },
      {
        label: t('pricing.benefits.sessionReplays'),
        tooltipType: 'sessionReplays',
      },
      benefitWithTooltip(
        'pricing.benefits.featureFlags',
        'pricing.benefits.tooltips.featureFlags',
        t,
        featureFlagsDocsUrl,
      ),
      benefitWithTooltip(
        'pricing.benefits.abTesting',
        'pricing.benefits.tooltips.abTesting',
        t,
        experimentsDocsUrl,
      ),
      benefitWithTooltip(
        'pricing.benefits.twentyXHigherApiRateLimits',
        'pricing.benefits.tooltips.twentyXHigherApiRateLimits',
        t,
        statsApiDocsUrl,
      ),
      { label: t('pricing.benefits.prioritySupport') },
    ]
  }

  return [
    { label: t('pricing.benefits.dedicatedAccountManager') },
    benefitWithTooltip(
      'pricing.benefits.customEventLimits',
      'pricing.benefits.tooltips.customEventLimits',
      t,
    ),
    { label: t('pricing.benefits.customFeatures') },
    benefitWithTooltip(
      'pricing.benefits.onPremise',
      'pricing.benefits.tooltips.onPremise',
      t,
    ),
    benefitWithTooltip(
      'pricing.benefits.dedicatedInstance',
      'pricing.benefits.tooltips.dedicatedInstance',
      t,
    ),
    { label: t('pricing.benefits.ssoSaml') },
    { label: t('pricing.benefits.personalOnboarding') },
    benefitWithTooltip(
      'pricing.benefits.manualInvoicing',
      'pricing.benefits.tooltips.manualInvoicing',
      t,
    ),
    { label: t('pricing.benefits.sla') },
  ]
}

const BenefitTooltipContent = ({ tooltip }: { tooltip: BenefitTooltip }) => (
  <span className='block'>
    {tooltip.description}
    {tooltip.href && tooltip.linkLabel ? (
      <>
        {' '}
        <a
          href={tooltip.href}
          className='font-semibold underline decoration-dashed hover:decoration-solid'
          target='_blank'
          rel='noreferrer noopener'
        >
          {tooltip.linkLabel}
        </a>
      </>
    ) : null}
  </span>
)

const PlanInheritanceRow = ({
  label,
  isEnterprise,
}: {
  label: string
  isEnterprise: boolean
}) => {
  return (
    <div className='flex items-start gap-2.5'>
      <ArrowLeftIcon
        className={cn('mt-0.5 size-4 shrink-0', {
          'text-gray-700 dark:text-gray-200': !isEnterprise,
          'text-gray-200': isEnterprise,
        })}
        weight='bold'
      />
      <Text
        as='p'
        size='sm'
        colour='primary'
        weight='medium'
        className={cn('italic', isEnterprise ? 'dark' : '')}
      >
        {label}
      </Text>
    </div>
  )
}

const BenefitRow = ({
  benefit,
  isEnterprise,
}: {
  benefit: Benefit
  isEnterprise: boolean
}) => {
  return (
    <div className='flex items-start gap-2.5'>
      <CheckIcon
        className='mt-0.5 size-4 shrink-0 text-emerald-600'
        weight='bold'
      />
      <div className='flex min-w-0 items-center gap-1.5'>
        <Text
          as='p'
          size='sm'
          colour='primary'
          className={isEnterprise ? 'dark' : ''}
        >
          {benefit.label}
        </Text>
        {benefit.tooltipType === 'sessionReplays' ? (
          <SessionReplayPricingTooltip className={isEnterprise ? 'dark' : ''} />
        ) : null}
        {benefit.tooltip ? (
          <Tooltip
            ariaLabel={benefit.tooltip.ariaLabel}
            text={<BenefitTooltipContent tooltip={benefit.tooltip} />}
            className={isEnterprise ? 'dark' : ''}
          />
        ) : null}
      </div>
    </div>
  )
}

const BillingFrequencySwitch = ({ checked }: { checked: boolean }) => (
  <span
    aria-hidden='true'
    className={cn(
      'relative inline-flex h-4 w-7 shrink-0 items-center justify-start rounded-full border-2 border-transparent transition-colors duration-200 ease-out',
      checked ? 'bg-slate-900 dark:bg-slate-800' : 'bg-gray-300',
    )}
  >
    <span
      className={cn(
        'pointer-events-none inline-block size-3 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-out',
        checked ? 'translate-x-3' : 'translate-x-0',
      )}
    />
  </span>
)

export const PricingInternal = ({
  metainfo = DEFAULT_METAINFO,
  onSelectPlan,
  getActionLabel,
  loadingPlanType,
  disabled,
  showVatNote,
}: MarketingPricingProps) => {
  const { isAuthenticated } = useAuth()
  const { t } = useTranslation('common')
  const [billingFrequency, setBillingFrequency] =
    useState<BillingInterval>('monthly')
  const [selectedTierIndex, setSelectedTierIndex] = useState(0)
  const [expandedBenefitsByPlan, setExpandedBenefitsByPlan] = useState<
    Partial<Record<PlanTypeCode, boolean>>
  >({})

  const currencyCode = (
    metainfo.code in CURRENCIES ? metainfo.code : 'USD'
  ) as CurrencyCode
  const currency = CURRENCIES[currencyCode]
  const isCustomEventTier = selectedTierIndex === customEventTierIndex
  const selectedTier =
    EVENT_TIER_CODES[
      isCustomEventTier ? EVENT_TIER_CODES.length - 1 : selectedTierIndex
    ]
  const selectedMonthlyEvents = EVENT_TIERS[selectedTier].monthlyEvents
  const selectedMonthlyEventsLabel = `${formatEvents(selectedMonthlyEvents)}${
    isCustomEventTier ? '+' : ''
  }`
  const isYearly = billingFrequency === 'yearly'

  const sliderPercent = useMemo(() => {
    if (eventTierOptionLabels.length <= 1) return 0
    return (selectedTierIndex / (eventTierOptionLabels.length - 1)) * 100
  }, [selectedTierIndex])

  const toggleBillingFrequency = () => {
    setBillingFrequency((currentFrequency) =>
      currentFrequency === 'yearly' ? 'monthly' : 'yearly',
    )
  }

  return (
    <>
      <div className='mx-auto mt-10 max-w-xl px-4 sm:px-6 lg:px-8'>
        <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <div className='flex items-center gap-1.5'>
              <Text as='h3' size='lg' colour='secondary'>
                {t('pricing.monthlyEvents')}
              </Text>
              <Tooltip
                ariaLabel={`${t('common.learnMore')}: ${t(
                  'pricing.monthlyEvents',
                )}`}
                text={t('pricing.monthlyEventsTooltip')}
              />
            </div>
            <Text
              as='p'
              size='3xl'
              weight='bold'
              colour='primary'
              className='mt-1'
            >
              {selectedMonthlyEventsLabel}
            </Text>
          </div>

          <div className='flex justify-start sm:justify-end'>
            <button
              type='button'
              aria-pressed={isYearly}
              onClick={toggleBillingFrequency}
              className='flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-slate-900 dark:hover:bg-slate-800'
            >
              <Text as='span' size='sm' weight='medium' colour='primary'>
                {t('pricing.billedYearly')}
              </Text>
              <Text
                as='span'
                size='xs'
                weight='semibold'
                colour='success'
                className='rounded-md bg-emerald-500/20 px-1.5 py-0.5'
              >
                -17 %
              </Text>
              <BillingFrequencySwitch checked={isYearly} />
            </button>
          </div>
        </div>

        <input
          aria-label={t('pricing.monthlyEventVolume')}
          type='range'
          min={0}
          max={eventTierOptionLabels.length - 1}
          step={1}
          value={selectedTierIndex}
          onChange={(event) => setSelectedTierIndex(Number(event.target.value))}
          className='h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-600 [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-blue-600 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-sm active:[&::-moz-range-thumb]:cursor-grabbing [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-600 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm active:[&::-webkit-slider-thumb]:cursor-grabbing'
          style={{
            background: `linear-gradient(to right, rgb(37 99 235) 0%, rgb(37 99 235) ${sliderPercent}%, rgb(209 213 219) ${sliderPercent}%, rgb(209 213 219) 100%)`,
          }}
        />

        <div
          className='mt-3 grid gap-1'
          style={{
            gridTemplateColumns: `repeat(${eventTierOptionLabels.length}, minmax(0, 1fr))`,
          }}
        >
          {eventTierOptionLabels.map((label, index) => (
            <Text
              key={label}
              as='button'
              type='button'
              size='xs'
              weight={index === selectedTierIndex ? 'bold' : 'medium'}
              colour={index === selectedTierIndex ? 'primary' : 'secondary'}
              className={cn(
                'text-center whitespace-nowrap',
                index % 2 === 1 ? 'invisible sm:visible' : '',
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
            const isPlus = planType === 'plus'
            const isEnterprise = planType === 'enterprise'
            const inheritancePlanType =
              planType === 'plus'
                ? 'standard'
                : planType === 'enterprise'
                  ? 'plus'
                  : null
            const inheritanceLabel = inheritancePlanType
              ? t('pricing.benefits.everythingFrom', {
                  plan: getPlanName(inheritancePlanType, t),
                })
              : null
            const benefits = getBenefits(planType, t)
            const showAllBenefits = !!expandedBenefitsByPlan[planType]
            const visibleBenefits = showAllBenefits
              ? benefits
              : benefits.slice(0, visibleBenefitsCount)
            const hiddenBenefitsCount = Math.max(
              0,
              benefits.length - visibleBenefits.length,
            )
            const monthlyPlan = isCustomEventTier
              ? null
              : getPlanPrice(planType, selectedTier, 'monthly', currencyCode)
            const yearlyPlan = isCustomEventTier
              ? null
              : getPlanPrice(planType, selectedTier, 'yearly', currencyCode)
            const monthlyPrice = monthlyPlan?.amount
            const yearlyPrice = yearlyPlan?.amount
            const yearlyMonthlyPrice = yearlyPrice
              ? Math.round((yearlyPrice / 12) * 100) / 100
              : null
            const hasPublishedPrice = Boolean(monthlyPrice && yearlyPrice)
            const canSelfServe = Boolean(
              (isYearly ? yearlyPlan : monthlyPlan)?.paddlePlanId,
            )
            const selection: MarketingPricingSelection = {
              planType,
              eventTier: selectedTier,
              billingFrequency,
              currency: currencyCode,
            }
            const actionLabel =
              getActionLabel?.(selection) ||
              (canSelfServe
                ? t('pricing.startFreeTrial')
                : t('pricing.contactUs'))

            return (
              <div
                key={planType}
                className={cn(
                  'flex min-h-[520px] flex-col rounded-2xl p-5',
                  isEnterprise
                    ? 'bg-slate-900 ring-1 ring-slate-700 dark:ring-white/10'
                    : isPlus
                      ? 'bg-white ring-2 ring-slate-900/60 dark:bg-slate-900 dark:ring-slate-200/60'
                      : 'bg-white ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-white/10',
                )}
              >
                <div className='flex items-start justify-between gap-3'>
                  <Text
                    as='h3'
                    size='lg'
                    weight='bold'
                    colour='primary'
                    className={isEnterprise ? 'dark' : ''}
                  >
                    {getPlanName(planType, t)}
                  </Text>
                  {isPlus ? (
                    <Badge
                      label={t('pricing.bestValue')}
                      colour='slate'
                      size='md'
                      className='shrink-0'
                    />
                  ) : null}
                </div>

                <div className='mt-2 min-h-[78px]'>
                  {hasPublishedPrice ? (
                    <>
                      <div className='flex min-h-10 flex-wrap items-baseline gap-x-2 gap-y-1'>
                        <div className='flex flex-wrap items-baseline gap-2'>
                          <Text
                            as='span'
                            size='3xl'
                            weight='bold'
                            colour='primary'
                            className={cn(
                              'leading-none',
                              isEnterprise ? 'dark' : '',
                            )}
                          >
                            <PriceAmount
                              value={
                                isYearly
                                  ? (yearlyPrice ?? null)
                                  : (monthlyPrice ?? null)
                              }
                              currencySymbol={currency.symbol}
                              className='leading-none align-baseline'
                            />
                          </Text>
                          <Text
                            as='span'
                            size='base'
                            weight='medium'
                            colour='secondary'
                            className={cn(
                              'leading-none',
                              isEnterprise ? 'dark' : '',
                            )}
                          >
                            {`/${t(
                              isYearly
                                ? 'pricing.intervals.year'
                                : 'pricing.intervals.month',
                            )}`}
                          </Text>
                        </div>
                        {showVatNote ? (
                          <Text
                            as='span'
                            size='xs'
                            weight='medium'
                            colour='secondary'
                            className={cn(
                              'ml-auto shrink-0 text-right leading-none',
                              isEnterprise ? 'dark' : '',
                            )}
                          >
                            {t('pricing.vatApplicable')}
                          </Text>
                        ) : null}
                      </div>
                      {isYearly ? (
                        <div className='mt-1 flex h-6 flex-wrap items-baseline gap-1'>
                          <Text
                            as='span'
                            size='sm'
                            weight='medium'
                            colour='secondary'
                            className={cn(
                              'line-through',
                              isEnterprise ? 'dark' : '',
                            )}
                          >
                            {formatPrice(monthlyPrice ?? null, currency.symbol)}
                          </Text>
                          <Text
                            as='span'
                            size='sm'
                            weight='bold'
                            colour='primary'
                            className={isEnterprise ? 'dark' : ''}
                          >
                            {formatPrice(yearlyMonthlyPrice, currency.symbol)}
                          </Text>
                          <Text
                            as='span'
                            size='sm'
                            weight='medium'
                            colour='secondary'
                            className={isEnterprise ? 'dark' : ''}
                          >
                            /{t('pricing.intervals.month')}
                          </Text>
                        </div>
                      ) : (
                        <div className='mt-2 h-6' aria-hidden='true' />
                      )}
                    </>
                  ) : (
                    <Text
                      as='p'
                      size='3xl'
                      weight='bold'
                      colour='primary'
                      className={isEnterprise ? 'dark' : ''}
                    >
                      {t('pricing.custom')}
                    </Text>
                  )}
                </div>

                <Button
                  to={
                    onSelectPlan && canSelfServe
                      ? undefined
                      : canSelfServe
                        ? isAuthenticated
                          ? routes.billing_choose_plan
                          : routes.signup
                        : routes.contact
                  }
                  onClick={
                    onSelectPlan && canSelfServe
                      ? () => onSelectPlan(selection)
                      : undefined
                  }
                  variant='primary'
                  size='lg'
                  loading={loadingPlanType === planType}
                  disabled={disabled}
                  className={cn(
                    'mt-2 justify-center gap-2',
                    isEnterprise ? 'dark' : '',
                  )}
                >
                  <Text as='span' size='sm' weight='semibold' colour='inherit'>
                    {actionLabel}
                  </Text>
                  <ArrowRightIcon className='size-4' />
                </Button>

                <div className='mt-5 space-y-3'>
                  {inheritanceLabel ? (
                    <PlanInheritanceRow
                      label={inheritanceLabel}
                      isEnterprise={isEnterprise}
                    />
                  ) : null}
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
                      onClick={() =>
                        setExpandedBenefitsByPlan((current) => ({
                          ...current,
                          [planType]: !current[planType],
                        }))
                      }
                      className='underline-animate flex items-center gap-2.5'
                    >
                      {showAllBenefits ? (
                        <CaretUpIcon
                          className={cn(
                            'size-4',
                            isEnterprise ? 'text-gray-200' : 'text-gray-700',
                          )}
                          weight='bold'
                        />
                      ) : (
                        <CaretDownIcon
                          className={cn(
                            'size-4',
                            isEnterprise ? 'text-gray-200' : 'text-gray-700',
                          )}
                          weight='bold'
                        />
                      )}
                      <Text
                        as='span'
                        size='sm'
                        weight='medium'
                        colour='primary'
                        className={isEnterprise ? 'dark' : ''}
                      >
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
    </>
  )
}

const MarketingPricing = ({
  metainfo = DEFAULT_METAINFO,
  onSelectPlan,
  getActionLabel,
  loadingPlanType,
  disabled,
  showVatNote,
}: MarketingPricingProps) => {
  const { t } = useTranslation('common')
  return (
    <section id='pricing' className='relative bg-gray-50 p-2 dark:bg-slate-950'>
      <div className='overflow-hidden rounded-2xl bg-gray-100 py-16 ring-1 ring-gray-200/70 sm:py-20 dark:bg-slate-900/50 dark:ring-white/10'>
        <div className='mx-auto max-w-7xl'>
          <div className='mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8'>
            <Text
              as='h2'
              size='3xl'
              weight='bold'
              colour='primary'
              className='sm:text-4xl'
            >
              {t('pricing.title')}
            </Text>
            <Text
              as='p'
              size='base'
              colour='primary'
              className='mt-6 whitespace-pre-line'
            >
              {t('pricing.adv', { amount: TRIAL_DAYS })}
            </Text>
          </div>

          <PricingInternal
            metainfo={metainfo}
            onSelectPlan={onSelectPlan}
            getActionLabel={getActionLabel}
            loadingPlanType={loadingPlanType}
            disabled={disabled}
            showVatNote={showVatNote}
          />
        </div>
      </div>
    </section>
  )
}

export default MarketingPricing
