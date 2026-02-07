import { CopyIcon, CaretDownIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import type { MetaFunction } from 'react-router'
import { redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import { ToolsNav, ToolsNavMobile } from '~/components/ToolsNav'
import { isSelfhosted } from '~/lib/constants'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

export const meta: MetaFunction = () => {
  return [
    ...getTitle('Free UTM Generator tool - Create UTM parameters'),
    ...getDescription(
      'Generate trackable UTM links in seconds. Add utm_source, utm_medium, utm_campaign and optional utm_content/utm_term, then copy the final URL to measure marketing campaign performance with clean, consistent parameters.',
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

interface UTMParams {
  url: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content?: string
  utm_term?: string
}

const FAQ_ITEMS = [
  {
    question: 'What are UTM parameters?',
    answer:
      'UTM (Urchin Tracking Module) parameters are tags you add to URLs to track the effectiveness of online marketing campaigns. They help you understand where your traffic comes from and how users interact with your campaigns.',
  },
  {
    question: 'What are the 5 UTM parameters?',
    answer:
      'The 5 UTM parameters are: utm_source (identifies the source like Google, Facebook), utm_medium (marketing medium like email, cpc), utm_campaign (specific campaign name), utm_content (differentiates similar content), and utm_term (identifies paid search keywords).',
  },
  {
    question: 'When should I use UTM parameters?',
    answer:
      'Use UTM parameters when running advertising campaigns on Google or social media, employing strategies to draw readers and potential clients, or when sending newsletters to monitor their effectiveness.',
  },
  {
    question: 'What is utm_source?',
    answer:
      'utm_source identifies the source of your traffic such as a search engine (google), newsletter (newsletter), or social network (facebook).',
  },
  {
    question: 'What is utm_medium?',
    answer:
      'utm_medium identifies the marketing medium such as email, cpc (cost-per-click), social, referral, or banner.',
  },
  {
    question: 'What is utm_campaign?',
    answer:
      'utm_campaign identifies a specific product promotion or strategic campaign such as spring_sale, launch_2024, or black_friday.',
  },
  {
    question: 'What is utm_content?',
    answer:
      'utm_content is used to differentiate similar content or links within the same ad. For example, if you have two CTA links in the same email, you can use utm_content to track which one performs better.',
  },
  {
    question: 'What is utm_term?',
    answer:
      'utm_term is mainly used for paid search to identify keywords for your ad. You can use it to track which keywords generate the most traffic and conversions.',
  },
  {
    question: 'Can I track UTM parameters in Swetrix?',
    answer:
      'Yes! Swetrix automatically tracks and analyzes UTM parameters from your URLs, providing detailed insights into your marketing campaigns performance, conversion rates, and user behavior across different traffic sources.',
  },
]

export default function UTMGenerator() {
  const [params, setParams] = useState<UTMParams>({
    url: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_content: '',
    utm_term: '',
  })
  const [generatedURL, setGeneratedURL] = useState('')
  const [copied, setCopied] = useState(false)

  const handleParamChange = (key: keyof UTMParams, value: string) => {
    const newParams = { ...params, [key]: value }

    // If URL field is being updated, try to extract UTM parameters from it
    if (key === 'url' && value) {
      try {
        const url = new URL(
          value.startsWith('http') ? value : `https://${value}`,
        )
        const urlParams = new URLSearchParams(url.search)

        // Extract UTM parameters and populate the fields
        if (urlParams.has('utm_source'))
          newParams.utm_source = urlParams.get('utm_source') || ''
        if (urlParams.has('utm_medium'))
          newParams.utm_medium = urlParams.get('utm_medium') || ''
        if (urlParams.has('utm_campaign'))
          newParams.utm_campaign = urlParams.get('utm_campaign') || ''
        if (urlParams.has('utm_content'))
          newParams.utm_content = urlParams.get('utm_content') || ''
        if (urlParams.has('utm_term'))
          newParams.utm_term = urlParams.get('utm_term') || ''
      } catch {
        // If URL parsing fails, that's fine, just keep the URL as is
      }
    }

    setParams(newParams)
    generateURL(newParams)
  }

  const generateURL = (currentParams: UTMParams) => {
    if (!currentParams.url) {
      setGeneratedURL('')
      return
    }

    try {
      let baseURL = currentParams.url
      if (!baseURL.startsWith('http://') && !baseURL.startsWith('https://')) {
        baseURL = `https://${baseURL}`
      }

      const url = new URL(baseURL)

      url.searchParams.delete('utm_source')
      url.searchParams.delete('utm_medium')
      url.searchParams.delete('utm_campaign')
      url.searchParams.delete('utm_content')
      url.searchParams.delete('utm_term')

      if (currentParams.utm_source) {
        url.searchParams.set('utm_source', currentParams.utm_source)
      }
      if (currentParams.utm_medium) {
        url.searchParams.set('utm_medium', currentParams.utm_medium)
      }
      if (currentParams.utm_campaign) {
        url.searchParams.set('utm_campaign', currentParams.utm_campaign)
      }
      if (currentParams.utm_content) {
        url.searchParams.set('utm_content', currentParams.utm_content)
      }
      if (currentParams.utm_term) {
        url.searchParams.set('utm_term', currentParams.utm_term)
      }

      setGeneratedURL(url.toString())
    } catch {
      setGeneratedURL('')
    }
  }

  const copyToClipboard = async () => {
    if (!generatedURL) return

    try {
      await navigator.clipboard.writeText(generatedURL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Using native <details>/<summary> for FAQ to ensure content is present in the DOM for SEO

  const sourceExamples = [
    'google',
    'facebook',
    'twitter',
    'newsletter',
    'linkedin',
  ]
  const mediumExamples = ['cpc', 'email', 'social', 'referral', 'banner']
  const campaignExamples = ['spring_sale', 'product_launch', 'black_friday']

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-slate-950'>
      <main className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <ToolsNavMobile className='mb-6 lg:hidden' />

        <div className='lg:flex lg:items-start lg:gap-8'>
          <div className='min-w-0 lg:flex-1'>
            <Text as='h1' size='4xl' weight='bold' tracking='tight'>
              UTM Link Generator
            </Text>
            <Text as='p' size='lg' colour='muted' className='mt-4'>
              Create trackable URLs with UTM parameters to measure your
              marketing campaigns effectively
            </Text>

            <div className='mt-12 rounded-xl bg-white p-8 ring-1 ring-gray-200 dark:bg-slate-800 dark:ring-slate-700'>
              <div className='space-y-6'>
                <div>
                  <h2 className='mb-6 text-2xl font-semibold text-gray-900 dark:text-white'>
                    Build your UTM link
                  </h2>

                  <div className='space-y-6'>
                    <Input
                      type='text'
                      placeholder='https://example.com/page'
                      label='Your URL address'
                      value={params.url}
                      onChange={(e) => handleParamChange('url', e.target.value)}
                      className='w-full'
                    />

                    <div className='grid gap-6 md:grid-cols-2'>
                      <div>
                        <h3 className='mb-4 text-lg font-medium text-gray-900 dark:text-white'>
                          Campaign parameters
                        </h3>

                        <div className='space-y-4'>
                          <div>
                            <Input
                              type='text'
                              placeholder={sourceExamples.join(', ')}
                              label={
                                <>
                                  Campaign source
                                  <Tooltip
                                    className='ml-1'
                                    text='Identifies the source of your traffic (e.g., google, facebook, newsletter)'
                                  />
                                </>
                              }
                              value={params.utm_source}
                              onChange={(e) =>
                                handleParamChange('utm_source', e.target.value)
                              }
                              className='w-full'
                            />
                          </div>

                          <div>
                            <Input
                              type='text'
                              placeholder={mediumExamples.join(', ')}
                              label={
                                <>
                                  Campaign medium
                                  <Tooltip
                                    className='ml-1'
                                    text='Identifies the marketing medium (e.g., email, cpc, social, referral)'
                                  />
                                </>
                              }
                              value={params.utm_medium}
                              onChange={(e) =>
                                handleParamChange('utm_medium', e.target.value)
                              }
                              className='w-full'
                            />
                          </div>

                          <div>
                            <Input
                              type='text'
                              placeholder={campaignExamples.join(', ')}
                              label={
                                <>
                                  Campaign name
                                  <Tooltip
                                    className='ml-1'
                                    text='Identifies a specific campaign (e.g., spring_sale, product_launch)'
                                  />
                                </>
                              }
                              value={params.utm_campaign}
                              onChange={(e) =>
                                handleParamChange(
                                  'utm_campaign',
                                  e.target.value,
                                )
                              }
                              className='w-full'
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className='mb-4 text-lg font-medium text-gray-900 dark:text-white'>
                          Optional parameters
                        </h3>

                        <div className='space-y-4'>
                          <div>
                            <Input
                              type='text'
                              placeholder='link, landing page'
                              label={
                                <>
                                  Campaign content
                                  <Tooltip
                                    className='ml-1'
                                    text='Used to differentiate similar content or links within the same ad'
                                  />
                                </>
                              }
                              value={params.utm_content}
                              onChange={(e) =>
                                handleParamChange('utm_content', e.target.value)
                              }
                              className='w-full'
                            />
                          </div>

                          <div>
                            <Input
                              type='text'
                              placeholder='free, -30%, registration'
                              value={params.utm_term}
                              label={
                                <>
                                  Campaign term
                                  <Tooltip
                                    className='ml-1'
                                    text='Used for paid search to identify keywords for your ad'
                                  />
                                </>
                              }
                              onChange={(e) =>
                                handleParamChange('utm_term', e.target.value)
                              }
                              className='w-full'
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className='border-t border-gray-200 pt-6 dark:border-gray-700'>
                  <h3 className='mb-4 text-lg font-medium text-gray-900 dark:text-white'>
                    Result
                  </h3>
                  <div className='flex flex-col items-center gap-2 md:flex-row'>
                    <Input
                      type='text'
                      value={
                        generatedURL || 'Your UTM link will appear here...'
                      }
                      readOnly
                      className='w-full font-mono text-sm tracking-tight'
                      disabled={!generatedURL}
                    />
                    <Button
                      onClick={copyToClipboard}
                      disabled={!generatedURL}
                      primary
                      regular
                    >
                      <CopyIcon className='mr-1 h-4 w-4' />
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </div>
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

          <aside className='hidden lg:sticky lg:top-12 lg:block lg:w-64 lg:shrink-0 lg:self-start'>
            <ToolsNav />
          </aside>
        </div>
      </main>
    </div>
  )
}
