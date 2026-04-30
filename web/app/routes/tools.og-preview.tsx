import { useState } from 'react'
import type { MetaFunction } from 'react-router'
import { redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import { ToolsNav, ToolsNavMobile } from '~/components/ToolsNav'
import { getOgImageUrl, isSelfhosted } from '~/lib/constants'
import Input from '~/ui/Input'
import Textarea from '~/ui/Textarea'
import { FAQ } from '~/ui/FAQ'
import { Text } from '~/ui/Text'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

export const meta: MetaFunction = () => {
  const title = 'Free Open Graph Preview Tool - Preview Social Media Cards'
  const description =
    'Preview how your website looks when shared on Twitter/X, Facebook, and LinkedIn. Test your Open Graph meta tags and Twitter Cards instantly. Free OG preview tool with live rendering.'
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
    question: 'What are Open Graph tags?',
    answer:
      'Open Graph (OG) tags are HTML meta tags that control how your website content appears when shared on social media platforms like Facebook, Twitter/X, LinkedIn, and messaging apps. They define the title, description, image, and URL shown in the social media card preview.',
  },
  {
    question: 'Why are Open Graph tags important for SEO?',
    answer:
      'While Open Graph tags do not directly affect search engine rankings, they significantly impact click-through rates from social media. Well-optimized OG tags with compelling titles, descriptions, and images lead to more clicks, shares, and engagement, which can indirectly boost SEO through increased traffic and brand visibility.',
  },
  {
    question: 'What is the ideal Open Graph image size?',
    answer:
      'The recommended Open Graph image size is 1200×630 pixels (1.91:1 ratio) for optimal display across all platforms. Facebook recommends at least 600×315 pixels, while Twitter/X Cards work best with 1200×628 pixels. Always use high-quality images under 5MB in PNG or JPG format.',
  },
  {
    question:
      'What is the difference between Open Graph tags and Twitter Cards?',
    answer:
      'Open Graph tags (og:title, og:description, og:image) are used by Facebook, LinkedIn, and most platforms. Twitter Cards (twitter:card, twitter:title, twitter:description, twitter:image) are Twitter/X specific. Twitter/X will fall back to OG tags if Twitter Card tags are not present, so most sites use both for maximum compatibility.',
  },
  {
    question: 'What Open Graph tags should every page have?',
    answer:
      'Every page should include at minimum: og:title (page title), og:description (brief summary), og:image (preview image URL), og:url (canonical URL), and og:type (usually "website" or "article"). For Twitter/X, also add twitter:card (usually "summary_large_image").',
  },
  {
    question: 'How do I debug Open Graph tags on my site?',
    answer:
      "Use this preview tool to see how your OG tags will render. For live debugging, use Facebook's Sharing Debugger (developers.facebook.com/tools/debug), Twitter/X Card Validator, and LinkedIn Post Inspector. These tools also let you clear cached previews after updating your tags.",
  },
  {
    question: 'Why is my Open Graph image not showing?',
    answer:
      'Common reasons include: the image URL is not absolute (must start with https://), the image is too small (minimum 200×200 pixels), the server blocks crawlers, the image format is unsupported, or the platform has cached an old version. Use platform-specific debuggers to clear the cache.',
  },
  {
    question: 'Can Swetrix help track social media traffic?',
    answer:
      'Yes! Swetrix tracks referral sources including social media platforms, so you can see how much traffic comes from Facebook, Twitter/X, LinkedIn, and other platforms. Combined with UTM parameters, you can measure the exact impact of your social sharing strategy.',
  },
]

type Platform = 'google' | 'facebook' | 'twitter' | 'linkedin'

interface OGInputs {
  title: string
  description: string
  url: string
  imageUrl: string
  siteName: string
}

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'google', label: 'Google' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'twitter', label: 'Twitter / X' },
  { id: 'linkedin', label: 'LinkedIn' },
]

function GooglePreview({ inputs }: { inputs: OGInputs }) {
  const displayUrl = inputs.url || 'example.com'
  const breadcrumb = (() => {
    try {
      const url = new URL(
        displayUrl.startsWith('http') ? displayUrl : `https://${displayUrl}`,
      )
      return (
        url.hostname +
        (url.pathname !== '/'
          ? ` › ${url.pathname.slice(1).replace(/\//g, ' › ')}`
          : '')
      )
    } catch {
      return displayUrl
    }
  })()

  return (
    <div className='max-w-[600px] font-sans'>
      <div className='text-sm text-gray-600 dark:text-gray-400'>
        {breadcrumb}
      </div>
      <div className='mt-0.5 text-xl leading-snug text-blue-700 hover:underline dark:text-blue-400'>
        {inputs.title || 'Page Title'}
      </div>
      <div className='mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400'>
        {inputs.description ||
          'Page description will appear here. Add a compelling description to improve click-through rates from search results.'}
      </div>
    </div>
  )
}

function FacebookPreview({ inputs }: { inputs: OGInputs }) {
  const domain = (() => {
    try {
      const url = new URL(
        (inputs.url || 'https://example.com').startsWith('http')
          ? inputs.url
          : `https://${inputs.url}`,
      )
      return url.hostname
    } catch {
      return 'example.com'
    }
  })()

  return (
    <div className='max-w-[500px] overflow-hidden rounded-lg border border-gray-300 bg-white dark:border-slate-700 dark:bg-slate-950'>
      <div className='aspect-[1.91/1] w-full bg-gray-200 dark:bg-slate-900'>
        {inputs.imageUrl ? (
          <img
            src={inputs.imageUrl}
            alt='OG Preview'
            className='h-full w-full object-cover'
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className='flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500'>
            1200 × 630 image preview
          </div>
        )}
      </div>
      <div className='p-3'>
        <div className='text-xs tracking-wide text-gray-500 uppercase dark:text-gray-400'>
          {domain}
        </div>
        <div className='mt-1 leading-snug font-semibold text-gray-900 dark:text-white'>
          {inputs.title || 'Page Title'}
        </div>
        <div className='mt-0.5 line-clamp-2 text-sm text-gray-500 dark:text-gray-400'>
          {inputs.description || 'Page description will appear here...'}
        </div>
      </div>
    </div>
  )
}

function TwitterPreview({ inputs }: { inputs: OGInputs }) {
  const domain = (() => {
    try {
      const url = new URL(
        (inputs.url || 'https://example.com').startsWith('http')
          ? inputs.url
          : `https://${inputs.url}`,
      )
      return url.hostname
    } catch {
      return 'example.com'
    }
  })()

  return (
    <div className='max-w-[500px] overflow-hidden rounded-2xl border border-gray-300 dark:border-slate-700'>
      <div className='aspect-2/1 w-full bg-gray-200 dark:bg-slate-900'>
        {inputs.imageUrl ? (
          <img
            src={inputs.imageUrl}
            alt='Twitter Card Preview'
            className='h-full w-full object-cover'
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className='flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500'>
            1200 × 600 image preview
          </div>
        )}
      </div>
      <div className='bg-white p-3 dark:bg-slate-950'>
        <div className='text-sm text-gray-500 dark:text-gray-400'>{domain}</div>
        <div className='mt-0.5 leading-snug font-medium text-gray-900 dark:text-white'>
          {inputs.title || 'Page Title'}
        </div>
        <div className='mt-0.5 line-clamp-2 text-sm text-gray-500 dark:text-gray-400'>
          {inputs.description || 'Page description will appear here...'}
        </div>
      </div>
    </div>
  )
}

function LinkedInPreview({ inputs }: { inputs: OGInputs }) {
  return (
    <div className='max-w-[500px] overflow-hidden rounded-lg border border-gray-300 bg-white dark:border-slate-700 dark:bg-slate-950'>
      <div className='aspect-[1.91/1] w-full bg-gray-200 dark:bg-slate-900'>
        {inputs.imageUrl ? (
          <img
            src={inputs.imageUrl}
            alt='LinkedIn Preview'
            className='h-full w-full object-cover'
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className='flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500'>
            1200 × 627 image preview
          </div>
        )}
      </div>
      <div className='p-3'>
        <div className='leading-snug font-semibold text-gray-900 dark:text-white'>
          {inputs.title || 'Page Title'}
        </div>
        <div className='mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400'>
          {inputs.description || 'Page description will appear here...'}
        </div>
      </div>
    </div>
  )
}

export default function OGPreview() {
  const [inputs, setInputs] = useState<OGInputs>({
    title: '',
    description: '',
    url: '',
    imageUrl: '',
    siteName: '',
  })
  const [platform, setPlatform] = useState<Platform>('google')

  const handleChange = (key: keyof OGInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-slate-950'>
      <main className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <ToolsNavMobile className='mb-6 lg:hidden' />

        <div className='lg:flex lg:items-start lg:gap-8'>
          <div className='min-w-0 lg:flex-1'>
            <Text as='h1' size='4xl' weight='bold' tracking='tight'>
              Open Graph Preview
            </Text>
            <Text as='p' size='lg' colour='muted' className='mt-4'>
              Preview how your website looks when shared on Google, Facebook,
              Twitter/X, and LinkedIn
            </Text>

            <div className='mt-12 rounded-lg bg-white p-8 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
              <div className='space-y-6'>
                <Text as='h2' size='2xl' weight='semibold'>
                  Enter your Open Graph data
                </Text>

                <div className='space-y-4'>
                  <Input
                    type='text'
                    placeholder='My Awesome Page - Brand Name'
                    label='og:title'
                    value={inputs.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className='w-full'
                  />
                  <Textarea
                    placeholder='A compelling description of your page content that makes people want to click...'
                    label='og:description'
                    value={inputs.description}
                    onChange={(e) =>
                      handleChange('description', e.target.value)
                    }
                  />
                  <div className='grid gap-4 md:grid-cols-2'>
                    <Input
                      type='text'
                      placeholder='https://example.com/page'
                      label='og:url'
                      value={inputs.url}
                      onChange={(e) => handleChange('url', e.target.value)}
                      className='w-full'
                    />
                    <Input
                      type='text'
                      placeholder='My Brand'
                      label='og:site_name'
                      value={inputs.siteName}
                      onChange={(e) => handleChange('siteName', e.target.value)}
                      className='w-full'
                    />
                  </div>
                  <Input
                    type='text'
                    placeholder='https://example.com/images/og-image.jpg'
                    label='og:image'
                    value={inputs.imageUrl}
                    onChange={(e) => handleChange('imageUrl', e.target.value)}
                    className='w-full'
                  />
                </div>

                <div className='border-t border-gray-200 pt-6 dark:border-gray-700'>
                  <Text as='h3' size='lg' weight='medium' className='mb-4'>
                    Preview
                  </Text>

                  <div className='mb-4 flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-slate-900'>
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.id}
                        type='button'
                        onClick={() => setPlatform(p.id)}
                        className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          platform === p.id
                            ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-950 dark:text-white'
                            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className='rounded-lg bg-gray-50 p-6 dark:bg-slate-900'>
                    {platform === 'google' && <GooglePreview inputs={inputs} />}
                    {platform === 'facebook' && (
                      <FacebookPreview inputs={inputs} />
                    )}
                    {platform === 'twitter' && (
                      <TwitterPreview inputs={inputs} />
                    )}
                    {platform === 'linkedin' && (
                      <LinkedInPreview inputs={inputs} />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <section className='mt-20 border-t border-gray-200 pt-16 dark:border-slate-700'>
              <Text as='h2' size='3xl' weight='bold' tracking='tight'>
                Free Open Graph Preview & Social Card Tester
              </Text>
              <Text
                as='p'
                size='lg'
                colour='muted'
                className='mt-4 leading-relaxed'
              >
                Test and preview your Open Graph meta tags before publishing.
                See exactly how your pages will look when shared on Facebook,
                Twitter/X, LinkedIn, and in Google search results. Our free OG
                preview tool helps you optimize social media cards, improve
                click-through rates, and ensure your content looks professional
                across every platform.
              </Text>

              <div className='mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2'>
                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    Why Preview OG Tags?
                  </Text>
                  <ul className='mt-3 space-y-2'>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          First impressions matter
                        </Text>{' '}
                        - Your social card is the first thing people see when
                        your link is shared. A well-crafted preview dramatically
                        increases clicks.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Platform differences
                        </Text>{' '}
                        - Each platform renders social cards differently.
                        Preview across Google, Facebook, Twitter/X, and LinkedIn
                        to ensure consistency.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Catch issues early
                        </Text>{' '}
                        - Spot truncated titles, missing images, or broken
                        descriptions before your content goes live.
                      </Text>
                    </li>
                  </ul>
                </div>
                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    OG Tag Best Practices
                  </Text>
                  <ul className='mt-3 space-y-2'>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Title length
                        </Text>{' '}
                        - Keep og:title under 60 characters to avoid truncation
                        on most platforms.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Description length
                        </Text>{' '}
                        - og:description should be 120-160 characters for
                        optimal display across platforms.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Image dimensions
                        </Text>{' '}
                        - Use 1200×630 pixels at a 1.91:1 aspect ratio. Always
                        use absolute URLs starting with https://.
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
