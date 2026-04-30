import { TrendUpIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import type { MetaFunction } from 'react-router'
import { redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import { ToolsNav, ToolsNavMobile } from '~/components/ToolsNav'
import { getOgImageUrl, isSelfhosted } from '~/lib/constants'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import { FAQ } from '~/ui/FAQ'
import { Text } from '~/ui/Text'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

export const meta: MetaFunction = () => {
  const title =
    'Free Conversion Rate Calculator - Calculate Your Website Conversion Rate'
  const description =
    "Calculate your website's conversion rate instantly. Enter visitors and conversions to get your rate, performance rating, and actionable insights. Free conversion rate calculator for ecommerce, SaaS, and landing pages."
  return [
    ...getTitle(title),
    ...getDescription(description),
    ...getPreviewImage(getOgImageUrl(title, description)),
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

const FAQ_ITEMS = [
  {
    question: 'What is a conversion rate?',
    answer:
      'A conversion rate is the percentage of visitors who complete a desired action on your website, such as making a purchase, signing up for a newsletter, filling out a form, or downloading a resource. It is calculated by dividing the number of conversions by the total number of visitors, then multiplying by 100.',
  },
  {
    question: 'What is a good conversion rate?',
    answer:
      'A good conversion rate varies by industry, but the average website conversion rate is around 2-5%. Ecommerce sites typically see 1-4%, SaaS landing pages average 3-7%, and highly optimized pages can reach 10%+. The best benchmark is your own historical performance.',
  },
  {
    question: 'How do I calculate conversion rate?',
    answer:
      'Conversion rate is calculated using the formula: Conversion Rate = (Number of Conversions ÷ Total Visitors) × 100. For example, if you had 50 sales from 2,000 visitors, your conversion rate would be (50 ÷ 2000) × 100 = 2.5%.',
  },
  {
    question: 'What is the difference between conversion rate and CTR?',
    answer:
      'CTR (Click-Through Rate) measures the percentage of people who click on an ad or link after seeing it, while conversion rate measures the percentage of visitors who complete a desired action after landing on your page. CTR measures ad engagement; conversion rate measures page effectiveness.',
  },
  {
    question: 'How can I improve my conversion rate?',
    answer:
      'Improve conversion rates by optimizing your landing page copy and design, adding clear calls-to-action (CTAs), reducing page load time, using social proof and testimonials, simplifying forms, running A/B tests, improving mobile experience, and ensuring your value proposition is clear.',
  },
  {
    question: 'What is Conversion Rate Optimization (CRO)?',
    answer:
      'Conversion Rate Optimization (CRO) is the systematic process of increasing the percentage of website visitors who take a desired action. It involves analyzing user behavior, identifying friction points, forming hypotheses, and running experiments like A/B tests to improve performance.',
  },
  {
    question: 'What factors affect conversion rate?',
    answer:
      'Key factors include page load speed, mobile responsiveness, trust signals (SSL, reviews), clear value proposition, CTA placement and copy, form length, visual design, traffic quality, pricing transparency, and user experience. Seasonal trends and competition also play a role.',
  },
  {
    question: 'Can Swetrix help track my conversion rates?',
    answer:
      'Yes! Swetrix provides privacy-first analytics that lets you track custom events and goals to measure conversion rates across your website. You can monitor funnels, compare conversion rates by traffic source, and get actionable insights without compromising user privacy.',
  },
]

type Mode = 'rate' | 'traffic' | 'revenue'

interface RateInputs {
  visitors: string
  conversions: string
}

interface TrafficInputs {
  targetConversions: string
  expectedRate: string
}

interface RevenueInputs {
  visitors: string
  conversionRate: string
  averageOrderValue: string
}

interface RateResult {
  rate: number
  performance: 'Excellent' | 'Good' | 'Average' | 'Below Average' | 'Poor'
  color: string
}

function getPerformance(
  rate: number,
): Pick<RateResult, 'performance' | 'color'> {
  if (rate >= 8)
    return {
      performance: 'Excellent',
      color: 'text-green-600 dark:text-green-400',
    }
  if (rate >= 5)
    return { performance: 'Good', color: 'text-blue-600 dark:text-blue-400' }
  if (rate >= 2.5)
    return {
      performance: 'Average',
      color: 'text-yellow-600 dark:text-yellow-400',
    }
  if (rate >= 1)
    return {
      performance: 'Below Average',
      color: 'text-orange-600 dark:text-orange-400',
    }
  return { performance: 'Poor', color: 'text-red-600 dark:text-red-400' }
}

const MODES: { id: Mode; label: string }[] = [
  { id: 'rate', label: 'Calculate Rate' },
  { id: 'traffic', label: 'Estimate Traffic' },
  { id: 'revenue', label: 'Revenue Impact' },
]

export default function ConversionRateCalculator() {
  const [mode, setMode] = useState<Mode>('rate')

  const [rateInputs, setRateInputs] = useState<RateInputs>({
    visitors: '',
    conversions: '',
  })
  const [rateResult, setRateResult] = useState<RateResult | null>(null)

  const [trafficInputs, setTrafficInputs] = useState<TrafficInputs>({
    targetConversions: '',
    expectedRate: '',
  })
  const [trafficResult, setTrafficResult] = useState<number | null>(null)

  const [revenueInputs, setRevenueInputs] = useState<RevenueInputs>({
    visitors: '',
    conversionRate: '',
    averageOrderValue: '',
  })
  const [revenueResult, setRevenueResult] = useState<{
    conversions: number
    revenue: number
    improvedRevenue: number
  } | null>(null)

  const handleRateChange = (key: keyof RateInputs, value: string) => {
    const newInputs = { ...rateInputs, [key]: value }
    setRateInputs(newInputs)

    const visitors = parseFloat(newInputs.visitors)
    const conversions = parseFloat(newInputs.conversions)

    if (visitors > 0 && conversions >= 0) {
      const rate = (conversions / visitors) * 100
      setRateResult({ rate, ...getPerformance(rate) })
    } else {
      setRateResult(null)
    }
  }

  const handleTrafficChange = (key: keyof TrafficInputs, value: string) => {
    const newInputs = { ...trafficInputs, [key]: value }
    setTrafficInputs(newInputs)

    const target = parseFloat(newInputs.targetConversions)
    const rate = parseFloat(newInputs.expectedRate)

    if (target > 0 && rate > 0) {
      setTrafficResult(Math.ceil(target / (rate / 100)))
    } else {
      setTrafficResult(null)
    }
  }

  const handleRevenueChange = (key: keyof RevenueInputs, value: string) => {
    const newInputs = { ...revenueInputs, [key]: value }
    setRevenueInputs(newInputs)

    const visitors = parseFloat(newInputs.visitors)
    const rate = parseFloat(newInputs.conversionRate)
    const aov = parseFloat(newInputs.averageOrderValue)

    if (visitors > 0 && rate > 0 && aov > 0) {
      const conversions = Math.round(visitors * (rate / 100))
      const revenue = conversions * aov
      const improvedRate = rate * 1.25
      const improvedConversions = Math.round(visitors * (improvedRate / 100))
      const improvedRevenue = improvedConversions * aov
      setRevenueResult({ conversions, revenue, improvedRevenue })
    } else {
      setRevenueResult(null)
    }
  }

  const reset = () => {
    setRateInputs({ visitors: '', conversions: '' })
    setRateResult(null)
    setTrafficInputs({ targetConversions: '', expectedRate: '' })
    setTrafficResult(null)
    setRevenueInputs({
      visitors: '',
      conversionRate: '',
      averageOrderValue: '',
    })
    setRevenueResult(null)
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-slate-950'>
      <main className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <ToolsNavMobile className='mb-6 lg:hidden' />

        <div className='lg:flex lg:items-start lg:gap-8'>
          <div className='min-w-0 lg:flex-1'>
            <Text as='h1' size='4xl' weight='bold' tracking='tight'>
              Conversion Rate Calculator
            </Text>
            <Text as='p' size='lg' colour='muted' className='mt-4'>
              Calculate your website conversion rate, estimate required traffic,
              and project revenue impact
            </Text>

            <div className='mt-12 rounded-lg bg-white p-8 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
              <div className='space-y-6'>
                <div className='flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-slate-900'>
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      type='button'
                      onClick={() => setMode(m.id)}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        mode === m.id
                          ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-950 dark:text-white'
                          : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {mode === 'rate' && (
                  <div>
                    <h2 className='mb-6 text-2xl font-semibold text-gray-900 dark:text-white'>
                      Calculate Your Conversion Rate
                    </h2>

                    <div className='grid gap-6 md:grid-cols-2'>
                      <div>
                        <Input
                          type='number'
                          placeholder='e.g. 10000'
                          label='Total Visitors'
                          value={rateInputs.visitors}
                          onChange={(e) =>
                            handleRateChange('visitors', e.target.value)
                          }
                          className='w-full'
                          min='1'
                        />
                        <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                          Total number of visitors or sessions
                        </p>
                      </div>

                      <div>
                        <Input
                          type='number'
                          placeholder='e.g. 250'
                          label='Total Conversions'
                          value={rateInputs.conversions}
                          onChange={(e) =>
                            handleRateChange('conversions', e.target.value)
                          }
                          className='w-full'
                          min='0'
                        />
                        <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                          Purchases, signups, or other goals completed
                        </p>
                      </div>
                    </div>

                    <div className='mt-6'>
                      <Button variant='secondary' onClick={reset}>
                        Reset
                      </Button>
                    </div>

                    {rateResult ? (
                      <div className='mt-6 border-t border-gray-200 pt-6 dark:border-gray-700'>
                        <h3 className='mb-4 text-lg font-medium text-gray-900 dark:text-white'>
                          Results
                        </h3>

                        <div className='rounded-lg bg-gray-50 p-6 dark:bg-slate-900'>
                          <div className='text-center'>
                            <div className='text-5xl font-bold text-gray-900 dark:text-white'>
                              {rateResult.rate.toFixed(2)}%
                            </div>
                            <div className='mt-2 text-lg text-gray-600 dark:text-gray-400'>
                              Conversion Rate
                            </div>
                            <div
                              className={`mt-4 text-lg font-semibold ${rateResult.color}`}
                            >
                              {rateResult.performance} Performance
                            </div>
                          </div>

                          <div className='mt-6 grid gap-4 text-sm md:grid-cols-2'>
                            <div className='rounded-lg bg-white p-4 dark:bg-slate-950'>
                              <div className='text-gray-500 dark:text-gray-400'>
                                Formula Used
                              </div>
                              <div className='mt-1 font-mono text-gray-900 dark:text-white'>
                                CR = (Conversions ÷ Visitors) × 100
                              </div>
                            </div>
                            <div className='rounded-lg bg-white p-4 dark:bg-slate-950'>
                              <div className='text-gray-500 dark:text-gray-400'>
                                Your Calculation
                              </div>
                              <div className='mt-1 font-mono text-gray-900 dark:text-white'>
                                ({rateInputs.conversions} ÷{' '}
                                {rateInputs.visitors}) × 100
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className='mt-6 rounded-lg bg-indigo-50 p-4 dark:bg-indigo-900/20'>
                          <h4 className='flex items-center text-lg font-medium text-indigo-900 dark:text-indigo-300'>
                            <TrendUpIcon className='mr-2 h-5 w-5' />
                            Performance Insights
                          </h4>
                          <p className='mt-2 text-sm text-indigo-800 dark:text-indigo-200'>
                            {rateResult.performance === 'Excellent' &&
                              'Outstanding conversion rate! Your page is performing exceptionally well. Focus on scaling traffic while maintaining quality.'}
                            {rateResult.performance === 'Good' &&
                              'Solid conversion rate. You are above industry average. Consider A/B testing to push performance even higher.'}
                            {rateResult.performance === 'Average' &&
                              'Decent conversion rate, but there is room to grow. Focus on optimizing your CTA, page speed, and value proposition.'}
                            {rateResult.performance === 'Below Average' &&
                              'Below average. Review your landing page copy, user experience, and traffic quality for quick wins.'}
                            {rateResult.performance === 'Poor' &&
                              'Low conversion rate suggests significant friction. Audit your funnel for issues like slow load times, unclear messaging, or poor mobile experience.'}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {mode === 'traffic' && (
                  <div>
                    <h2 className='mb-6 text-2xl font-semibold text-gray-900 dark:text-white'>
                      How Much Traffic Do You Need?
                    </h2>

                    <div className='grid gap-6 md:grid-cols-2'>
                      <div>
                        <Input
                          type='number'
                          placeholder='e.g. 500'
                          label='Target Conversions'
                          value={trafficInputs.targetConversions}
                          onChange={(e) =>
                            handleTrafficChange(
                              'targetConversions',
                              e.target.value,
                            )
                          }
                          className='w-full'
                          min='1'
                        />
                        <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                          How many conversions you want to achieve
                        </p>
                      </div>

                      <div>
                        <Input
                          type='number'
                          placeholder='e.g. 3.5'
                          label='Expected Conversion Rate (%)'
                          value={trafficInputs.expectedRate}
                          onChange={(e) =>
                            handleTrafficChange('expectedRate', e.target.value)
                          }
                          className='w-full'
                          min='0.01'
                          step='0.1'
                        />
                        <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                          Your current or expected conversion rate
                        </p>
                      </div>
                    </div>

                    <div className='mt-6'>
                      <Button variant='secondary' onClick={reset}>
                        Reset
                      </Button>
                    </div>

                    {trafficResult !== null ? (
                      <div className='mt-6 border-t border-gray-200 pt-6 dark:border-gray-700'>
                        <div className='rounded-lg bg-gray-50 p-6 dark:bg-slate-900'>
                          <div className='text-center'>
                            <div className='text-5xl font-bold text-gray-900 dark:text-white'>
                              {trafficResult.toLocaleString()}
                            </div>
                            <div className='mt-2 text-lg text-gray-600 dark:text-gray-400'>
                              Visitors needed
                            </div>
                          </div>

                          <div className='mt-6 rounded-lg bg-white p-4 text-sm dark:bg-slate-950'>
                            <div className='text-gray-500 dark:text-gray-400'>
                              Your Calculation
                            </div>
                            <div className='mt-1 font-mono text-gray-900 dark:text-white'>
                              {trafficInputs.targetConversions} ÷ (
                              {trafficInputs.expectedRate}% ÷ 100) ={' '}
                              {trafficResult.toLocaleString()} visitors
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {mode === 'revenue' && (
                  <div>
                    <h2 className='mb-6 text-2xl font-semibold text-gray-900 dark:text-white'>
                      Revenue Impact Calculator
                    </h2>

                    <div className='grid gap-6 md:grid-cols-3'>
                      <div>
                        <Input
                          type='number'
                          placeholder='e.g. 50000'
                          label='Monthly Visitors'
                          value={revenueInputs.visitors}
                          onChange={(e) =>
                            handleRevenueChange('visitors', e.target.value)
                          }
                          className='w-full'
                          min='1'
                        />
                      </div>
                      <div>
                        <Input
                          type='number'
                          placeholder='e.g. 2.5'
                          label='Conversion Rate (%)'
                          value={revenueInputs.conversionRate}
                          onChange={(e) =>
                            handleRevenueChange(
                              'conversionRate',
                              e.target.value,
                            )
                          }
                          className='w-full'
                          min='0.01'
                          step='0.1'
                        />
                      </div>
                      <div>
                        <Input
                          type='number'
                          placeholder='e.g. 65'
                          label='Avg. Order Value ($)'
                          value={revenueInputs.averageOrderValue}
                          onChange={(e) =>
                            handleRevenueChange(
                              'averageOrderValue',
                              e.target.value,
                            )
                          }
                          className='w-full'
                          min='0.01'
                          step='0.01'
                        />
                      </div>
                    </div>

                    <div className='mt-6'>
                      <Button variant='secondary' onClick={reset}>
                        Reset
                      </Button>
                    </div>

                    {revenueResult ? (
                      <div className='mt-6 border-t border-gray-200 pt-6 dark:border-gray-700'>
                        <div className='rounded-lg bg-gray-50 p-6 dark:bg-slate-900'>
                          <div className='grid gap-6 md:grid-cols-3'>
                            <div className='text-center'>
                              <div className='text-3xl font-bold text-gray-900 dark:text-white'>
                                {revenueResult.conversions.toLocaleString()}
                              </div>
                              <div className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
                                Monthly Conversions
                              </div>
                            </div>
                            <div className='text-center'>
                              <div className='text-3xl font-bold text-gray-900 dark:text-white'>
                                ${revenueResult.revenue.toLocaleString()}
                              </div>
                              <div className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
                                Current Monthly Revenue
                              </div>
                            </div>
                            <div className='text-center'>
                              <div className='text-3xl font-bold text-green-600 dark:text-green-400'>
                                $
                                {revenueResult.improvedRevenue.toLocaleString()}
                              </div>
                              <div className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
                                Revenue with 25% CR lift
                              </div>
                            </div>
                          </div>

                          <div className='mt-6 rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/20'>
                            <Text
                              size='sm'
                              className='text-green-800 dark:text-green-200'
                            >
                              A 25% improvement in conversion rate would
                              generate an additional{' '}
                              <span className='font-bold'>
                                $
                                {(
                                  revenueResult.improvedRevenue -
                                  revenueResult.revenue
                                ).toLocaleString()}
                              </span>{' '}
                              per month
                            </Text>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <section className='mt-20 border-t border-gray-200 pt-16 dark:border-slate-700'>
              <Text as='h2' size='3xl' weight='bold' tracking='tight'>
                Free Conversion Rate Calculator for Websites
              </Text>
              <Text
                as='p'
                size='lg'
                colour='muted'
                className='mt-4 leading-relaxed'
              >
                Use our free conversion rate calculator to measure and optimize
                your website performance. Whether you run an ecommerce store,
                SaaS product, or lead generation site, understanding your
                conversion rate is essential to growing revenue and improving
                your marketing ROI. This tool helps you calculate conversion
                rates, estimate traffic requirements, and project the revenue
                impact of conversion rate optimization (CRO).
              </Text>

              <div className='mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2'>
                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    Why Conversion Rate Matters
                  </Text>
                  <ul className='mt-3 space-y-2'>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Revenue Growth
                        </Text>{' '}
                        - Even small conversion rate improvements can
                        dramatically increase revenue without spending more on
                        traffic acquisition.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Marketing Efficiency
                        </Text>{' '}
                        - A higher conversion rate means you get more value from
                        every visitor, lowering your effective cost per
                        acquisition (CPA).
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Competitive Advantage
                        </Text>{' '}
                        - Optimized conversion rates let you outbid competitors
                        on paid channels while maintaining profitability.
                      </Text>
                    </li>
                  </ul>
                </div>
                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    Conversion Rate Optimization Tips
                  </Text>
                  <ul className='mt-3 space-y-2'>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Optimize page speed
                        </Text>{' '}
                        - Every second of delay reduces conversions by up to 7%.
                        Compress images, minimize scripts, and use a CDN.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Simplify your forms
                        </Text>{' '}
                        - Reduce form fields to only what is essential. Each
                        extra field can decrease conversion rates by 4-11%.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Add social proof
                        </Text>{' '}
                        - Testimonials, reviews, and trust badges increase
                        visitor confidence and drive higher conversion rates.
                      </Text>
                    </li>
                  </ul>
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

          <aside className='hidden lg:sticky lg:top-12 lg:block lg:w-64 lg:shrink-0 lg:self-start'>
            <ToolsNav />
          </aside>
        </div>
      </main>
    </div>
  )
}
