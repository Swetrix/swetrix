import { ChartLineUpIcon } from '@phosphor-icons/react'
import { useState, useEffect } from 'react'
import type { MetaFunction } from 'react-router'
import { redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import { ToolsNav, ToolsNavMobile } from '~/components/ToolsNav'
import { isSelfhosted } from '~/lib/constants'
import Input from '~/ui/Input'
import { FAQ } from '~/ui/FAQ'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

export const meta: MetaFunction = () => {
  return [
    ...getTitle('Free LTV Calculator - Customer Lifetime Value'),
    ...getDescription(
      'Calculate Customer Lifetime Value (LTV) and LTV:CAC ratio. Optimize your marketing spend and understand the long-term value of your customers.',
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
  aov: number
  frequency: number
  lifespan: number
  margin: number
  cac: number
}

const FAQ_ITEMS = [
  {
    question: 'What is Customer Lifetime Value (LTV)?',
    answer:
      'Customer Lifetime Value (LTV or CLV) is the total revenue a business can reasonably expect from a single customer account throughout the business relationship.',
  },
  {
    question: 'How do you calculate LTV?',
    answer:
      'A common way to calculate LTV is: Average Order Value × Purchase Frequency × Customer Lifespan. To get the profit LTV, multiply this by your Gross Margin.',
  },
  {
    question: 'What is a good LTV:CAC ratio?',
    answer:
      'A benchmark LTV:CAC ratio for successful SaaS and e-commerce businesses is 3:1 or higher. This means you make $3 for every $1 spent acquiring a customer. A ratio of 1:1 means you are losing money or breaking even, while a ratio of 5:1+ means you might be under-investing in marketing.',
  },
  {
    question: 'Why is LTV important?',
    answer:
      'LTV helps you make important business decisions about sales, marketing, product development, and customer support. It tells you how much you can afford to spend to acquire a new customer (CAC).',
  },
  {
    question: 'How can I improve my LTV?',
    answer:
      'You can improve LTV by increasing the average order value (upselling/cross-selling), increasing purchase frequency (loyalty programs, email marketing), or extending the customer lifespan (improving customer service, reducing churn).',
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

export default function LTVCalculator() {
  const [metrics, setMetrics] = useState<Metrics>({
    aov: 100,
    frequency: 4,
    lifespan: 3,
    margin: 60,
    cac: 150,
  })

  const [ltv, setLtv] = useState(0)
  const [profitLtv, setProfitLtv] = useState(0)
  const [ltvCacRatio, setLtvCacRatio] = useState(0)

  useEffect(() => {
    calculateLTV()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics])

  const calculateLTV = () => {
    const { aov, frequency, lifespan, margin, cac } = metrics
    const calculatedLtv = aov * frequency * lifespan
    const calculatedProfitLtv = calculatedLtv * (margin / 100)

    setLtv(calculatedLtv)
    setProfitLtv(calculatedProfitLtv)

    if (cac > 0) {
      setLtvCacRatio(calculatedProfitLtv / cac)
    } else {
      setLtvCacRatio(0)
    }
  }

  const handleMetricChange = (key: keyof Metrics, value: string) => {
    setMetrics({ ...metrics, [key]: parseFloat(value) || 0 })
  }

  const getRatioColor = (ratio: number) => {
    if (ratio >= 3) return 'text-green-600 dark:text-green-400'
    if (ratio >= 1) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-slate-950'>
      <main className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <ToolsNavMobile className='mb-6 xl:hidden' />

        <div className='xl:flex xl:items-start xl:gap-8'>
          <div className='min-w-0 xl:flex-1'>
            <Text as='h1' size='4xl' weight='bold' tracking='tight'>
              Customer Lifetime Value Calculator
            </Text>
            <Text as='p' size='lg' colour='muted' className='mt-4'>
              Calculate how much a customer is worth to your business over their
              lifetime and optimize your acquisition costs.
            </Text>

            <div className='mt-12 grid gap-8 lg:grid-cols-3'>
              {/* Input Section */}
              <div className='lg:col-span-2'>
                <div className='rounded-lg bg-white p-8 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
                  <h2 className='mb-6 text-2xl font-semibold text-gray-900 dark:text-white'>
                    Business Metrics
                  </h2>

                  <div className='grid gap-6 md:grid-cols-2'>
                    <Input
                      type='number'
                      label={
                        <>
                          Average Order Value ($)
                          <Tooltip
                            className='ml-1'
                            text='The average amount spent each time a customer places an order'
                          />
                        </>
                      }
                      value={metrics.aov || ''}
                      onChange={(e) =>
                        handleMetricChange('aov', e.target.value)
                      }
                      className='w-full'
                    />

                    <Input
                      type='number'
                      label={
                        <>
                          Purchase Frequency (per year)
                          <Tooltip
                            className='ml-1'
                            text='Average number of purchases a customer makes in a year'
                          />
                        </>
                      }
                      value={metrics.frequency || ''}
                      onChange={(e) =>
                        handleMetricChange('frequency', e.target.value)
                      }
                      className='w-full'
                    />

                    <Input
                      type='number'
                      label={
                        <>
                          Customer Lifespan (years)
                          <Tooltip
                            className='ml-1'
                            text='Average number of years a customer continues purchasing from you'
                          />
                        </>
                      }
                      value={metrics.lifespan || ''}
                      onChange={(e) =>
                        handleMetricChange('lifespan', e.target.value)
                      }
                      className='w-full'
                    />

                    <Input
                      type='number'
                      label={
                        <>
                          Gross Margin (%)
                          <Tooltip
                            className='ml-1'
                            text='Your average profit margin percentage per order'
                          />
                        </>
                      }
                      value={metrics.margin || ''}
                      onChange={(e) =>
                        handleMetricChange('margin', e.target.value)
                      }
                      className='w-full'
                    />

                    <div className='md:col-span-2'>
                      <Input
                        type='number'
                        label={
                          <>
                            Customer Acquisition Cost (CAC) ($)
                            <Tooltip
                              className='ml-1'
                              text='Total marketing and sales cost to acquire one new customer'
                            />
                          </>
                        }
                        value={metrics.cac || ''}
                        onChange={(e) =>
                          handleMetricChange('cac', e.target.value)
                        }
                        className='w-full'
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Results Section */}
              <div className='lg:col-span-1'>
                <div className='sticky top-8 space-y-6'>
                  <div className='rounded-lg bg-white p-6 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
                    <h3 className='mb-4 text-lg font-semibold text-gray-900 dark:text-white'>
                      LTV Results
                    </h3>

                    <div className='space-y-6'>
                      <div>
                        <p className='mb-1 text-sm text-gray-600 dark:text-gray-400'>
                          Profit LTV
                        </p>
                        <p className='flex items-center gap-2 text-3xl font-bold text-gray-900 dark:text-white'>
                          <ChartLineUpIcon className='h-6 w-6 text-indigo-500' />
                          {formatCurrency(profitLtv)}
                        </p>
                        <p className='mt-1 text-xs text-gray-500'>
                          Revenue LTV: {formatCurrency(ltv)}
                        </p>
                      </div>

                      <div className='border-t border-gray-100 pt-4 dark:border-gray-700'>
                        <p className='mb-1 text-sm text-gray-600 dark:text-gray-400'>
                          LTV:CAC Ratio
                        </p>
                        <p
                          className={`text-2xl font-bold ${getRatioColor(
                            ltvCacRatio,
                          )}`}
                        >
                          {ltvCacRatio.toFixed(2)}:1
                        </p>
                        <p className='mt-1 text-xs text-gray-500'>
                          {ltvCacRatio >= 3
                            ? 'Excellent ratio! Healthy growth potential.'
                            : ltvCacRatio >= 1
                              ? 'Needs improvement. Low profitability.'
                              : 'Unsustainable. You lose money on each customer.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <section className='mt-20 border-t border-gray-200 pt-16 dark:border-slate-700'>
              <Text as='h2' size='3xl' weight='bold' tracking='tight'>
                Free Customer Lifetime Value (LTV) Calculator
              </Text>
              <Text
                as='p'
                size='lg'
                colour='muted'
                className='mt-4 leading-relaxed'
              >
                Understanding your Customer Lifetime Value (CLV/LTV) is crucial
                for sustainable business growth. This calculator helps you
                determine how much revenue and profit a typical customer
                generates over their entire relationship with your brand,
                enabling you to make smarter decisions about marketing spend.
              </Text>

              <div className='mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2'>
                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    Why Calculate LTV?
                  </Text>
                  <ul className='mt-3 space-y-2'>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Optimize Acquisition
                        </Text>{' '}
                        - Knowing your LTV tells you exactly how much you can
                        afford to spend to acquire a new customer (CAC).
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Focus on Retention
                        </Text>{' '}
                        - It highlights the financial impact of keeping
                        customers longer versus constantly finding new ones.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Predictive Revenue
                        </Text>{' '}
                        - Helps forecast long-term cash flow based on current
                        customer acquisition rates.
                      </Text>
                    </li>
                  </ul>
                </div>
                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    The LTV:CAC Ratio
                  </Text>
                  <Text as='p' colour='muted' className='mt-3'>
                    The LTV to CAC ratio is one of the most important metrics
                    for SaaS and e-commerce companies. It compares the lifetime
                    value of a customer to the cost of acquiring them. A
                    benchmark ratio of 3:1 means you make $3 in gross profit for
                    every $1 spent on marketing and sales. A ratio lower than
                    3:1 indicates poor profitability, while a ratio of 5:1 or
                    higher might mean you are under-investing in growth.
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
