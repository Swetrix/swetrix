import { ArrowRightIcon, SparklesIcon, CheckIcon } from 'lucide-react'
import { Link, redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import { isSelfhosted } from '~/lib/constants'

export const sitemap: SitemapFunction = () => ({
  priority: 0.9,
  exclude: isSelfhosted,
})

export async function loader() {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  return null
}

const TOOLS = [
  {
    title: 'IP Lookup',
    description:
      'Find detailed geolocation information about any IP address including country, city, coordinates, and timezone',
    href: '/tools/ip-lookup',
    color: 'from-cyan-500 to-blue-600',
    features: [
      'IP Geolocation',
      'Country & City',
      'Timezone Detection',
      'Interactive Map',
    ],
  },
  {
    title: 'ROI Calculator',
    description:
      'Calculate ROAS, ROI, CAC, and other key metrics to measure your marketing campaign performance',
    href: '/tools/roi-calculator',
    color: 'from-green-500 to-emerald-600',
    features: [
      'ROAS & ROI',
      'CAC Analysis',
      'Profit Margins',
      'Break-even Analysis',
    ],
  },
  {
    title: 'CTR Calculator',
    description:
      'Calculate your Click-Through Rate and understand your campaign performance instantly',
    href: '/tools/ctr-calculator',
    color: 'from-blue-500 to-indigo-600',
    features: [
      'CTR Analysis',
      'Performance Insights',
      'Industry Benchmarks',
      'Optimization Tips',
    ],
  },
  {
    title: 'UTM Generator',
    description:
      'Create trackable URLs with UTM parameters to measure your marketing campaigns effectively',
    href: '/tools/utm-generator',
    color: 'from-purple-500 to-pink-600',
    features: [
      'UTM Builder',
      'Campaign Tracking',
      'URL Shortener Compatible',
      'Auto-detection',
    ],
  },
]

export default function Tools() {
  return (
    <div className='min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800'>
      <main className='mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8'>
        <div className='text-center'>
          <div className='mb-8 inline-flex items-center rounded-full bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'>
            <SparklesIcon className='mr-2 h-4 w-4' />
            100% Free Marketing Tools
          </div>

          <h1 className='text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl dark:text-white'>
            Free Marketing Tools for
            <span className='block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent'>
              Better Results
            </span>
          </h1>

          <p className='mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400'>
            Professional marketing calculators and generators to optimize your
            campaigns, track performance, and maximize ROI. No sign-up required.
          </p>
        </div>

        <div className='mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3'>
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              to={tool.href}
              className='group relative overflow-hidden rounded-2xl bg-white p-8 ring-1 ring-gray-200 transition-all dark:bg-slate-800 dark:ring-slate-700'
            >
              <div className='relative'>
                <h3 className='mb-2 text-2xl font-bold text-gray-900 dark:text-white'>
                  {tool.title}
                </h3>

                <p className='mb-6 text-gray-600 dark:text-gray-400'>
                  {tool.description}
                </p>

                <div className='mb-6 space-y-2'>
                  {tool.features.map((feature) => (
                    <div
                      key={feature}
                      className='flex items-center text-sm text-gray-600 dark:text-gray-400'
                    >
                      <CheckIcon className='mr-2 h-4 w-4 text-green-500' />
                      {feature}
                    </div>
                  ))}
                </div>

                <div className='flex items-center text-sm font-medium text-indigo-600 transition-colors group-hover:text-indigo-700 dark:text-indigo-400 dark:group-hover:text-indigo-300'>
                  Use Tool
                  <ArrowRightIcon className='ml-1 h-4 w-4 transition-transform group-hover:translate-x-1' />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <DitchGoogle />
      </main>
    </div>
  )
}
