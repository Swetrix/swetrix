import { CaretDownIcon, CodeIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import type { MetaFunction } from 'react-router'
import { redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import { ToolsNav, ToolsNavMobile } from '~/components/ToolsNav'
import { isSelfhosted } from '~/lib/constants'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import Textarea from '~/ui/Textarea'
import CodeBlock from '~/ui/CodeBlock'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

export const meta: MetaFunction = () => {
  return [
    ...getTitle('Free Meta Tags & Open Graph Generator - Swetrix'),
    ...getDescription(
      'Generate perfect HTML meta tags, Open Graph for Facebook/LinkedIn, and Twitter Cards to make your links look great when shared on social media.',
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

const FAQ_ITEMS = [
  {
    question: 'What are Meta Tags?',
    answer:
      "Meta tags are snippets of text that describe a page's content. They don't appear on the page itself, but only in the page's source code. They help tell search engines what a web page is about.",
  },
  {
    question: 'What is Open Graph?',
    answer:
      'The Open Graph protocol enables any web page to become a rich object in a social graph. It was created by Facebook and is now used by LinkedIn, Slack, Discord, and others to display link previews with images, titles, and descriptions.',
  },
  {
    question: 'What are Twitter Cards?',
    answer:
      'Twitter Cards make it possible to attach media experiences to Tweets that link to your content. Simply add a few lines of HTML to your webpage, and users who Tweet links to your content will have a "Card" added to the Tweet that\'s visible to all of their followers.',
  },
  {
    question: 'Where do I put these generated tags?',
    answer:
      "You should place the generated HTML code inside the <head> section of your webpage's HTML document. If you use a CMS like WordPress, Webflow, or Shopify, there are usually plugins or settings sections dedicated to SEO where you can input these details without touching the code.",
  },
]

interface MetaData {
  title: string
  description: string
  url: string
  imageUrl: string
  siteName: string
  twitterHandle: string
}

export default function MetaTagsGenerator() {
  const [data, setData] = useState<MetaData>({
    title: 'Swetrix - Privacy-focused web analytics',
    description:
      'Cookie-less, open source, and privacy-focused web analytics alternative to Google Analytics.',
    url: 'https://swetrix.com',
    imageUrl: 'https://swetrix.com/assets/seo/banner.png',
    siteName: 'Swetrix',
    twitterHandle: '@Swetrix',
  })

  const handleDataChange = (key: keyof MetaData, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }))
  }

  const generateHTML = () => {
    const { title, description, url, imageUrl, siteName, twitterHandle } = data
    return `<!-- Primary Meta Tags -->
<title>${title}</title>
<meta name="title" content="${title}" />
<meta name="description" content="${description}" />

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website" />
<meta property="og:url" content="${url}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
${imageUrl ? `<meta property="og:image" content="${imageUrl}" />\n` : ''}${siteName ? `<meta property="og:site_name" content="${siteName}" />\n` : ''}
<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image" />
<meta property="twitter:url" content="${url}" />
<meta property="twitter:title" content="${title}" />
<meta property="twitter:description" content="${description}" />
${imageUrl ? `<meta property="twitter:image" content="${imageUrl}" />\n` : ''}${twitterHandle ? `<meta name="twitter:site" content="${twitterHandle.startsWith('@') ? twitterHandle : `@${twitterHandle}`}" />` : ''}`
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-slate-950'>
      <main className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <ToolsNavMobile className='mb-6 xl:hidden' />

        <div className='xl:flex xl:items-start xl:gap-8'>
          <div className='min-w-0 xl:flex-1'>
            <Text as='h1' size='4xl' weight='bold' tracking='tight'>
              Meta Tags & Open Graph Generator
            </Text>
            <Text as='p' size='lg' colour='muted' className='mt-4'>
              Create perfect SEO and social media meta tags for your website.
            </Text>

            <div className='mt-12 grid gap-8 lg:grid-cols-2'>
              {/* Input Section */}
              <div className='rounded-xl bg-white p-6 ring-1 ring-gray-200 dark:bg-slate-800 dark:ring-slate-700'>
                <h2 className='mb-6 text-xl font-semibold text-gray-900 dark:text-white'>
                  Page Information
                </h2>
                <div className='space-y-4'>
                  <Input
                    type='text'
                    label='Page Title'
                    placeholder='My Awesome Website'
                    value={data.title}
                    onChange={(e) => handleDataChange('title', e.target.value)}
                    className='w-full'
                    maxLength={60}
                  />
                  <div className='mt-[-10px] flex justify-end'>
                    <span
                      className={`text-xs ${data.title.length > 60 ? 'text-red-500' : 'text-gray-500'}`}
                    >
                      {data.title.length}/60 recommended
                    </span>
                  </div>

                  <div>
                    <Textarea
                      label='Page Description'
                      placeholder='This is the best website ever created.'
                      value={data.description}
                      onChange={(e) =>
                        handleDataChange('description', e.target.value)
                      }
                      rows={3}
                    />
                    <div className='mt-1 flex justify-end'>
                      <span
                        className={`text-xs ${data.description.length > 160 ? 'text-red-500' : 'text-gray-500'}`}
                      >
                        {data.description.length}/160 recommended
                      </span>
                    </div>
                  </div>

                  <Input
                    type='text'
                    label='Page URL'
                    placeholder='https://example.com'
                    value={data.url}
                    onChange={(e) => handleDataChange('url', e.target.value)}
                    className='w-full'
                  />

                  <Input
                    type='text'
                    label={
                      <>
                        Image URL
                        <Tooltip
                          className='ml-1'
                          text='Absolute URL for the preview image (1200x630px recommended)'
                        />
                      </>
                    }
                    placeholder='https://example.com/image.jpg'
                    value={data.imageUrl}
                    onChange={(e) =>
                      handleDataChange('imageUrl', e.target.value)
                    }
                    className='w-full'
                  />

                  <div className='grid grid-cols-2 gap-4'>
                    <Input
                      type='text'
                      label='Site Name'
                      placeholder='MySite'
                      value={data.siteName}
                      onChange={(e) =>
                        handleDataChange('siteName', e.target.value)
                      }
                      className='w-full'
                    />
                    <Input
                      type='text'
                      label='Twitter Handle'
                      placeholder='@username'
                      value={data.twitterHandle}
                      onChange={(e) =>
                        handleDataChange('twitterHandle', e.target.value)
                      }
                      className='w-full'
                    />
                  </div>
                </div>
              </div>

              {/* Code Output Section */}
              <div className='flex h-[600px] flex-col rounded-xl bg-slate-900 p-6 ring-1 ring-slate-800'>
                <div className='mb-4 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <CodeIcon className='h-5 w-5 text-gray-400' />
                    <h3 className='text-lg font-medium text-white'>
                      Generated HTML
                    </h3>
                  </div>
                </div>

                <div className='flex-1 overflow-auto rounded-lg'>
                  <CodeBlock code={generateHTML()} />
                </div>
              </div>
            </div>

            {/* Social Preview section (Simplified) */}
            <div className='mt-8 rounded-xl bg-white p-6 ring-1 ring-gray-200 dark:bg-slate-800 dark:ring-slate-700'>
              <h2 className='mb-6 text-xl font-semibold text-gray-900 dark:text-white'>
                Social Preview Example (Twitter/X)
              </h2>
              <div className='mx-auto max-w-md overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-slate-900'>
                {data.imageUrl ? (
                  <div className='aspect-[1.91/1] w-full overflow-hidden bg-gray-100 dark:bg-slate-800'>
                    <img
                      src={data.imageUrl}
                      alt='Preview'
                      className='h-full w-full object-cover'
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                        ;(
                          e.target as HTMLImageElement
                        ).parentElement!.classList.add(
                          'flex',
                          'items-center',
                          'justify-center',
                        )
                        ;(
                          e.target as HTMLImageElement
                        ).parentElement!.innerHTML =
                          '<span class="text-gray-400">Invalid Image URL</span>'
                      }}
                    />
                  </div>
                ) : (
                  <div className='flex aspect-[1.91/1] w-full items-center justify-center bg-gray-100 dark:bg-slate-800'>
                    <span className='text-gray-400'>No image provided</span>
                  </div>
                )}
                <div className='border-t border-gray-200 p-3 dark:border-gray-700'>
                  <p className='truncate text-sm text-gray-500 dark:text-gray-400'>
                    {data.url
                      ? new URL(
                          data.url.startsWith('http')
                            ? data.url
                            : `https://${data.url}`,
                        ).hostname
                      : 'example.com'}
                  </p>
                  <p className='mt-0.5 truncate font-semibold text-gray-900 dark:text-white'>
                    {data.title || 'Page Title'}
                  </p>
                  <p className='mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400'>
                    {data.description || 'Page description goes here...'}
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <section className='mt-20 border-t border-gray-200 pt-16 dark:border-slate-700'>
              <Text as='h2' size='3xl' weight='bold' tracking='tight'>
                Free Meta Tags & Open Graph Generator
              </Text>
              <Text
                as='p'
                size='lg'
                colour='muted'
                className='mt-4 leading-relaxed'
              >
                Ensure your website looks professional when shared on social
                media and ranks well in search engines. Our free generator
                creates perfectly formatted HTML code for standard SEO meta
                tags, Facebook Open Graph protocol, and Twitter Cards.
              </Text>

              <div className='mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2'>
                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    Why Meta Tags are Important
                  </Text>
                  <ul className='mt-3 space-y-2'>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Search Engine Optimization
                        </Text>{' '}
                        - Title and description tags directly impact your
                        click-through rate from Google search results.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Social Sharing
                        </Text>{' '}
                        - Open Graph and Twitter Card tags control the image,
                        title, and description shown when someone links your
                        site on social platforms.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Brand Consistency
                        </Text>{' '}
                        - Custom meta tags guarantee that your brand's messaging
                        is presented exactly how you want it, everywhere.
                      </Text>
                    </li>
                  </ul>
                </div>
                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    Tips for Great Meta Tags
                  </Text>
                  <ul className='mt-3 space-y-2'>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Character Limits
                        </Text>{' '}
                        - Keep titles under 60 characters and descriptions under
                        160 characters to avoid truncation in search results.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Image Sizing
                        </Text>{' '}
                        - Use high-quality images with an aspect ratio of 1.91:1
                        (recommended size: 1200x630 pixels) for the best social
                        previews.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Compelling Copy
                        </Text>{' '}
                        - Write descriptions that act as a call-to-action,
                        encouraging users to click through to your site.
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
