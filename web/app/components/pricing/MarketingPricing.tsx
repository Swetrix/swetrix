import _map from 'lodash/map'
import _round from 'lodash/round'
import { ArrowRightIcon, QuestionIcon, CheckIcon } from '@phosphor-icons/react'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import {
  CURRENCIES,
  PLAN_LIMITS,
  STANDARD_PLANS,
  BillingFrequency,
  TRIAL_DAYS,
} from '~/lib/constants'
import { DEFAULT_METAINFO, Metainfo } from '~/lib/models/Metainfo'
import { useAuth } from '~/providers/AuthProvider'
import { Switch } from '~/ui/Switch'
import Tooltip from '~/ui/Tooltip'
import routes from '~/utils/routes'

const formatEventsLong = (value: number) => value.toLocaleString('en-US')

interface MarketingPricingProps {
  metainfo?: Metainfo
}

const MarketingPricing = ({
  metainfo = DEFAULT_METAINFO,
}: MarketingPricingProps) => {
  const { isAuthenticated } = useAuth()
  const { t } = useTranslation('common')
  const [billingFrequency, setBillingFrequency] = useState(
    BillingFrequency.monthly,
  )

  const currencyCode = metainfo.code
  const currency = CURRENCIES[currencyCode]

  const plans = STANDARD_PLANS.map(
    (code) => PLAN_LIMITS[code as keyof typeof PLAN_LIMITS],
  )

  const yearlyDiscount = useMemo(() => {
    const firstPlan = plans[0]
    if (!firstPlan) return 0

    const monthlyPrice = firstPlan.price[currencyCode]?.monthly ?? 0
    const yearlyPrice = firstPlan.price[currencyCode]?.yearly ?? 0

    if (monthlyPrice === 0) return 0

    const annualCostIfMonthly = monthlyPrice * 12
    const savings = annualCostIfMonthly - yearlyPrice
    const discountPercentage = (savings / annualCostIfMonthly) * 100

    return _round(discountPercentage, 0)
  }, [plans, currencyCode])

  return (
    <section id='pricing' className='relative p-2'>
      <div className='rounded-xl bg-slate-900 py-16 sm:py-20'>
        <div className='mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-12 lg:gap-10 lg:px-8'>
          <div className='col-span-12 lg:col-span-5'>
            <h2 className='text-3xl font-extrabold tracking-tight text-white sm:text-4xl'>
              {t('pricing.title')}
            </h2>
            <p className='mt-2 max-w-md text-sm text-gray-100'>
              {t('pricing.adv', {
                amount: TRIAL_DAYS,
              })}
            </p>

            <div className='mt-8 space-y-3'>
              {[
                {
                  label: (
                    <div className='flex items-center gap-2'>
                      <span>
                        {t('pricing.tiers.upToXWebsites', { amount: 50 })}
                      </span>
                      <Tooltip
                        text={t('pricing.tiers.moreWebsitesForFee', {
                          amount: 50,
                        })}
                        tooltipNode={
                          <QuestionIcon className='size-4 stroke-gray-50' />
                        }
                      />
                    </div>
                  ),
                  key: 'upToXWebsites',
                },
                {
                  label: t('pricing.tiers.trafficWebAnalytics'),
                  key: 'trafficWebAnalytics',
                },
                {
                  label: t('pricing.tiers.sessionAnalysis'),
                  key: 'sessionAnalysis',
                },
                {
                  label: t('pricing.tiers.websiteSpeedAnalytics'),
                  key: 'websiteSpeedAnalytics',
                },
                {
                  label: t('pricing.tiers.errorTracking'),
                  key: 'errorTracking',
                },
                {
                  label: t('pricing.tiers.funnels'),
                  key: 'funnels',
                },
                {
                  label: t('pricing.tiers.featureFlags'),
                  key: 'featureFlags',
                },
                {
                  label: t('pricing.tiers.experiments'),
                  key: 'experiments',
                },
                {
                  label: t('pricing.tiers.captcha'),
                  key: 'captcha',
                },
                {
                  label: t('pricing.tiers.apiAccess'),
                  key: 'apiAccess',
                },
                {
                  label: t('pricing.tiers.teamMembers'),
                  key: 'teamMembers',
                },
              ].map(({ label, key }) => (
                <div key={key} className='flex items-center text-gray-100'>
                  <CheckIcon className='mr-3 size-5' />
                  <span className='text-sm'>{label}</span>
                </div>
              ))}
            </div>

            <Link
              to={isAuthenticated ? routes.billing : routes.signup}
              className='mt-8 flex max-w-max items-center justify-center rounded-md border-2 border-slate-50 bg-gray-50 px-8 py-4 text-slate-900 transition-all hover:bg-transparent hover:text-gray-50'
              aria-label={
                isAuthenticated
                  ? t('main.goToBilling')
                  : t('main.startAXDayFreeTrial', { amount: TRIAL_DAYS })
              }
            >
              <span className='mr-1 text-center text-base font-semibold'>
                {isAuthenticated
                  ? t('main.goToBilling')
                  : t('main.startAXDayFreeTrial', { amount: TRIAL_DAYS })}
              </span>
              <ArrowRightIcon className='mt-[1px] h-4 w-5' />
            </Link>
          </div>

          <div className='col-span-12 lg:col-span-7'>
            <div className='mb-3 flex justify-end'>
              <button
                type='button'
                onClick={() =>
                  setBillingFrequency(
                    billingFrequency === BillingFrequency.yearly
                      ? BillingFrequency.monthly
                      : BillingFrequency.yearly,
                  )
                }
                className='flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-colors border-white/10 bg-slate-900 hover:bg-slate-800'
              >
                <span className='text-sm font-medium text-gray-100'>
                  {t('pricing.billedYearly')}
                </span>
                {yearlyDiscount > 0 ? (
                  <span className='rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-xs font-semibold text-emerald-300'>
                    -{yearlyDiscount} %
                  </span>
                ) : null}
                <Switch
                  checked={billingFrequency === BillingFrequency.yearly}
                  onChange={() =>
                    setBillingFrequency(
                      billingFrequency === BillingFrequency.yearly
                        ? BillingFrequency.monthly
                        : BillingFrequency.yearly,
                    )
                  }
                />
              </button>
            </div>
            <div className='space-y-3'>
              {_map(plans, (tier) => (
                <div
                  key={tier.planCode}
                  className='flex items-center justify-between rounded-xl border border-white/10 bg-white/2 px-4 py-3 text-white backdrop-blur-sm transition-all hover:bg-white/10 dark:bg-slate-900 dark:hover:bg-slate-800'
                >
                  <div>
                    <span className='text-base font-medium'>
                      {formatEventsLong(tier.monthlyUsageLimit)}
                    </span>
                    &nbsp;
                    <span className='text-sm text-gray-400'>
                      {t('pricing.eventsPerMonth')}
                    </span>
                  </div>
                  <div className='text-sm'>
                    <span className='font-semibold text-white'>
                      {currency.symbol}
                      {(billingFrequency === BillingFrequency.monthly
                        ? tier.price[currencyCode].monthly
                        : tier.price[currencyCode].yearly
                      ).toFixed(2)}
                    </span>
                    &nbsp;
                    <span className='text-sm text-gray-400'>
                      /
                      {t(
                        billingFrequency === BillingFrequency.monthly
                          ? 'pricing.perMonth'
                          : 'pricing.perYear',
                      )}
                    </span>
                  </div>
                </div>
              ))}

              <a
                href={routes.contact}
                target='_blank'
                rel='noopener noreferrer'
                aria-label={`${t('footer.contact')} (opens in a new tab)`}
                className='group flex items-center justify-between rounded-xl border border-white/10 bg-white/2 px-4 py-3 text-white backdrop-blur-sm transition-all hover:bg-white/10'
              >
                <span className='text-base font-medium'>
                  {t('pricing.overXEvents', {
                    amount: formatEventsLong(20000000),
                  })}
                </span>
                <p className='text-sm group-hover:underline'>
                  {t('pricing.contactUs')}
                </p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default MarketingPricing
