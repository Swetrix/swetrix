import { CurrencyDollarIcon } from '@phosphor-icons/react'
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
    ...getTitle('Free Ad Cost Calculator (CPM, CPC, CPA) - Swetrix'),
    ...getDescription(
      'Calculate CPM (Cost Per Mille), CPC (Cost Per Click), and CPA (Cost Per Action) instantly. Analyze your ad campaign costs and performance.',
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

interface Metrics {
  spend: number
  impressions: number
  clicks: number
  conversions: number
}

const FAQ_ITEMS = [
  {
    question: 'What is CPM (Cost Per Mille)?',
    answer:
      'CPM stands for Cost Per Mille (Mille means thousand in Latin). It is the cost an advertiser pays for one thousand views or impressions of an advertisement.',
  },
  {
    question: 'What is CPC (Cost Per Click)?',
    answer:
      'CPC is the actual price you pay for each click in your pay-per-click (PPC) marketing campaigns. A lower CPC means you are getting more clicks for your budget.',
  },
  {
    question: 'What is CPA (Cost Per Action)?',
    answer:
      'CPA, or Cost Per Acquisition/Action, measures the aggregate cost to acquire one paying customer or a specific action (like a sign-up) on a campaign or channel level.',
  },
  {
    question: 'What is CTR (Click-Through Rate)?',
    answer:
      'CTR is the ratio of users who click on a specific link to the number of total users who view a page, email, or advertisement. It is commonly used to measure the success of an online advertising campaign.',
  },
  {
    question: 'How do I lower my Ad Costs?',
    answer:
      'To lower CPC and CPA, focus on improving your ad relevance, targeting the right audience, testing different ad creatives (A/B testing), and optimizing your landing pages to improve conversion rates.',
  },
]

const formatCurrency = (value: number): string => {
  if (!isFinite(value) || isNaN(value)) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const formatPercentage = (value: number): string => {
  if (!isFinite(value) || isNaN(value)) return '0.00%'
  return `${value.toFixed(2)}%`
}

export default function AdCostCalculator() {
  const [metrics, setMetrics] = useState<Metrics>({
    spend: 1000,
    impressions: 50000,
    clicks: 1250,
    conversions: 50,
  })

  const [cpm, setCpm] = useState(0)
  const [cpc, setCpc] = useState(0)
  const [cpa, setCpa] = useState(0)
  const [ctr, setCtr] = useState(0)
  const [cvr, setCvr] = useState(0)

  useEffect(() => {
    const { spend, impressions, clicks, conversions } = metrics

    setCpm(impressions > 0 ? (spend / impressions) * 1000 : 0)
    setCpc(clicks > 0 ? spend / clicks : 0)
    setCpa(conversions > 0 ? spend / conversions : 0)
    setCtr(impressions > 0 ? (clicks / impressions) * 100 : 0)
    setCvr(clicks > 0 ? (conversions / clicks) * 100 : 0)
  }, [metrics])

  const handleMetricChange = (key: keyof Metrics, value: string) => {
    setMetrics({ ...metrics, [key]: parseFloat(value) || 0 })
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-slate-950'>
      <main className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <ToolsNavMobile className='mb-6 xl:hidden' />

        <div className='xl:flex xl:items-start xl:gap-8'>
          <div className='min-w-0 xl:flex-1'>
            <Text as='h1' size='4xl' weight='bold' tracking='tight'>
              Ad Cost Calculator
            </Text>
            <Text as='p' size='lg' colour='muted' className='mt-4'>
              Calculate key advertising metrics like CPM, CPC, CPA, and
              understand your campaign performance.
            </Text>

            <div className='mt-12 grid gap-8 lg:grid-cols-3'>
              {/* Input Section */}
              <div className='lg:col-span-2'>
                <div className='rounded-lg bg-white p-8 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
                  <h2 className='mb-6 text-2xl font-semibold text-gray-900 dark:text-white'>
                    Campaign Data
                  </h2>

                  <div className='grid gap-6 md:grid-cols-2'>
                    <Input
                      type='number'
                      label={
                        <>
                          Total Ad Spend ($)
                          <Tooltip
                            className='ml-1'
                            text='Total amount of money spent on the ad campaign'
                          />
                        </>
                      }
                      value={metrics.spend || ''}
                      onChange={(e) =>
                        handleMetricChange('spend', e.target.value)
                      }
                      className='w-full'
                    />

                    <Input
                      type='number'
                      label={
                        <>
                          Total Impressions
                          <Tooltip
                            className='ml-1'
                            text='Number of times your ads were shown'
                          />
                        </>
                      }
                      value={metrics.impressions || ''}
                      onChange={(e) =>
                        handleMetricChange('impressions', e.target.value)
                      }
                      className='w-full'
                    />

                    <Input
                      type='number'
                      label={
                        <>
                          Total Clicks
                          <Tooltip
                            className='ml-1'
                            text='Number of times people clicked on your ads'
                          />
                        </>
                      }
                      value={metrics.clicks || ''}
                      onChange={(e) =>
                        handleMetricChange('clicks', e.target.value)
                      }
                      className='w-full'
                    />

                    <Input
                      type='number'
                      label={
                        <>
                          Total Conversions
                          <Tooltip
                            className='ml-1'
                            text='Number of desired actions completed (sales, leads, etc.)'
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
                </div>
              </div>

              {/* Results Section */}
              <div className='lg:col-span-1'>
                <div className='sticky top-8 space-y-6'>
                  <div className='rounded-lg bg-white p-6 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
                    <h3 className='mb-4 text-lg font-semibold text-gray-900 dark:text-white'>
                      Cost Analysis
                    </h3>

                    <div className='space-y-4'>
                      <div className='flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-slate-700/50'>
                        <div className='flex items-center'>
                          <CurrencyDollarIcon className='mr-2 h-5 w-5 text-gray-500 dark:text-gray-400' />
                          <span className='font-medium text-gray-700 dark:text-gray-300'>
                            CPM
                          </span>
                        </div>
                        <span className='text-xl font-bold text-gray-900 dark:text-white'>
                          {formatCurrency(cpm)}
                        </span>
                      </div>

                      <div className='flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-slate-700/50'>
                        <div className='flex items-center'>
                          <CurrencyDollarIcon className='mr-2 h-5 w-5 text-gray-500 dark:text-gray-400' />
                          <span className='font-medium text-gray-700 dark:text-gray-300'>
                            CPC
                          </span>
                        </div>
                        <span className='text-xl font-bold text-gray-900 dark:text-white'>
                          {formatCurrency(cpc)}
                        </span>
                      </div>

                      <div className='flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-slate-700/50'>
                        <div className='flex items-center'>
                          <CurrencyDollarIcon className='mr-2 h-5 w-5 text-gray-500 dark:text-gray-400' />
                          <span className='font-medium text-gray-700 dark:text-gray-300'>
                            CPA
                          </span>
                        </div>
                        <span className='text-xl font-bold text-gray-900 dark:text-white'>
                          {formatCurrency(cpa)}
                        </span>
                      </div>
                    </div>

                    <div className='mt-6 border-t border-gray-100 pt-6 dark:border-gray-700'>
                      <h4 className='mb-4 text-sm font-medium text-gray-500 dark:text-gray-400'>
                        Performance Rates
                      </h4>
                      <div className='space-y-3'>
                        <div className='flex items-center justify-between'>
                          <span className='text-sm text-gray-600 dark:text-gray-300'>
                            Click-Through Rate (CTR)
                          </span>
                          <span className='font-semibold text-gray-900 dark:text-white'>
                            {formatPercentage(ctr)}
                          </span>
                        </div>
                        <div className='flex items-center justify-between'>
                          <span className='text-sm text-gray-600 dark:text-gray-300'>
                            Conversion Rate (CVR)
                          </span>
                          <span className='font-semibold text-gray-900 dark:text-white'>
                            {formatPercentage(cvr)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <section className='mt-20 border-t border-gray-200 pt-16 dark:border-slate-700'>
              <Text as='h2' size='3xl' weight='bold' tracking='tight'>
                Free Ad Cost Calculator (CPM, CPC, CPA)
              </Text>
              <Text
                as='p'
                size='lg'
                colour='muted'
                className='mt-4 leading-relaxed'
              >
                Take control of your advertising budget with our comprehensive
                ad cost calculator. Instantly convert between different pricing
                models like CPM (Cost Per Mille), CPC (Cost Per Click), and CPA
                (Cost Per Action) to better understand your campaign performance
                across different platforms.
              </Text>

              <div className='mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2'>
                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    Understanding Ad Pricing Models
                  </Text>
                  <ul className='mt-3 space-y-2'>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          CPM (Cost Per Mille)
                        </Text>{' '}
                        - Best for brand awareness campaigns. You pay for every
                        1,000 times your ad is shown, regardless of clicks.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          CPC (Cost Per Click)
                        </Text>{' '}
                        - Best for driving traffic. You only pay when a user
                        actually clicks on your ad.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          CPA (Cost Per Action)
                        </Text>{' '}
                        - Best for direct response. You pay only when a user
                        completes a specific action, like a purchase or sign-up.
                      </Text>
                    </li>
                  </ul>
                </div>
                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    How to Optimize Your Ad Spend
                  </Text>
                  <Text as='p' colour='muted' className='mt-3'>
                    To lower your overall advertising costs, focus on improving
                    your Click-Through Rate (CTR) by using highly relevant ad
                    copy and targeted audience segments. Additionally, optimize
                    your landing pages to boost your Conversion Rate (CVR).
                    Small improvements in these intermediate metrics can
                    drastically lower your final Cost Per Action (CPA).
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
