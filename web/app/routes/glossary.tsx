import { ArrowRightIcon } from '@phosphor-icons/react'
import { redirect, type MetaFunction } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { glossaryItems, type GlossaryItem } from '~/data/glossary'
import {
  getOgImageUrl,
  isDisableMarketingPages,
  isSelfhosted,
} from '~/lib/constants'
import { Badge } from '~/ui/Badge'
import Button from '~/ui/Button'
import { Link } from '~/ui/Link'
import { Text } from '~/ui/Text'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

const title = 'Web Analytics Glossary'
const description =
  'A clear web analytics glossary for marketers, founders, and developers. Learn common website metrics, traffic sources, attribution terms, privacy concepts, SEO terms, and conversion analytics definitions.'

const recommendedSlugs = [
  'web-analytics',
  'bounce-rate',
  'conversion-rate',
  'utm-code',
  'traffic-channel',
  'gdpr',
] as const

const glossaryBySlug = new Map(glossaryItems.map((item) => [item.slug, item]))

const groupedItems = glossaryItems
  .slice()
  .sort((a, b) => a.title.localeCompare(b.title))
  .reduce<Record<string, GlossaryItem[]>>((groups, item) => {
    const letter = item.title.charAt(0).toUpperCase()
    groups[letter] = groups[letter] || []
    groups[letter].push(item)
    return groups
  }, {})

const recommendedItems = recommendedSlugs
  .map((slug) => glossaryBySlug.get(slug))
  .filter((item): item is GlossaryItem => Boolean(item))

const letters = Object.keys(groupedItems).sort((a, b) => a.localeCompare(b))

export const meta: MetaFunction = () => [
  ...getTitle(title),
  ...getDescription(description),
  ...getPreviewImage(getOgImageUrl(title, description)),
]

export const sitemap: SitemapFunction = () => ({
  priority: 0.8,
  exclude: isSelfhosted || isDisableMarketingPages,
})

export async function loader() {
  if (isSelfhosted || isDisableMarketingPages) {
    return redirect('/dashboard', 302)
  }

  return null
}

export default function Glossary() {
  return (
    <div className='bg-gray-50 dark:bg-slate-950'>
      <main className='mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16'>
        <header className='border-b border-gray-200 pb-10 dark:border-slate-800'>
          <div className='max-w-3xl'>
            <Badge label='Glossary' colour='slate' />
            <Text as='h1' weight='bold' className='mt-5 text-4xl text-pretty'>
              Web Analytics Glossary
            </Text>
            <Text
              as='p'
              size='lg'
              colour='secondary'
              className='mt-5 max-w-2xl leading-8 text-pretty'
            >
              Plain definitions for the web analytics metrics, privacy terms,
              traffic sources, attribution concepts, SEO language, and
              conversion signals used by modern website analytics teams.
            </Text>
          </div>

          <dl className='mt-8 flex flex-wrap gap-x-10 gap-y-5 border-t border-gray-200 pt-6 dark:border-slate-800'>
            <div>
              <Text as='dt' size='xs' colour='secondary' weight='medium'>
                Terms
              </Text>
              <Text
                as='dd'
                size='lg'
                weight='semibold'
                className='mt-1 tabular-nums'
              >
                {glossaryItems.length}
              </Text>
            </div>
            <div>
              <Text as='dt' size='xs' colour='secondary' weight='medium'>
                Coverage
              </Text>
              <Text as='dd' size='lg' weight='semibold' className='mt-1'>
                Metrics to privacy
              </Text>
            </div>
            <div>
              <Text as='dt' size='xs' colour='secondary' weight='medium'>
                Updated
              </Text>
              <Text as='dd' size='lg' weight='semibold' className='mt-1'>
                June 2026
              </Text>
            </div>
          </dl>
        </header>

        <section className='mt-12'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
            <div>
              <Text as='h2' size='2xl' weight='bold'>
                Recommended first reads
              </Text>
              <Text as='p' colour='secondary' className='mt-2 max-w-2xl'>
                Start here if you want the shortest route from raw visitor
                activity to analytics you can act on.
              </Text>
            </div>
            <Link
              to='#all-terms'
              className='group inline-flex max-w-max items-center text-sm font-medium text-slate-900 transition-colors duration-150 ease-out hover:text-slate-700 dark:text-slate-100 dark:hover:text-white'
            >
              View all terms
              <ArrowRightIcon className='ml-1.5 size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5' />
            </Link>
          </div>

          <div className='mt-6 divide-y divide-gray-200 border-y border-gray-200 dark:divide-slate-800 dark:border-slate-800'>
            {recommendedItems.map((item, index) => (
              <Link
                key={item.slug}
                to={`/glossary/${item.slug}`}
                className='group flex gap-4 py-4 transition-colors duration-150 ease-out hover:bg-gray-100/70 sm:gap-6 dark:hover:bg-slate-900/70'
              >
                <Text
                  as='span'
                  size='sm'
                  colour='secondary'
                  className='w-6 shrink-0 pt-0.5 tabular-nums'
                >
                  {String(index + 1).padStart(2, '0')}
                </Text>
                <div className='min-w-0 flex-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Text as='h3' size='lg' weight='semibold'>
                      {item.title}
                    </Text>
                    <Badge label={item.category} colour='slate' size='sm' />
                  </div>
                  <Text
                    as='p'
                    size='sm'
                    colour='secondary'
                    className='mt-1.5 max-w-3xl leading-6'
                  >
                    {item.description}
                  </Text>
                </div>
                <ArrowRightIcon className='mt-1 size-4 shrink-0 text-gray-700 opacity-60 transition-[opacity,transform] duration-150 ease-out group-hover:translate-x-0.5 group-hover:opacity-100 dark:text-gray-200' />
              </Link>
            ))}
          </div>
        </section>

        <section id='all-terms' className='mt-14'>
          <div className='border-b border-gray-200 pb-5 dark:border-slate-800'>
            <div>
              <Text as='h2' size='2xl' weight='bold'>
                All glossary terms
              </Text>
              <Text
                as='p'
                colour='secondary'
                className='mt-2 max-w-2xl leading-7'
              >
                An alphabetical index of Swetrix glossary entries for website
                analytics, product analytics, privacy-first measurement, and
                conversion tracking.
              </Text>
            </div>
          </div>

          <div className='divide-y divide-gray-200 dark:divide-slate-800'>
            {letters.map((letter) => (
              <section
                key={letter}
                className='grid gap-4 py-8 md:grid-cols-[4rem_minmax(0,1fr)]'
              >
                <div>
                  <Text as='h3' size='3xl' weight='bold' colour='secondary'>
                    {letter}
                  </Text>
                </div>

                <div className='divide-y divide-gray-200 dark:divide-slate-800'>
                  {groupedItems[letter].map((item) => (
                    <Link
                      key={item.slug}
                      to={`/glossary/${item.slug}`}
                      className='group flex gap-4 py-4 first:pt-0 last:pb-0'
                    >
                      <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <Text as='h4' weight='semibold'>
                            {item.title}
                          </Text>
                          <Badge
                            label={item.category}
                            colour='slate'
                            size='sm'
                            className='hidden sm:inline-flex'
                          />
                        </div>
                        <Text
                          as='p'
                          size='sm'
                          colour='secondary'
                          className='mt-1.5 max-w-3xl leading-6'
                        >
                          {item.description}
                        </Text>
                      </div>
                      <ArrowRightIcon className='mt-1 size-4 shrink-0 text-gray-700 opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover:translate-x-0.5 group-hover:opacity-100 sm:opacity-50 dark:text-gray-200' />
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>

        <section className='mt-14 border-t border-gray-200 pt-8 dark:border-slate-800'>
          <div className='flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <Text as='h2' size='2xl' weight='bold'>
                Measure it without the surveillance baggage
              </Text>
              <Text
                as='p'
                colour='secondary'
                className='mt-2 max-w-2xl leading-7'
              >
                Swetrix tracks traffic, conversions, funnels, custom events,
                performance, errors, and revenue with privacy-first analytics.
              </Text>
            </div>
            <div className='flex flex-wrap gap-3'>
              <Button to='/signup' className='active:scale-[0.97]'>
                Start free trial
                <ArrowRightIcon className='ml-1.5 size-4' />
              </Button>
              <Button
                to='/'
                variant='secondary'
                className='active:scale-[0.97]'
              >
                Learn more
              </Button>
            </div>
          </div>
        </section>
      </main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'DefinedTermSet',
            name: title,
            description,
            url: 'https://swetrix.com/glossary',
            hasDefinedTerm: glossaryItems.map((item) => ({
              '@type': 'DefinedTerm',
              name: item.title,
              description: item.description,
              url: `https://swetrix.com/glossary/${item.slug}`,
            })),
          })
            .replace(/</g, '\\u003c')
            .replace(/\u2028|\u2029/g, ''),
        }}
      />
    </div>
  )
}
