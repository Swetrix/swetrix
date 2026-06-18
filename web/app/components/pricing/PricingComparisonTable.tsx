import { ArrowRightIcon, CheckIcon } from '@phosphor-icons/react'
import type { TFunction } from 'i18next'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { CURRENCIES } from '~/lib/constants'
import { DEFAULT_METAINFO, Metainfo } from '~/lib/models/Metainfo'
import {
  getPlanPrice,
  type CurrencyCode,
  type EventTierCode,
  type PlanTypeCode,
} from '~/lib/pricing/catalog'
import { formatCurrencyAmount } from '~/lib/pricing/format'
import { Badge } from '~/ui/Badge'
import Button from '~/ui/Button'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { cn } from '~/utils/generic'
import routes from '~/utils/routes'

const STARTER_TIER: EventTierCode = '100k'

type CellValue = boolean | { key: string; tooltip?: string }

interface FeatureRow {
  label: string
  tooltip?: string
  tooltipHref?: string
  values: [CellValue, CellValue, CellValue]
}

interface FeatureCategory {
  title: string
  rows: FeatureRow[]
}

interface PlanColumn {
  type: PlanTypeCode
  highlight: boolean
  to: string
}

const PLAN_COLUMNS: PlanColumn[] = [
  { type: 'standard', highlight: false, to: routes.signup },
  { type: 'plus', highlight: true, to: routes.signup },
  { type: 'enterprise', highlight: false, to: routes.contact },
]

const docs = {
  askAi: 'https://swetrix.com/docs/analytics-dashboard/ask-ai',
  cookieless: 'https://swetrix.com/docs/visitor-identification',
  alerts: 'https://swetrix.com/docs/analytics-dashboard/alerts',
  revenue: 'https://swetrix.com/docs/analytics-dashboard/revenue-tracking',
  segments: 'https://swetrix.com/docs/analytics-dashboard/segments',
  seo: 'https://swetrix.com/docs/analytics-dashboard/seo',
} as const

const ALL: [CellValue, CellValue, CellValue] = [true, true, true]
const PLUS_UP: [CellValue, CellValue, CellValue] = [false, true, true]
const ENTERPRISE_ONLY: [CellValue, CellValue, CellValue] = [false, false, true]

const getCategories = (t: TFunction): FeatureCategory[] => [
  {
    title: t('pricing.comparison.categories.core'),
    rows: [
      {
        label: t('pricing.comparison.features.websites'),
        values: [
          {
            key: 'pricing.comparison.values.websitesStandard',
            tooltip: 'pricing.comparison.tooltips.websites',
          },
          {
            key: 'pricing.comparison.values.websitesPlus',
            tooltip: 'pricing.comparison.tooltips.websites',
          },
          { key: 'pricing.custom' },
        ],
      },
      {
        label: t('pricing.benefits.unlimitedMembers'),
        values: [
          { key: 'pricing.comparison.values.unlimited' },
          { key: 'pricing.comparison.values.unlimited' },
          { key: 'pricing.comparison.values.unlimited' },
        ],
      },
      {
        label: t('pricing.monthlyEvents'),
        tooltip: t('pricing.monthlyEventsTooltip'),
        values: [
          { key: 'pricing.comparison.values.eventsUpTo' },
          { key: 'pricing.comparison.values.eventsUpTo' },
          { key: 'pricing.custom' },
        ],
      },
      {
        label: t('pricing.comparison.features.realtimeDashboard'),
        values: ALL,
      },
      {
        label: t('pricing.comparison.features.cookieless'),
        tooltip: t('pricing.comparison.tooltips.cookieless'),
        tooltipHref: docs.cookieless,
        values: ALL,
      },
      { label: t('pricing.comparison.features.noDataSampling'), values: ALL },
      {
        label: t('pricing.comparison.features.publicDashboards'),
        tooltip: t('pricing.comparison.tooltips.publicDashboards'),
        values: ALL,
      },
      {
        label: t('pricing.benefits.googleAnalyticsImport'),
        tooltip: t('pricing.benefits.tooltips.googleAnalyticsImport'),
        values: ALL,
      },
    ],
  },
  {
    title: t('pricing.comparison.categories.insights'),
    rows: [
      {
        label: t('pricing.benefits.eventsAndGoals'),
        tooltip: t('pricing.benefits.tooltips.eventsAndGoals'),
        values: ALL,
      },
      {
        label: t('pricing.benefits.funnels'),
        tooltip: t('pricing.benefits.tooltips.funnels'),
        values: ALL,
      },
      {
        label: t('pricing.comparison.features.userFlow'),
        tooltip: t('pricing.comparison.tooltips.userFlow'),
        values: ALL,
      },
      {
        label: t('pricing.comparison.features.segments'),
        tooltip: t('pricing.comparison.tooltips.segments'),
        tooltipHref: docs.segments,
        values: ALL,
      },
      {
        label: t('pricing.comparison.features.askAi'),
        tooltip: t('pricing.comparison.tooltips.askAi'),
        tooltipHref: docs.askAi,
        values: ALL,
      },
      {
        label: t('pricing.benefits.sessionUserProfileAnalysis'),
        tooltip: t('pricing.benefits.tooltips.sessionUserProfileAnalysis'),
        values: ALL,
      },
      {
        label: t('pricing.benefits.performanceMonitoring'),
        tooltip: t('pricing.benefits.tooltips.performanceMonitoring'),
        values: ALL,
      },
      {
        label: t('pricing.benefits.errorTracking'),
        tooltip: t('pricing.benefits.tooltips.errorTracking'),
        values: ALL,
      },
      {
        label: t('pricing.comparison.features.seo'),
        tooltip: t('pricing.comparison.tooltips.seo'),
        tooltipHref: docs.seo,
        values: ALL,
      },
      {
        label: t('pricing.comparison.features.revenue'),
        tooltip: t('pricing.comparison.tooltips.revenue'),
        tooltipHref: docs.revenue,
        values: ALL,
      },
      {
        label: t('pricing.benefits.emailReports'),
        tooltip: t('pricing.benefits.tooltips.emailReports'),
        values: ALL,
      },
      {
        label: t('pricing.comparison.features.alerts'),
        tooltip: t('pricing.comparison.tooltips.alerts'),
        tooltipHref: docs.alerts,
        values: ALL,
      },
    ],
  },
  {
    title: t('pricing.comparison.categories.advanced'),
    rows: [
      {
        label: t('pricing.benefits.sessionReplays'),
        tooltip: t('pricing.benefits.tooltips.sessionReplays.description'),
        values: PLUS_UP,
      },
      {
        label: t('pricing.benefits.featureFlags'),
        tooltip: t('pricing.benefits.tooltips.featureFlags'),
        values: PLUS_UP,
      },
      {
        label: t('pricing.benefits.abTesting'),
        tooltip: t('pricing.benefits.tooltips.abTesting'),
        values: PLUS_UP,
      },
    ],
  },
  {
    title: t('pricing.comparison.categories.privacy'),
    rows: [
      {
        label: t('pricing.benefits.advancedBotDetection'),
        tooltip: t('pricing.benefits.tooltips.advancedBotDetection'),
        values: ALL,
      },
      {
        label: t('pricing.benefits.adBlockerBypass'),
        tooltip: t('pricing.benefits.tooltips.adBlockerBypass'),
        values: ALL,
      },
      {
        label: t('pricing.benefits.recaptchaAlternative'),
        tooltip: t('pricing.benefits.tooltips.recaptchaAlternative'),
        values: ALL,
      },
      { label: t('pricing.comparison.features.gdprCompliant'), values: ALL },
      {
        label: t('pricing.comparison.features.openSource'),
        tooltip: t('pricing.comparison.tooltips.openSource'),
        values: ALL,
      },
      {
        label: t('pricing.comparison.features.twoFactor'),
        tooltip: t('pricing.comparison.tooltips.twoFactor'),
        values: ALL,
      },
    ],
  },
  {
    title: t('pricing.comparison.categories.developer'),
    rows: [
      {
        label: t('pricing.benefits.restfulApiSdks'),
        tooltip: t('pricing.benefits.tooltips.restfulApiSdks'),
        values: ALL,
      },
      {
        label: t('pricing.comparison.features.apiRateLimits'),
        tooltip: t('pricing.benefits.tooltips.twentyXHigherApiRateLimits'),
        values: [
          { key: 'pricing.comparison.values.apiRateStandard' },
          { key: 'pricing.comparison.values.apiRatePlus' },
          { key: 'pricing.custom' },
        ],
      },
    ],
  },
  {
    title: t('pricing.comparison.categories.support'),
    rows: [
      { label: t('pricing.benefits.humanSupport'), values: ALL },
      { label: t('pricing.benefits.prioritySupport'), values: PLUS_UP },
      {
        label: t('pricing.comparison.features.dedicatedAccountManager'),
        values: ENTERPRISE_ONLY,
      },
      {
        label: t('pricing.benefits.personalOnboarding'),
        values: ENTERPRISE_ONLY,
      },
      { label: t('pricing.benefits.sla'), values: ENTERPRISE_ONLY },
    ],
  },
  {
    title: t('pricing.comparison.categories.enterprise'),
    rows: [
      { label: t('pricing.benefits.ssoSaml'), values: ENTERPRISE_ONLY },
      {
        label: t('pricing.benefits.onPremise'),
        tooltip: t('pricing.benefits.tooltips.onPremise'),
        values: ENTERPRISE_ONLY,
      },
      {
        label: t('pricing.benefits.dedicatedInstance'),
        tooltip: t('pricing.benefits.tooltips.dedicatedInstance'),
        values: ENTERPRISE_ONLY,
      },
      { label: t('pricing.benefits.customFeatures'), values: ENTERPRISE_ONLY },
      {
        label: t('pricing.benefits.manualInvoicing'),
        tooltip: t('pricing.benefits.tooltips.manualInvoicing'),
        values: ENTERPRISE_ONLY,
      },
    ],
  },
]

const PLUS_TINT = 'bg-gray-100 dark:bg-slate-900'
const PLUS_HOVER = 'group-hover:bg-gray-200 dark:group-hover:bg-slate-800'
const ROW_HOVER = 'group-hover:bg-gray-100 dark:group-hover:bg-white/[0.04]'
const HEADER_BG = 'bg-gray-50 dark:bg-slate-950'
const ROW_BORDER = 'border-t border-gray-200/70 dark:border-white/[0.07]'
const CATEGORY_BORDER = 'border-t border-gray-200 dark:border-white/10'

const RowTooltipContent = ({
  description,
  href,
}: {
  description: string
  href?: string
}) => {
  const { t } = useTranslation('common')

  return (
    <span className='block'>
      {description}
      {href ? (
        <>
          {' '}
          <a
            href={href}
            target='_blank'
            rel='noreferrer noopener'
            className='font-semibold underline decoration-dashed hover:decoration-solid'
          >
            {t('common.learnMore')}
          </a>
        </>
      ) : null}
    </span>
  )
}

interface PricingComparisonTableProps {
  metainfo?: Metainfo
  variant?: 'marketing' | 'billing'
}

export const PricingComparisonTable = ({
  metainfo = DEFAULT_METAINFO,
  variant = 'marketing',
}: PricingComparisonTableProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const categories = useMemo(() => getCategories(t), [t])

  const isMarketing = variant === 'marketing'

  const currencyCode = (
    metainfo.code in CURRENCIES ? metainfo.code : 'USD'
  ) as CurrencyCode

  const table = (
    <div className='overflow-x-auto lg:overflow-x-visible'>
      <table className='w-full min-w-[760px] border-separate border-spacing-0'>
        <colgroup>
          <col className='w-[34%]' />
          <col className='w-[22%]' />
          <col className='w-[22%]' />
          <col className='w-[22%]' />
        </colgroup>

        <thead className='sticky top-0 z-20'>
          <tr>
            <th
              scope='col'
              className={cn(
                'px-4 pt-6 pb-5 text-left align-bottom sm:px-6',
                HEADER_BG,
                'border-b border-gray-200 dark:border-white/10',
              )}
            >
              {isMarketing ? (
                <Text
                  as='h2'
                  size='2xl'
                  weight='bold'
                  tracking='tight'
                  colour='primary'
                  className='max-w-[14ch] text-balance lg:text-3xl'
                >
                  {t('pricing.comparison.title')}
                </Text>
              ) : null}
            </th>
            {PLAN_COLUMNS.map((plan) => {
              const starterPrice = isMarketing
                ? getPlanPrice(plan.type, STARTER_TIER, 'monthly', currencyCode)
                    ?.amount
                : null
              const priceLabel =
                starterPrice != null
                  ? t('pricing.comparison.fromPerMonth', {
                      price: formatCurrencyAmount(
                        starterPrice,
                        currencyCode,
                        language,
                      ),
                    })
                  : t('pricing.custom')

              return (
                // oxlint-disable-next-line jsx-a11y/control-has-associated-label
                <th
                  key={plan.type}
                  scope='col'
                  className={cn(
                    'px-4 pt-6 pb-5 text-center align-bottom sm:px-6',
                    'border-b border-gray-200 dark:border-white/10',
                    plan.highlight ? cn(PLUS_TINT, 'rounded-t-2xl') : HEADER_BG,
                  )}
                >
                  <div className='flex flex-col items-center gap-1.5'>
                    <div className='flex items-center gap-2'>
                      <Text as='span' size='lg' weight='bold' colour='primary'>
                        {t(`pricing.planTypes.${plan.type}.name`)}
                      </Text>
                      {plan.highlight ? (
                        <Badge
                          label={t('pricing.bestValue')}
                          colour='slate'
                          size='sm'
                        />
                      ) : null}
                    </div>
                    {isMarketing ? (
                      <>
                        <Text
                          as='span'
                          size='sm'
                          weight='medium'
                          colour='secondary'
                        >
                          {priceLabel}
                        </Text>
                        <Button
                          to={plan.to}
                          variant={plan.highlight ? 'primary' : 'secondary'}
                          size='sm'
                          className='mt-1 justify-center gap-1.5'
                        >
                          <Text
                            as='span'
                            size='xs'
                            weight='semibold'
                            colour='inherit'
                          >
                            {t(`pricing.planTypes.${plan.type}.cta`)}
                          </Text>
                          <ArrowRightIcon className='size-3.5' />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>

        <tbody>
          {categories.map((category, categoryIndex) => (
            <FeatureCategoryRows
              key={category.title}
              category={category}
              isLastCategory={categoryIndex === categories.length - 1}
            />
          ))}
        </tbody>
      </table>
    </div>
  )

  if (!isMarketing) {
    return table
  }

  return (
    <section className='relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24'>
      {table}
    </section>
  )
}

const FeatureCategoryRows = ({
  category,
  isLastCategory,
}: {
  category: FeatureCategory
  isLastCategory: boolean
}) => {
  return (
    <>
      {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
      <tr>
        <th
          scope='colgroup'
          className={cn(
            'px-4 pt-9 pb-3 text-left align-bottom sm:px-6',
            CATEGORY_BORDER,
          )}
        >
          <Text
            as='span'
            size='xs'
            weight='bold'
            colour='primary'
            className='tracking-wider uppercase'
          >
            {category.title}
          </Text>
        </th>
        <td aria-hidden className={CATEGORY_BORDER} />
        <td aria-hidden className={cn(PLUS_TINT, CATEGORY_BORDER)} />
        <td aria-hidden className={CATEGORY_BORDER} />
      </tr>

      {category.rows.map((row, rowIndex) => {
        const isLastRow =
          isLastCategory && rowIndex === category.rows.length - 1

        return (
          <tr key={row.label} className='group [&>*]:transition-colors'>
            <th
              scope='row'
              className={cn(
                'px-4 py-3.5 text-left align-middle font-normal sm:px-6',
                ROW_BORDER,
                ROW_HOVER,
              )}
            >
              <span className='flex items-center gap-1.5'>
                <Text as='span' size='sm' colour='secondary'>
                  {row.label}
                </Text>
                {row.tooltip ? (
                  <Tooltip
                    text={
                      <RowTooltipContent
                        description={row.tooltip}
                        href={row.tooltipHref}
                      />
                    }
                    ariaLabel={`${row.label}: ${row.tooltip}`}
                    className='shrink-0'
                  />
                ) : null}
              </span>
            </th>
            {row.values.map((value, valueIndex) => (
              <ValueCell
                key={valueIndex}
                value={value}
                highlight={PLAN_COLUMNS[valueIndex].highlight}
                isLastRow={isLastRow}
              />
            ))}
          </tr>
        )
      })}
    </>
  )
}

const ValueCell = ({
  value,
  highlight,
  isLastRow,
}: {
  value: CellValue
  highlight: boolean
  isLastRow: boolean
}) => {
  const { t } = useTranslation('common')

  return (
    <td
      className={cn(
        'px-4 py-3.5 text-center align-middle sm:px-6',
        ROW_BORDER,
        highlight
          ? cn(PLUS_TINT, PLUS_HOVER, isLastRow && 'rounded-b-2xl')
          : ROW_HOVER,
      )}
    >
      {typeof value === 'boolean' ? (
        value ? (
          <>
            <CheckIcon
              className='mx-auto size-[18px] text-emerald-600 dark:text-emerald-400'
              weight='bold'
              aria-hidden='true'
            />
            <span className='sr-only'>{t('pricing.comparison.included')}</span>
          </>
        ) : (
          <>
            <span
              aria-hidden='true'
              className='mx-auto block h-px w-3.5 rounded-full bg-gray-300 dark:bg-gray-600'
            />
            <span className='sr-only'>
              {t('pricing.comparison.notIncluded')}
            </span>
          </>
        )
      ) : (
        <span className='inline-flex items-center justify-center gap-1.5'>
          <Text as='span' size='sm' weight='medium' colour='primary'>
            {t(value.key)}
          </Text>
          {value.tooltip ? (
            <Tooltip
              text={t(value.tooltip)}
              ariaLabel={`${t(value.key)}: ${t(value.tooltip)}`}
              className='shrink-0'
            />
          ) : null}
        </span>
      )}
    </td>
  )
}
