import {
  TrendUpIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
} from '@phosphor-icons/react'
import { useState, useEffect } from 'react'
import type { MetaFunction } from 'react-router'
import { redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import { ToolsNav, ToolsNavMobile } from '~/components/ToolsNav'
import { isSelfhosted } from '~/lib/constants'
import Input from '~/ui/Input'
import { Text } from '~/ui/Text'
import { FAQ } from '~/ui/FAQ'
import Tooltip from '~/ui/Tooltip'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

export const meta: MetaFunction = () => {
  return [
    ...getTitle('Free ROI Calculator tool - Calculate your ROI'),
    ...getDescription(
      'Free Marketing ROI Calculator: quickly calculate ROAS, ROI, profit, CAC, CPC, CPM, CTR, conversion rate, and break-even ROAS to measure and improve your campaign performance.',
    ),
    ...getPreviewImage(),
  ]
}

export const sitemap: SitemapFunction = () => ({
  priority: 0.8,
  exclude: isSelfhosted,
})

export async function loader() {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  return null
}

interface CampaignMetrics {
  campaignName: string
  adSpend: number
  revenue: number
  conversions: number
  clicks: number
  impressions: number
}

interface CalculatedMetrics {
  roi: number
  roas: number
  cpc: number
  cpm: number
  ctr: number
  conversionRate: number
  cac: number
  profit: number
  breakEvenRoas: number
  marginOfSafety: number
}

const FAQ_ITEMS = [
  {
    question: 'What is ROI (Return on Investment)?',
    answer:
      "ROI measures the profitability of an investment as a percentage. It's calculated as (Revenue - Cost) / Cost × 100. For example, if you spend $100 and earn $150, your ROI is 50%.",
  },
  {
    question: 'What is ROAS (Return on Ad Spend)?',
    answer:
      "ROAS measures revenue generated for every dollar spent on advertising. It's calculated as Revenue / Ad Spend. A ROAS of 3:1 means you earn $3 for every $1 spent on ads.",
  },
  {
    question: "What's the difference between ROI and ROAS?",
    answer:
      'ROI measures net profit (revenue minus costs) as a percentage of investment, while ROAS measures gross revenue as a ratio to ad spend. ROI accounts for profitability, ROAS focuses on revenue generation.',
  },
  {
    question: 'What is CAC (Customer Acquisition Cost)?',
    answer:
      "CAC is the average cost to acquire one customer, calculated as Total Ad Spend / Number of Conversions. It helps determine if you're spending efficiently to gain customers.",
  },
  {
    question: 'What is a good ROAS for digital marketing?',
    answer:
      'A "good" ROAS varies by industry and profit margins. Generally, a 4:1 ratio ($4 revenue per $1 spent) is considered healthy. However, businesses with high margins might profit at 2:1, while low-margin businesses might need 8:1 or higher.',
  },
  {
    question: 'What is CTR (Click-Through Rate)?',
    answer:
      'CTR measures the percentage of people who click your ad after seeing it, calculated as (Clicks / Impressions) × 100. Higher CTR indicates more engaging ads.',
  },
  {
    question: 'What is CPM (Cost Per Mille)?',
    answer:
      "CPM is the cost per 1,000 impressions. It's calculated as (Ad Spend / Impressions) × 1,000. It's useful for comparing the cost-effectiveness of different advertising channels.",
  },
  {
    question: 'What is CPC (Cost Per Click)?',
    answer:
      'CPC is the average amount you pay for each click on your ads, calculated as Ad Spend / Clicks. Lower CPC means more efficient ad spending.',
  },
  {
    question: 'What is Break-Even ROAS?',
    answer:
      'Break-Even ROAS is the minimum ROAS needed to cover your costs without profit or loss. If your profit margin is 40%, your break-even ROAS is 2.5:1 (1 / 0.4).',
  },
  {
    question: 'How can I track these metrics accurately?',
    answer:
      'Use a privacy-focused analytics tool like Swetrix to track conversions, revenue, and campaign performance through UTM parameters. This gives you accurate data while respecting user privacy.',
  },
]

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`
}

const formatRatio = (value: number): string => {
  return `${value.toFixed(2)}:1`
}

export default function ROICalculator() {
  const [metrics, setMetrics] = useState<CampaignMetrics>({
    campaignName: '',
    adSpend: 0,
    revenue: 0,
    conversions: 0,
    clicks: 0,
    impressions: 0,
  })

  const [calculated, setCalculated] = useState<CalculatedMetrics>({
    roi: 0,
    roas: 0,
    cpc: 0,
    cpm: 0,
    ctr: 0,
    conversionRate: 0,
    cac: 0,
    profit: 0,
    breakEvenRoas: 0,
    marginOfSafety: 0,
  })

  const [profitMargin, setProfitMargin] = useState<number>(30)

  useEffect(() => {
    calculateMetrics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics, profitMargin])

  const calculateMetrics = () => {
    const { adSpend, revenue, conversions, clicks, impressions } = metrics

    const roi = adSpend > 0 ? ((revenue - adSpend) / adSpend) * 100 : 0
    const roas = adSpend > 0 ? revenue / adSpend : 0
    const cpc = clicks > 0 ? adSpend / clicks : 0
    const cpm = impressions > 0 ? (adSpend / impressions) * 1000 : 0
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0
    const cac = conversions > 0 ? adSpend / conversions : 0
    const profit = revenue - adSpend
    const breakEvenRoas = profitMargin > 0 ? 100 / profitMargin : 0
    const marginOfSafety =
      breakEvenRoas > 0 && roas > 0 ? ((roas - breakEvenRoas) / roas) * 100 : 0

    setCalculated({
      roi,
      roas,
      cpc,
      cpm,
      ctr,
      conversionRate,
      cac,
      profit,
      breakEvenRoas,
      marginOfSafety,
    })
  }

  const handleMetricChange = (key: keyof CampaignMetrics, value: string) => {
    const numValue = key === 'campaignName' ? value : parseFloat(value) || 0
    setMetrics({
      ...metrics,
      [key]: numValue,
    })
  }

  // Using native <details>/<summary> for FAQ to ensure content is present in the DOM for SEO

  const getROIColor = (roi: number) => {
    if (roi >= 100) return 'text-green-600 dark:text-green-400'
    if (roi >= 0) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getROASColor = (roas: number) => {
    if (roas >= 4) return 'text-green-600 dark:text-green-400'
    if (roas >= 2) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-slate-950'>
      <main className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <ToolsNavMobile className='mb-6 xl:hidden' />

        <div className='xl:flex xl:items-start xl:gap-8'>
          <div className='min-w-0 xl:flex-1'>
            <Text as='h1' size='4xl' weight='bold' tracking='tight'>
              Marketing ROI Calculator
            </Text>
            <Text as='p' size='lg' colour='muted' className='mt-4'>
              Calculate ROAS, ROI, CAC, and other key metrics to measure your
              marketing campaign performance
            </Text>

            <div className='mt-12 grid gap-8 lg:grid-cols-3'>
              {/* Input Section */}
              <div className='lg:col-span-2'>
                <div className='rounded-lg bg-white p-8 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
                  <h2 className='mb-6 text-2xl font-semibold text-gray-900 dark:text-white'>
                    Campaign Metrics
                  </h2>

                  <div className='space-y-6'>
                    <Input
                      type='text'
                      placeholder='Q4 Facebook Campaign'
                      label='Campaign Name (optional)'
                      value={metrics.campaignName}
                      onChange={(e) =>
                        handleMetricChange('campaignName', e.target.value)
                      }
                      className='w-full'
                    />

                    <div className='grid gap-6 md:grid-cols-2'>
                      <div>
                        <Input
                          type='number'
                          placeholder='5000'
                          label={
                            <>
                              Ad Spend ($)
                              <Tooltip
                                className='ml-1'
                                text='Total amount spent on advertising for this campaign'
                              />
                            </>
                          }
                          value={metrics.adSpend || ''}
                          onChange={(e) =>
                            handleMetricChange('adSpend', e.target.value)
                          }
                          className='w-full'
                        />
                      </div>

                      <div>
                        <Input
                          type='number'
                          placeholder='15000'
                          label={
                            <>
                              Revenue Generated ($)
                              <Tooltip
                                className='ml-1'
                                text='Total revenue attributed to this campaign'
                              />
                            </>
                          }
                          value={metrics.revenue || ''}
                          onChange={(e) =>
                            handleMetricChange('revenue', e.target.value)
                          }
                          className='w-full'
                        />
                      </div>

                      <div>
                        <Input
                          type='number'
                          placeholder='150'
                          label={
                            <>
                              Conversions
                              <Tooltip
                                className='ml-1'
                                text='Number of conversions (sales, sign-ups, etc.)'
                              />
                            </>
                          }
                          value={metrics.conversions || ''}
                          onChange={(e) =>
                            handleMetricChange('conversions', e.target.value)
                          }
                          className='w-full'
                        />
                      </div>

                      <div>
                        <Input
                          type='number'
                          placeholder='2000'
                          label={
                            <>
                              Clicks
                              <Tooltip
                                className='ml-1'
                                text='Total number of clicks on your ads'
                              />
                            </>
                          }
                          value={metrics.clicks || ''}
                          onChange={(e) =>
                            handleMetricChange('clicks', e.target.value)
                          }
                          className='w-full'
                        />
                      </div>

                      <div>
                        <Input
                          type='number'
                          placeholder='100000'
                          label={
                            <>
                              Impressions
                              <Tooltip
                                className='ml-1'
                                text='Total number of times your ads were shown'
                              />
                            </>
                          }
                          value={metrics.impressions || ''}
                          onChange={(e) =>
                            handleMetricChange('impressions', e.target.value)
                          }
                          className='w-full'
                        />
                      </div>

                      <div>
                        <Input
                          type='number'
                          placeholder='30'
                          label={
                            <>
                              Profit Margin (%)
                              <Tooltip
                                className='ml-1'
                                text='Your average profit margin on products/services'
                              />
                            </>
                          }
                          value={profitMargin || ''}
                          onChange={(e) =>
                            setProfitMargin(parseFloat(e.target.value) || 0)
                          }
                          className='w-full'
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results Section */}
              <div className='lg:col-span-1'>
                <div className='sticky top-8 space-y-6'>
                  {/* Primary Metrics */}
                  <div className='rounded-lg bg-white p-6 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
                    <h3 className='mb-4 text-lg font-semibold text-gray-900 dark:text-white'>
                      Key Performance Metrics
                    </h3>

                    <div className='space-y-4'>
                      <div className='flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-slate-700/50'>
                        <div className='flex items-center'>
                          <TrendUpIcon className='mr-2 h-5 w-5 text-gray-500 dark:text-gray-400' />
                          <span className='font-medium text-gray-700 dark:text-gray-300'>
                            ROI
                          </span>
                        </div>
                        <span
                          className={`text-2xl font-bold ${getROIColor(calculated.roi)}`}
                        >
                          {formatPercentage(calculated.roi)}
                        </span>
                      </div>

                      <div className='flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-slate-700/50'>
                        <div className='flex items-center'>
                          <CurrencyDollarIcon className='mr-2 h-5 w-5 text-gray-500 dark:text-gray-400' />
                          <span className='font-medium text-gray-700 dark:text-gray-300'>
                            ROAS
                          </span>
                        </div>
                        <span
                          className={`text-2xl font-bold ${getROASColor(calculated.roas)}`}
                        >
                          {formatRatio(calculated.roas)}
                        </span>
                      </div>

                      <div className='flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-slate-700/50'>
                        <div className='flex items-center'>
                          <ShoppingCartIcon className='mr-2 h-5 w-5 text-gray-500 dark:text-gray-400' />
                          <span className='font-medium text-gray-700 dark:text-gray-300'>
                            Profit
                          </span>
                        </div>
                        <span
                          className={`text-xl font-bold ${calculated.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                        >
                          {formatCurrency(calculated.profit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Secondary Metrics */}
                  <div className='rounded-lg bg-white p-6 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
                    <h3 className='mb-4 text-lg font-semibold text-gray-900 dark:text-white'>
                      Detailed Metrics
                    </h3>

                    <div className='space-y-3'>
                      <div className='flex justify-between'>
                        <span className='text-sm text-gray-600 dark:text-gray-400'>
                          CAC
                        </span>
                        <span className='font-semibold text-gray-900 dark:text-white'>
                          {formatCurrency(calculated.cac)}
                        </span>
                      </div>

                      <div className='flex justify-between'>
                        <span className='text-sm text-gray-600 dark:text-gray-400'>
                          CPC
                        </span>
                        <span className='font-semibold text-gray-900 dark:text-white'>
                          {formatCurrency(calculated.cpc)}
                        </span>
                      </div>

                      <div className='flex justify-between'>
                        <span className='text-sm text-gray-600 dark:text-gray-400'>
                          CPM
                        </span>
                        <span className='font-semibold text-gray-900 dark:text-white'>
                          {formatCurrency(calculated.cpm)}
                        </span>
                      </div>

                      <div className='flex justify-between'>
                        <span className='text-sm text-gray-600 dark:text-gray-400'>
                          CTR
                        </span>
                        <span className='font-semibold text-gray-900 dark:text-white'>
                          {formatPercentage(calculated.ctr)}
                        </span>
                      </div>

                      <div className='flex justify-between'>
                        <span className='text-sm text-gray-600 dark:text-gray-400'>
                          Conversion Rate
                        </span>
                        <span className='font-semibold text-gray-900 dark:text-white'>
                          {formatPercentage(calculated.conversionRate)}
                        </span>
                      </div>

                      <div className='border-t pt-3 dark:border-gray-700'>
                        <div className='flex justify-between'>
                          <span className='text-sm text-gray-600 dark:text-gray-400'>
                            Break-Even ROAS
                          </span>
                          <span className='font-semibold text-gray-900 dark:text-white'>
                            {formatRatio(calculated.breakEvenRoas)}
                          </span>
                        </div>

                        <div className='mt-2 flex justify-between'>
                          <span className='text-sm text-gray-600 dark:text-gray-400'>
                            Margin of Safety
                          </span>
                          <span
                            className={`font-semibold ${calculated.marginOfSafety >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                          >
                            {formatPercentage(calculated.marginOfSafety)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Indicator */}
                  {metrics.adSpend > 0 ? (
                    <div className='rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white'>
                      <h3 className='mb-2 text-lg font-semibold'>
                        Campaign Performance
                      </h3>
                      <p className='text-sm opacity-90'>
                        {calculated.roas >= 4
                          ? 'Excellent! Your campaign is highly profitable.'
                          : calculated.roas >= 2
                            ? 'Good performance. Consider optimization for better results.'
                            : calculated.roas >= 1
                              ? 'Breaking even. Optimization needed to improve profitability.'
                              : 'Campaign is not profitable. Major adjustments required.'}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <section className='mt-20 border-t border-gray-200 pt-16 dark:border-slate-700'>
              <Text as='h2' size='3xl' weight='bold' tracking='tight'>
                Free Marketing ROI & ROAS Calculator
              </Text>
              <Text
                as='p'
                size='lg'
                colour='muted'
                className='mt-4 leading-relaxed'
              >
                Our comprehensive Marketing ROI Calculator helps you measure the
                true profitability of your advertising campaigns. Quickly
                compute Return on Ad Spend (ROAS), Customer Acquisition Cost
                (CAC), and other vital metrics to optimize your marketing budget
                and improve profitability.
              </Text>

              <div className='mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2'>
                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    Key Marketing Metrics Explained
                  </Text>
                  <ul className='mt-3 space-y-2'>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          ROI (Return on Investment)
                        </Text>{' '}
                        - Measures the overall profitability of your campaign,
                        accounting for costs.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          ROAS (Return on Ad Spend)
                        </Text>{' '}
                        - Indicates how much revenue is generated for every
                        dollar spent on ads.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          CAC (Customer Acquisition Cost)
                        </Text>{' '}
                        - The average amount you spend to acquire a single
                        paying customer.
                      </Text>
                    </li>
                  </ul>
                </div>
                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    How to Use This Tool
                  </Text>
                  <Text as='p' colour='muted' className='mt-3'>
                    Simply enter your campaign's total ad spend, revenue
                    generated, and other available metrics like clicks or
                    impressions. The calculator will instantly generate a
                    detailed performance report, showing your exact profit
                    margins, conversion rates, and whether your campaign has
                    reached its break-even point.
                  </Text>
                </div>
              </div>
            </section>

            <div className='mt-16'>
              <h2 className='mb-8 text-center text-3xl font-bold text-gray-900 dark:text-white'>
                Frequently Asked Questions
              </h2>

              <FAQ items={FAQ_ITEMS} withStructuredData />
            </div>

            <DitchGoogle />
          </div>

          <aside className='hidden xl:sticky xl:top-12 xl:block xl:w-64 xl:shrink-0 xl:self-start'>
            <ToolsNav />
          </aside>
        </div>
      </main>
    </div>
  )
}
