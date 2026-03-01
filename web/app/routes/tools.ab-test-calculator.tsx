import {
  CaretDownIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  ChartLineUpIcon,
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
import Tooltip from '~/ui/Tooltip'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

export const meta: MetaFunction = () => {
  return [
    ...getTitle('Free A/B Test Significance Calculator - Swetrix'),
    ...getDescription(
      'Calculate statistical significance for your A/B tests to determine if your variation performs better than the control. Fast, free, and accurate.',
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

interface Variant {
  visitors: number
  conversions: number
}

interface TestResults {
  controlCR: number
  variantCR: number
  relativeImprovement: number
  pValue: number
  isSignificant: boolean
  zScore: number
}

const FAQ_ITEMS = [
  {
    question: 'What is an A/B test?',
    answer:
      'A/B testing (also known as split testing) is a method of comparing two versions of a webpage, app, or email against each other to determine which one performs better.',
  },
  {
    question: 'What is statistical significance?',
    answer:
      'Statistical significance helps you understand if the results of your A/B test are likely due to the changes you made, or if they just happened by random chance. A 95% confidence level means you can be 95% sure the results are not due to chance.',
  },
  {
    question: 'What is the control and what is the variant?',
    answer:
      'The "Control" is the original version of your webpage or app (Variant A). The "Variant" is the modified version (Variant B) you are testing to see if the changes improve performance.',
  },
  {
    question: 'How many visitors do I need for an A/B test?',
    answer:
      'The required sample size depends on your baseline conversion rate and the minimum detectable effect you want to measure. Generally, you need at least a few hundred conversions per variant for reliable results.',
  },
  {
    question: 'What is a p-value?',
    answer:
      'The p-value tells you the probability of seeing the observed difference in conversion rates if there actually was no underlying difference. A p-value less than 0.05 generally indicates statistical significance.',
  },
  {
    question: 'Can I stop my test early if it reaches significance?',
    answer:
      'It is generally not recommended to stop tests early just because they reach significance, as this can lead to false positives (the "peeking problem"). Always decide your sample size in advance and run the test until you reach it.',
  },
]

export default function ABTestCalculator() {
  const [control, setControl] = useState<Variant>({
    visitors: 1000,
    conversions: 50,
  })
  const [variant, setVariant] = useState<Variant>({
    visitors: 1000,
    conversions: 75,
  })
  const [confidenceLevel, setConfidenceLevel] = useState<number>(0.95)

  const [results, setResults] = useState<TestResults | null>(null)

  useEffect(() => {
    calculateSignificance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [control, variant, confidenceLevel])

  const calculateSignificance = () => {
    if (
      control.visitors <= 0 ||
      variant.visitors <= 0 ||
      control.conversions < 0 ||
      variant.conversions < 0
    ) {
      setResults(null)
      return
    }

    const p1 = control.conversions / control.visitors
    const p2 = variant.conversions / variant.visitors

    const pooledP =
      (control.conversions + variant.conversions) /
      (control.visitors + variant.visitors)
    const se = Math.sqrt(
      pooledP * (1 - pooledP) * (1 / control.visitors + 1 / variant.visitors),
    )

    let zScore = 0
    let pValue = 1

    if (se > 0) {
      zScore = (p2 - p1) / se
      // Approximate p-value for two-tailed test
      pValue = 2 * (1 - normalCDF(Math.abs(zScore)))
    }

    let requiredZ = 1.96 // 95% default
    if (confidenceLevel === 0.9) requiredZ = 1.645
    if (confidenceLevel === 0.99) requiredZ = 2.576

    const isSignificant = Math.abs(zScore) >= requiredZ
    const relativeImprovement = p1 > 0 ? ((p2 - p1) / p1) * 100 : 0

    setResults({
      controlCR: p1 * 100,
      variantCR: p2 * 100,
      relativeImprovement,
      pValue,
      isSignificant,
      zScore,
    })
  }

  // Helper function to calculate CDF of standard normal distribution
  const normalCDF = (x: number): number => {
    const t = 1 / (1 + 0.2316419 * Math.abs(x))
    const d = 0.3989423 * Math.exp((-x * x) / 2)
    const p =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
    return x > 0 ? 1 - p : p
  }

  const handleControlChange = (key: keyof Variant, value: string) => {
    setControl({ ...control, [key]: parseInt(value) || 0 })
  }

  const handleVariantChange = (key: keyof Variant, value: string) => {
    setVariant({ ...variant, [key]: parseInt(value) || 0 })
  }

  const formatPercentage = (val: number) => {
    return (val > 0 && val < 0.01 ? '<0.01' : val.toFixed(2)) + '%'
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-slate-950'>
      <main className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <ToolsNavMobile className='mb-6 xl:hidden' />

        <div className='xl:flex xl:items-start xl:gap-8'>
          <div className='min-w-0 xl:flex-1'>
            <Text as='h1' size='4xl' weight='bold' tracking='tight'>
              A/B Test Significance Calculator
            </Text>
            <Text as='p' size='lg' colour='muted' className='mt-4'>
              Determine if the differences in your A/B test conversion rates are
              statistically significant.
            </Text>

            <div className='mt-12 grid gap-8 lg:grid-cols-3'>
              {/* Input Section */}
              <div className='space-y-8 lg:col-span-2'>
                <div className='grid gap-6 md:grid-cols-2'>
                  {/* Control Group */}
                  <div className='rounded-xl bg-white p-6 ring-1 ring-gray-200 dark:bg-slate-800 dark:ring-slate-700'>
                    <h2 className='mb-4 text-xl font-semibold text-gray-900 dark:text-white'>
                      Control (Variant A)
                    </h2>
                    <div className='space-y-4'>
                      <Input
                        type='number'
                        label={
                          <>
                            Visitors
                            <Tooltip
                              className='ml-1'
                              text='Total number of users who saw the control version'
                            />
                          </>
                        }
                        value={control.visitors || ''}
                        onChange={(e) =>
                          handleControlChange('visitors', e.target.value)
                        }
                        className='w-full'
                      />
                      <Input
                        type='number'
                        label={
                          <>
                            Conversions
                            <Tooltip
                              className='ml-1'
                              text='Number of users who completed the desired action'
                            />
                          </>
                        }
                        value={control.conversions || ''}
                        onChange={(e) =>
                          handleControlChange('conversions', e.target.value)
                        }
                        className='w-full'
                      />
                    </div>
                  </div>

                  {/* Variant Group */}
                  <div className='rounded-xl bg-white p-6 ring-1 ring-gray-200 dark:bg-slate-800 dark:ring-slate-700'>
                    <h2 className='mb-4 text-xl font-semibold text-gray-900 dark:text-white'>
                      Variant (Variant B)
                    </h2>
                    <div className='space-y-4'>
                      <Input
                        type='number'
                        label={
                          <>
                            Visitors
                            <Tooltip
                              className='ml-1'
                              text='Total number of users who saw the new version'
                            />
                          </>
                        }
                        value={variant.visitors || ''}
                        onChange={(e) =>
                          handleVariantChange('visitors', e.target.value)
                        }
                        className='w-full'
                      />
                      <Input
                        type='number'
                        label={
                          <>
                            Conversions
                            <Tooltip
                              className='ml-1'
                              text='Number of users who completed the desired action'
                            />
                          </>
                        }
                        value={variant.conversions || ''}
                        onChange={(e) =>
                          handleVariantChange('conversions', e.target.value)
                        }
                        className='w-full'
                      />
                    </div>
                  </div>
                </div>

                <div className='rounded-xl bg-white p-6 ring-1 ring-gray-200 dark:bg-slate-800 dark:ring-slate-700'>
                  <label className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                    Confidence Level
                  </label>
                  <select
                    className='block w-full rounded-md border-gray-300 py-2 pr-10 pl-3 text-base focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-slate-700 dark:text-white'
                    value={confidenceLevel}
                    onChange={(e) =>
                      setConfidenceLevel(parseFloat(e.target.value))
                    }
                  >
                    <option value={0.9}>90% (More false positives)</option>
                    <option value={0.95}>95% (Standard, recommended)</option>
                    <option value={0.99}>99% (Highly rigorous)</option>
                  </select>
                </div>
              </div>

              {/* Results Section */}
              <div className='lg:col-span-1'>
                <div className='sticky top-8 space-y-6'>
                  <div className='rounded-xl bg-white p-6 ring-1 ring-gray-200 dark:bg-slate-800 dark:ring-slate-700'>
                    <h3 className='mb-4 text-lg font-semibold text-gray-900 dark:text-white'>
                      Test Results
                    </h3>

                    {!results ? (
                      <p className='text-sm text-gray-500 dark:text-gray-400'>
                        Enter valid data to see results.
                      </p>
                    ) : (
                      <div className='space-y-6'>
                        <div
                          className={`flex items-start gap-3 rounded-lg p-4 ${
                            results.isSignificant
                              ? 'bg-green-50 text-green-800 ring-1 ring-green-200 dark:bg-green-900/20 dark:text-green-300 dark:ring-green-800'
                              : 'bg-gray-50 text-gray-800 ring-1 ring-gray-200 dark:bg-slate-700/50 dark:text-gray-300 dark:ring-gray-600'
                          }`}
                        >
                          {results.isSignificant ? (
                            <CheckCircleIcon className='h-6 w-6 shrink-0 text-green-600 dark:text-green-400' />
                          ) : (
                            <WarningCircleIcon className='h-6 w-6 shrink-0 text-gray-500 dark:text-gray-400' />
                          )}
                          <div>
                            <p className='font-semibold'>
                              {results.isSignificant
                                ? 'Statistically Significant!'
                                : 'Not Significant'}
                            </p>
                            <p className='mt-1 text-sm opacity-90'>
                              {results.isSignificant
                                ? `The variant's performance is significantly different from the control at a ${
                                    confidenceLevel * 100
                                  }% confidence level.`
                                : `The results are not statistically significant. You may need more data or the variation has no real impact.`}
                            </p>
                          </div>
                        </div>

                        <div className='space-y-4'>
                          <div className='flex items-center justify-between'>
                            <span className='text-sm text-gray-600 dark:text-gray-400'>
                              Control CR
                            </span>
                            <span className='font-semibold text-gray-900 dark:text-white'>
                              {formatPercentage(results.controlCR)}
                            </span>
                          </div>
                          <div className='flex items-center justify-between'>
                            <span className='text-sm text-gray-600 dark:text-gray-400'>
                              Variant CR
                            </span>
                            <span className='font-semibold text-gray-900 dark:text-white'>
                              {formatPercentage(results.variantCR)}
                            </span>
                          </div>
                          <div className='flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700'>
                            <span className='text-sm text-gray-600 dark:text-gray-400'>
                              Relative Change
                            </span>
                            <span
                              className={`flex items-center gap-1 font-semibold ${
                                results.relativeImprovement > 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : results.relativeImprovement < 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {results.relativeImprovement > 0 && '+'}
                              {formatPercentage(results.relativeImprovement)}
                              {results.relativeImprovement > 0 ? (
                                <ChartLineUpIcon className='h-4 w-4' />
                              ) : results.relativeImprovement < 0 ? (
                                <ChartLineUpIcon className='h-4 w-4 rotate-180' />
                              ) : null}
                            </span>
                          </div>
                          <div className='flex items-center justify-between'>
                            <span className='text-sm text-gray-600 dark:text-gray-400'>
                              P-Value
                            </span>
                            <span className='font-mono text-sm text-gray-900 dark:text-white'>
                              {results.pValue < 0.001
                                ? '<0.001'
                                : results.pValue.toFixed(3)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <section className='mt-20 border-t border-gray-200 pt-16 dark:border-slate-700'>
              <Text as='h2' size='3xl' weight='bold' tracking='tight'>
                Free A/B Test Significance Calculator
              </Text>
              <Text
                as='p'
                size='lg'
                colour='muted'
                className='mt-4 leading-relaxed'
              >
                Stop guessing whether your website changes are actually
                improving conversion rates. Our A/B testing calculator uses
                robust statistical models to tell you if the performance
                difference between your Control and Variant is real, or just
                random noise.
              </Text>

              <div className='mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2'>
                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    Understanding Statistical Significance
                  </Text>
                  <Text as='p' colour='muted' className='mt-3'>
                    In A/B testing, statistical significance (often measured via
                    a p-value) indicates the likelihood that the difference in
                    conversion rates happened by chance. A 95% confidence level
                    means you can be 95% sure that the results are reliable and
                    not a fluke. If your test isn't significant, you may need to
                    run it longer to collect more data.
                  </Text>
                </div>
                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    Best Practices for Split Testing
                  </Text>
                  <ul className='mt-3 space-y-2'>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Test One Variable
                        </Text>{' '}
                        - Only change one element (like a button color or
                        headline) at a time so you know exactly what caused the
                        impact.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Wait for Traffic
                        </Text>{' '}
                        - Don't stop tests early just because they show an early
                        winner. Wait until you hit your required sample size.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Account for Seasonality
                        </Text>{' '}
                        - Run tests for at least one full business cycle (e.g.,
                        1-2 weeks) to account for day-of-week traffic
                        variations.
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

              <div className='space-y-4'>
                {FAQ_ITEMS.map((item, index) => (
                  <details
                    key={index}
                    className='group rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-slate-800'
                  >
                    <summary className='flex w-full cursor-pointer items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50'>
                      <h3 className='text-lg font-medium text-gray-900 dark:text-white'>
                        {item.question}
                      </h3>
                      <CaretDownIcon className='h-5 w-5 text-gray-500 transition-transform group-open:rotate-180' />
                    </summary>
                    <div className='border-t border-gray-200 px-6 py-4 dark:border-gray-700'>
                      <p className='text-gray-600 dark:text-gray-400'>
                        {item.answer}
                      </p>
                    </div>
                  </details>
                ))}
              </div>
            </div>

            {/* FAQ Structured Data */}
            <script
              type='application/ld+json'
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
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
                })
                  .replace(/</g, '\\u003c')
                  .replace(/\u2028|\u2029/g, ''),
              }}
            />

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
