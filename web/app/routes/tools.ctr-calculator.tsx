import { TrendingUpIcon } from 'lucide-react'
import { useState } from 'react'
import type { SitemapFunction } from 'remix-sitemap'

import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import Button from '~/ui/Button'
import Input from '~/ui/Input'

export const sitemap: SitemapFunction = () => ({
  priority: 0.8,
})

const FAQ_ITEMS = [
  {
    question: 'What is CTR (Click-Through Rate)?',
    answer:
      'CTR is a metric that measures the percentage of people who click on your ad or link after seeing it. It helps you understand how compelling and relevant your content is to your audience.',
  },
  {
    question: 'What is a good CTR?',
    answer:
      'A good CTR varies by industry and platform. For Google Ads, 2-3% is average for search ads. Display ads typically see 0.5-1%. Facebook ads average 0.9%, while email campaigns can achieve 2-5%. Higher CTRs indicate more engaging content.',
  },
  {
    question: 'How do I improve my CTR?',
    answer:
      'Improve CTR by writing compelling headlines, using relevant keywords, creating clear calls-to-action, A/B testing ad copy, targeting the right audience, and using eye-catching visuals. Regular optimization based on performance data is key.',
  },
  {
    question: 'Why is CTR important?',
    answer:
      'CTR directly impacts your advertising costs and effectiveness. Higher CTRs lead to better Quality Scores in Google Ads, lower cost-per-click, improved ad rankings, and ultimately better ROI on your marketing spend.',
  },
  {
    question: 'How is CTR calculated?',
    answer:
      'CTR is calculated by dividing the total number of clicks by the total number of impressions, then multiplying by 100 to get a percentage. Formula: CTR = (Clicks ÷ Impressions) × 100',
  },
  {
    question: 'What affects CTR?',
    answer:
      'CTR is influenced by ad relevance, headline quality, visual appeal, targeting accuracy, ad placement, timing, competition, and device type. Understanding these factors helps optimize your campaigns.',
  },
  {
    question: 'Can Swetrix track CTR for my campaigns?',
    answer:
      'Yes! Swetrix provides comprehensive analytics to track your marketing campaigns, including custom events for clicks and impressions. You can monitor CTR trends, compare campaigns, and get actionable insights to improve performance.',
  },
  {
    question: 'What is the difference between CTR and conversion rate?',
    answer:
      'CTR measures the percentage of people who click your ad after seeing it, while conversion rate measures the percentage of visitors who complete a desired action (purchase, signup, etc.) after clicking. Both metrics are crucial for campaign success.',
  },
]

interface CTRMetrics {
  clicks: string
  impressions: string
}

interface CTRResult {
  ctr: number
  performance: 'Excellent' | 'Good' | 'Average' | 'Below Average' | 'Poor'
  color: string
}

export default function CTRCalculator() {
  const [metrics, setMetrics] = useState<CTRMetrics>({
    clicks: '',
    impressions: '',
  })
  const [result, setResult] = useState<CTRResult | null>(null)

  const handleMetricChange = (key: keyof CTRMetrics, value: string) => {
    const newMetrics = { ...metrics, [key]: value }
    setMetrics(newMetrics)

    if (newMetrics.clicks && newMetrics.impressions) {
      const clicks = parseFloat(newMetrics.clicks)
      const impressions = parseFloat(newMetrics.impressions)

      if (clicks >= 0 && impressions > 0) {
        const ctr = (clicks / impressions) * 100

        let performance: CTRResult['performance']
        let color: string

        if (ctr >= 5) {
          performance = 'Excellent'
          color = 'text-green-600 dark:text-green-400'
        } else if (ctr >= 3) {
          performance = 'Good'
          color = 'text-blue-600 dark:text-blue-400'
        } else if (ctr >= 1.5) {
          performance = 'Average'
          color = 'text-yellow-600 dark:text-yellow-400'
        } else if (ctr >= 0.5) {
          performance = 'Below Average'
          color = 'text-orange-600 dark:text-orange-400'
        } else {
          performance = 'Poor'
          color = 'text-red-600 dark:text-red-400'
        }

        setResult({ ctr, performance, color })
      } else {
        setResult(null)
      }
    } else {
      setResult(null)
    }
  }

  // Using native <details>/<summary> for FAQ to ensure content is present in the DOM for SEO

  const reset = () => {
    setMetrics({ clicks: '', impressions: '' })
    setResult(null)
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-slate-900'>
      <main className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-4xl'>
          <div className='text-center'>
            <h1 className='text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl dark:text-white'>
              CTR Calculator
            </h1>
            <p className='mt-4 text-lg text-gray-600 dark:text-gray-400'>
              Calculate your Click-Through Rate and understand your campaign performance instantly
            </p>
          </div>

          <div className='mt-12 rounded-xl bg-white p-8 ring-1 ring-gray-200 dark:bg-slate-800 dark:ring-slate-700'>
            <div className='space-y-6'>
              <div>
                <h2 className='mb-6 text-2xl font-semibold text-gray-900 dark:text-white'>Calculate Your CTR</h2>

                <div className='grid gap-6 md:grid-cols-2'>
                  <div>
                    <Input
                      type='number'
                      placeholder='Enter number of clicks'
                      label='Total Clicks'
                      value={metrics.clicks}
                      onChange={(e) => handleMetricChange('clicks', e.target.value)}
                      className='w-full'
                      min='0'
                    />
                    <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>How many times your ad was clicked</p>
                  </div>

                  <div>
                    <Input
                      type='number'
                      placeholder='Enter number of impressions'
                      label='Total Impressions'
                      value={metrics.impressions}
                      onChange={(e) => handleMetricChange('impressions', e.target.value)}
                      className='w-full'
                      min='1'
                    />
                    <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>How many times your ad was shown</p>
                  </div>
                </div>

                <div className='mt-6'>
                  <Button onClick={reset} regular>
                    Reset
                  </Button>
                </div>
              </div>

              {result ? (
                <div className='border-t border-gray-200 pt-6 dark:border-gray-700'>
                  <h3 className='mb-4 text-lg font-medium text-gray-900 dark:text-white'>Results</h3>

                  <div className='rounded-lg bg-gray-50 p-6 dark:bg-slate-700/50'>
                    <div className='text-center'>
                      <div className='text-5xl font-bold text-gray-900 dark:text-white'>{result.ctr.toFixed(2)}%</div>
                      <div className='mt-2 text-lg text-gray-600 dark:text-gray-400'>Click-Through Rate</div>
                      <div className={`mt-4 text-lg font-semibold ${result.color}`}>
                        {result.performance} Performance
                      </div>
                    </div>

                    <div className='mt-6 grid gap-4 text-sm md:grid-cols-2'>
                      <div className='rounded-lg bg-white p-4 dark:bg-slate-800'>
                        <div className='text-gray-500 dark:text-gray-400'>Formula Used</div>
                        <div className='mt-1 font-mono text-gray-900 dark:text-white'>
                          CTR = (Clicks ÷ Impressions) × 100
                        </div>
                      </div>
                      <div className='rounded-lg bg-white p-4 dark:bg-slate-800'>
                        <div className='text-gray-500 dark:text-gray-400'>Your Calculation</div>
                        <div className='mt-1 font-mono text-gray-900 dark:text-white'>
                          ({metrics.clicks} ÷ {metrics.impressions}) × 100
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className='mt-6 rounded-lg bg-indigo-50 p-4 dark:bg-indigo-900/20'>
                    <h4 className='flex items-center text-lg font-medium text-indigo-900 dark:text-indigo-300'>
                      <TrendingUpIcon className='mr-2 h-5 w-5' />
                      Performance Insights
                    </h4>
                    <p className='mt-2 text-sm text-indigo-800 dark:text-indigo-200'>
                      {result.performance === 'Excellent'
                        ? 'Outstanding CTR! Your ads are highly engaging and relevant to your audience. Keep up the great work!'
                        : null}
                      {result.performance === 'Good'
                        ? 'Good CTR! Your ads are performing well. Consider A/B testing to push performance even higher.'
                        : null}
                      {result.performance === 'Average'
                        ? "Average CTR. There's room for improvement. Try refining your targeting or ad copy."
                        : null}
                      {result.performance === 'Below Average'
                        ? 'Below average CTR. Consider reviewing your ad relevance, targeting, and creative elements.'
                        : null}
                      {result.performance === 'Poor'
                        ? 'Low CTR indicates your ads may not be resonating with your audience. Consider a comprehensive review of your campaign strategy.'
                        : null}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className='mt-16'>
            <h2 className='mb-8 text-center text-3xl font-bold text-gray-900 dark:text-white'>
              Frequently Asked Questions
            </h2>

            <div className='space-y-4'>
              {FAQ_ITEMS.map((item, index) => (
                <details
                  key={index}
                  className='group rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-slate-800'
                >
                  <summary className='flex w-full cursor-pointer items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50'>
                    <h3 className='text-lg font-medium text-gray-900 dark:text-white'>{item.question}</h3>
                    <svg
                      className='h-5 w-5 text-gray-500 transition-transform group-open:rotate-180'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                    </svg>
                  </summary>
                  <div className='border-t border-gray-200 px-6 py-4 dark:border-gray-700'>
                    <p className='text-gray-600 dark:text-gray-400'>{item.answer}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>

          {/* FAQ Structured Data */}
          <script type='application/ld+json'>
            {JSON.stringify(
              {
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: FAQ_ITEMS.map((item) => ({
                  '@type': 'Question',
                  name: item.question,
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: item.answer,
                  },
                })),
              },
              null,
              2,
            )}
          </script>

          <DitchGoogle />
        </div>
      </main>
    </div>
  )
}
