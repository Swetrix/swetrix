import { ArrowRightIcon } from '@heroicons/react/20/solid'
import type { MetaFunction } from 'react-router'
import { Link, redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import { TOOLS } from '~/components/ToolsNav'
import { isSelfhosted } from '~/lib/constants'
import { Text } from '~/ui/Text'
import { getPreviewImage, getTitle } from '~/utils/seo'

export const meta: MetaFunction = () => {
  return [...getTitle('Free Marketing Tools'), ...getPreviewImage()]
}

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

export default function Tools() {
  return (
    <div className='min-h-screen bg-gray-50 dark:bg-slate-900'>
      <main className='mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8'>
        <div className='max-w-2xl'>
          <Text as='h1' size='4xl' weight='bold' tracking='tight'>
            Free Marketing Tools
          </Text>
          <Text as='p' size='lg' colour='muted' className='mt-4'>
            Professional marketing calculators and generators to optimize your
            campaigns, track performance, and maximize ROI. No sign-up required.
          </Text>
        </div>

        <div className='mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {TOOLS.map((tool) => {
            const Icon = tool.icon

            return (
              <Link
                key={tool.id}
                to={tool.href}
                className='group relative rounded-xl bg-white p-6 ring-1 ring-gray-200 transition-shadow hover:ring-gray-300 dark:bg-slate-800 dark:ring-slate-700 dark:hover:ring-slate-600'
              >
                <div className='flex items-start gap-4'>
                  <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-700'>
                    <Icon className='h-5 w-5 text-gray-600 dark:text-gray-300' />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <Text as='h2' size='lg' weight='semibold'>
                      {tool.title}
                    </Text>
                    <Text as='p' size='sm' colour='muted' className='mt-1'>
                      {tool.description}
                    </Text>
                  </div>
                </div>

                <div className='mt-4 flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400'>
                  Use tool
                  <ArrowRightIcon className='ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5' />
                </div>
              </Link>
            )
          })}
        </div>

        <DitchGoogle />
      </main>
    </div>
  )
}
