import { ArrowsLeftRightIcon } from '@phosphor-icons/react'
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
  const title = 'Free Percentage Calculator - Calculate Percentages Instantly'
  const description =
    'Calculate percentages with ease. Find what X% of Y is, what percentage X is of Y, or the percentage change between two numbers. Free, fast, and no signup required.'
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
    question: 'How do I calculate a percentage of a number?',
    answer:
      'To find X% of Y, multiply Y by X and divide by 100. For example, 25% of 200 is (200 × 25) ÷ 100 = 50. You can use our calculator above to compute this instantly.',
  },
  {
    question: 'How do I find what percentage one number is of another?',
    answer:
      'To find what percentage X is of Y, divide X by Y and multiply by 100. For example, 30 is what percent of 150? (30 ÷ 150) × 100 = 20%. This tells you 30 is 20% of 150.',
  },
  {
    question: 'How do I calculate percentage change?',
    answer:
      'Percentage change is calculated with the formula: ((New Value - Old Value) ÷ Old Value) × 100. A positive result means an increase, while a negative result means a decrease. For example, going from 80 to 100 is a 25% increase.',
  },
  {
    question: 'What is the difference between percentage and percentile?',
    answer:
      'A percentage is a fraction expressed out of 100 (e.g., 85% on a test means 85 out of 100). A percentile indicates a value below which a given percentage of data falls (e.g., the 90th percentile means you scored better than 90% of test-takers).',
  },
  {
    question: 'How do I calculate a percentage increase?',
    answer:
      'To calculate percentage increase: ((New Value - Original Value) ÷ Original Value) × 100. For example, if sales went from $10,000 to $15,000, the percentage increase is ((15000 - 10000) ÷ 10000) × 100 = 50% increase.',
  },
  {
    question: 'How do I calculate a percentage decrease?',
    answer:
      'To calculate percentage decrease: ((Original Value - New Value) ÷ Original Value) × 100. For example, if traffic dropped from 5,000 to 3,500 visitors, the decrease is ((5000 - 3500) ÷ 5000) × 100 = 30% decrease.',
  },
  {
    question: 'How are percentages used in marketing analytics?',
    answer:
      'Percentages are fundamental to marketing analytics. Click-through rate (CTR), conversion rate, bounce rate, churn rate, revenue growth rate, and market share are all expressed as percentages. Understanding percentage calculations helps you interpret KPIs and make data-driven decisions.',
  },
  {
    question: 'How do I convert a fraction to a percentage?',
    answer:
      'To convert a fraction to a percentage, divide the numerator by the denominator and multiply by 100. For example, 3/4 = (3 ÷ 4) × 100 = 75%. To convert a decimal to a percentage, multiply by 100 (e.g., 0.85 = 85%).',
  },
]

type Mode = 'of' | 'is' | 'change'

interface OfInputs {
  percent: string
  number: string
}

interface IsInputs {
  value: string
  total: string
}

interface ChangeInputs {
  oldValue: string
  newValue: string
}

const MODES: { id: Mode; label: string; description: string }[] = [
  { id: 'of', label: 'X% of Y', description: 'What is' },
  { id: 'is', label: 'X is what % of Y', description: 'Find percent' },
  { id: 'change', label: '% Change', description: 'From X to Y' },
]

export default function PercentageCalculator() {
  const [mode, setMode] = useState<Mode>('of')

  const [ofInputs, setOfInputs] = useState<OfInputs>({
    percent: '',
    number: '',
  })
  const [ofResult, setOfResult] = useState<number | null>(null)

  const [isInputs, setIsInputs] = useState<IsInputs>({ value: '', total: '' })
  const [isResult, setIsResult] = useState<number | null>(null)

  const [changeInputs, setChangeInputs] = useState<ChangeInputs>({
    oldValue: '',
    newValue: '',
  })
  const [changeResult, setChangeResult] = useState<{
    percent: number
    direction: 'increase' | 'decrease'
  } | null>(null)

  const handleOfChange = (key: keyof OfInputs, value: string) => {
    const newInputs = { ...ofInputs, [key]: value }
    setOfInputs(newInputs)

    const percent = parseFloat(newInputs.percent)
    const number = parseFloat(newInputs.number)

    if (!isNaN(percent) && !isNaN(number)) {
      setOfResult((number * percent) / 100)
    } else {
      setOfResult(null)
    }
  }

  const handleIsChange = (key: keyof IsInputs, value: string) => {
    const newInputs = { ...isInputs, [key]: value }
    setIsInputs(newInputs)

    const val = parseFloat(newInputs.value)
    const total = parseFloat(newInputs.total)

    if (!isNaN(val) && !isNaN(total) && total !== 0) {
      setIsResult((val / total) * 100)
    } else {
      setIsResult(null)
    }
  }

  const handleChangeChange = (key: keyof ChangeInputs, value: string) => {
    const newInputs = { ...changeInputs, [key]: value }
    setChangeInputs(newInputs)

    const oldVal = parseFloat(newInputs.oldValue)
    const newVal = parseFloat(newInputs.newValue)

    if (!isNaN(oldVal) && !isNaN(newVal) && oldVal !== 0) {
      const percent = ((newVal - oldVal) / Math.abs(oldVal)) * 100
      setChangeResult({
        percent: Math.abs(percent),
        direction: percent >= 0 ? 'increase' : 'decrease',
      })
    } else {
      setChangeResult(null)
    }
  }

  const reset = () => {
    setOfInputs({ percent: '', number: '' })
    setOfResult(null)
    setIsInputs({ value: '', total: '' })
    setIsResult(null)
    setChangeInputs({ oldValue: '', newValue: '' })
    setChangeResult(null)
  }

  const formatNumber = (n: number) => {
    if (Number.isInteger(n)) return n.toLocaleString()
    return n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-slate-950'>
      <main className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <ToolsNavMobile className='mb-6 lg:hidden' />

        <div className='lg:flex lg:items-start lg:gap-8'>
          <div className='min-w-0 lg:flex-1'>
            <Text as='h1' size='4xl' weight='bold' tracking='tight'>
              Percentage Calculator
            </Text>
            <Text as='p' size='lg' colour='muted' className='mt-4'>
              Calculate percentages quickly — find X% of a number, what percent
              one number is of another, or the percentage change between values
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

                {mode === 'of' && (
                  <div>
                    <Text as='h2' size='2xl' weight='semibold' className='mb-6'>
                      What is X% of Y?
                    </Text>

                    <div className='flex items-end gap-3'>
                      <div className='flex-1'>
                        <Input
                          type='number'
                          placeholder='25'
                          label='Percentage'
                          value={ofInputs.percent}
                          onChange={(e) =>
                            handleOfChange('percent', e.target.value)
                          }
                          className='w-full'
                        />
                      </div>
                      <div className='flex h-[42px] items-center pb-0.5 text-lg font-medium text-gray-500 dark:text-gray-400'>
                        % of
                      </div>
                      <div className='flex-1'>
                        <Input
                          type='number'
                          placeholder='200'
                          label='Number'
                          value={ofInputs.number}
                          onChange={(e) =>
                            handleOfChange('number', e.target.value)
                          }
                          className='w-full'
                        />
                      </div>
                    </div>

                    <div className='mt-6'>
                      <Button variant='secondary' onClick={reset}>
                        Reset
                      </Button>
                    </div>

                    {ofResult !== null ? (
                      <div className='mt-6 border-t border-gray-200 pt-6 dark:border-gray-700'>
                        <div className='rounded-lg bg-gray-50 p-6 dark:bg-slate-900'>
                          <div className='text-center'>
                            <div className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                              {ofInputs.percent}% of {ofInputs.number} is
                            </div>
                            <div className='mt-2 text-5xl font-bold text-gray-900 dark:text-white'>
                              {formatNumber(ofResult)}
                            </div>
                          </div>

                          <div className='mt-6 rounded-lg bg-white p-4 text-sm dark:bg-slate-950'>
                            <div className='text-gray-500 dark:text-gray-400'>
                              Formula
                            </div>
                            <div className='mt-1 font-mono text-gray-900 dark:text-white'>
                              ({ofInputs.number} × {ofInputs.percent}) ÷ 100 ={' '}
                              {formatNumber(ofResult)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {mode === 'is' && (
                  <div>
                    <Text as='h2' size='2xl' weight='semibold' className='mb-6'>
                      X is what percent of Y?
                    </Text>

                    <div className='flex items-end gap-3'>
                      <div className='flex-1'>
                        <Input
                          type='number'
                          placeholder='30'
                          label='Value'
                          value={isInputs.value}
                          onChange={(e) =>
                            handleIsChange('value', e.target.value)
                          }
                          className='w-full'
                        />
                      </div>
                      <div className='flex h-[42px] items-center pb-0.5 text-lg font-medium text-gray-500 dark:text-gray-400'>
                        is what % of
                      </div>
                      <div className='flex-1'>
                        <Input
                          type='number'
                          placeholder='150'
                          label='Total'
                          value={isInputs.total}
                          onChange={(e) =>
                            handleIsChange('total', e.target.value)
                          }
                          className='w-full'
                        />
                      </div>
                    </div>

                    <div className='mt-6'>
                      <Button variant='secondary' onClick={reset}>
                        Reset
                      </Button>
                    </div>

                    {isResult !== null ? (
                      <div className='mt-6 border-t border-gray-200 pt-6 dark:border-gray-700'>
                        <div className='rounded-lg bg-gray-50 p-6 dark:bg-slate-900'>
                          <div className='text-center'>
                            <div className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                              {isInputs.value} is this percentage of{' '}
                              {isInputs.total}
                            </div>
                            <div className='mt-2 text-5xl font-bold text-gray-900 dark:text-white'>
                              {isResult.toFixed(2)}%
                            </div>
                          </div>

                          <div className='mt-6 rounded-lg bg-white p-4 text-sm dark:bg-slate-950'>
                            <div className='text-gray-500 dark:text-gray-400'>
                              Formula
                            </div>
                            <div className='mt-1 font-mono text-gray-900 dark:text-white'>
                              ({isInputs.value} ÷ {isInputs.total}) × 100 ={' '}
                              {isResult.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {mode === 'change' && (
                  <div>
                    <Text as='h2' size='2xl' weight='semibold' className='mb-6'>
                      Percentage Change
                    </Text>

                    <div className='flex items-end gap-3'>
                      <div className='flex-1'>
                        <Input
                          type='number'
                          placeholder='80'
                          label='Old Value'
                          value={changeInputs.oldValue}
                          onChange={(e) =>
                            handleChangeChange('oldValue', e.target.value)
                          }
                          className='w-full'
                        />
                      </div>
                      <div className='flex h-[42px] items-center pb-0.5'>
                        <ArrowsLeftRightIcon className='h-5 w-5 text-gray-400 dark:text-gray-500' />
                      </div>
                      <div className='flex-1'>
                        <Input
                          type='number'
                          placeholder='100'
                          label='New Value'
                          value={changeInputs.newValue}
                          onChange={(e) =>
                            handleChangeChange('newValue', e.target.value)
                          }
                          className='w-full'
                        />
                      </div>
                    </div>

                    <div className='mt-6'>
                      <Button variant='secondary' onClick={reset}>
                        Reset
                      </Button>
                    </div>

                    {changeResult !== null ? (
                      <div className='mt-6 border-t border-gray-200 pt-6 dark:border-gray-700'>
                        <div className='rounded-lg bg-gray-50 p-6 dark:bg-slate-900'>
                          <div className='text-center'>
                            <div className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                              Change from {changeInputs.oldValue} to{' '}
                              {changeInputs.newValue}
                            </div>
                            <div
                              className={`mt-2 text-5xl font-bold ${
                                changeResult.direction === 'increase'
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              {changeResult.direction === 'increase'
                                ? '+'
                                : '-'}
                              {changeResult.percent.toFixed(2)}%
                            </div>
                            <div className='mt-2 text-lg text-gray-600 dark:text-gray-400'>
                              {changeResult.direction === 'increase'
                                ? 'Increase'
                                : 'Decrease'}
                            </div>
                          </div>

                          <div className='mt-6 rounded-lg bg-white p-4 text-sm dark:bg-slate-950'>
                            <div className='text-gray-500 dark:text-gray-400'>
                              Formula
                            </div>
                            <div className='mt-1 font-mono text-gray-900 dark:text-white'>
                              (({changeInputs.newValue} -{' '}
                              {changeInputs.oldValue}) ÷ |
                              {changeInputs.oldValue}|) × 100 ={' '}
                              {changeResult.direction === 'increase'
                                ? '+'
                                : '-'}
                              {changeResult.percent.toFixed(2)}%
                            </div>
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
                Free Percentage Calculator Online
              </Text>
              <Text
                as='p'
                size='lg'
                colour='muted'
                className='mt-4 leading-relaxed'
              >
                Our free percentage calculator helps you solve the three most
                common percentage problems instantly: finding a percentage of a
                number, determining what percent one number is of another, and
                calculating the percentage change between two values. Whether
                you are analyzing marketing metrics, calculating discounts,
                tracking growth rates, or working with financial data, this tool
                gives you accurate results in seconds.
              </Text>

              <div className='mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2'>
                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    Common Uses for Percentages
                  </Text>
                  <ul className='mt-3 space-y-2'>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Marketing analytics
                        </Text>{' '}
                        - Calculate conversion rates, click-through rates,
                        bounce rates, and churn rates to measure campaign
                        performance.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Business growth
                        </Text>{' '}
                        - Track revenue growth, user acquisition rates, and
                        month-over-month percentage changes for data-driven
                        decisions.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Pricing & discounts
                        </Text>{' '}
                        - Calculate sale prices, markups, margins, and the
                        impact of promotional discounts on revenue.
                      </Text>
                    </li>
                  </ul>
                </div>
                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    Percentage Tips
                  </Text>
                  <ul className='mt-3 space-y-2'>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Percentage trick
                        </Text>{' '}
                        - X% of Y always equals Y% of X. So 8% of 50 is the same
                        as 50% of 8 (both are 4). Use whichever is easier to
                        calculate.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Percentage points vs. percent
                        </Text>{' '}
                        - Going from 5% to 10% is a 5 percentage point increase,
                        but a 100% increase in relative terms. Be precise in
                        your communication.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Compound growth
                        </Text>{' '}
                        - Repeated percentage increases compound. A 10% increase
                        followed by another 10% increase results in 21% total
                        growth, not 20%.
                      </Text>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <div className='mt-16'>
              <Text
                as='h2'
                size='3xl'
                weight='bold'
                className='mb-8 text-center'
              >
                Frequently Asked Questions
              </Text>

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
