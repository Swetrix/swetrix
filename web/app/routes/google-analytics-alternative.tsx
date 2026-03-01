import {
  CheckIcon,
  CookieIcon,
  DatabaseIcon,
  GaugeIcon,
  GlobeIcon,
  ShieldCheckIcon,
  LightningIcon,
  ArrowRightIcon,
  StarIcon,
  XIcon,
  GithubLogoIcon,
} from '@phosphor-icons/react'
import { useTranslation, Trans } from 'react-i18next'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { Link, redirect, useLoaderData } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'
import { ClientOnly } from 'remix-utils/client-only'

import Header from '~/components/Header'
import useBreakpoint from '~/hooks/useBreakpoint'
import {
  LIVE_DEMO_URL,
  TRIAL_DAYS,
  isDisableMarketingPages,
  isSelfhosted,
} from '~/lib/constants'
import { useTheme } from '~/providers/ThemeProvider'
import { cn } from '~/utils/generic'
import routes from '~/utils/routes'
import { getGeneralStats } from '~/api/api.server'
import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import FAQ from '~/components/marketing/FAQ'
import { FeedbackDual } from './_index'
import MarketingPricing from '~/components/pricing/MarketingPricing'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'
import { FeaturesGrid } from '~/components/marketing/FeaturesGrid'

export const meta: MetaFunction = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation('common')

  return [
    ...getTitle(t('titles.gaAlternative')),
    ...getDescription(t('description.default')),
    ...getPreviewImage(),
  ]
}

export const sitemap: SitemapFunction = () => ({
  priority: 0.9,
  exclude: isSelfhosted || isDisableMarketingPages,
})

export async function loader({ request }: LoaderFunctionArgs) {
  if (isSelfhosted || isDisableMarketingPages) {
    return redirect('/login', 302)
  }

  const stats = await getGeneralStats(request)

  return { stats }
}

const REVIEWERS = [
  { name: 'Luke', image: '/assets/small-testimonials/luke.jpg' },
  { name: 'Alex', image: '/assets/small-testimonials/alex.jpg' },
  { name: 'Artur', image: '/assets/small-testimonials/artur.jpg' },
  { name: 'Alper', image: '/assets/small-testimonials/alper.jpg' },
  { name: 'Andrii', image: '/assets/small-testimonials/andrii.jpg' },
]

const Testimonials = ({ className }: { className?: string }) => {
  const { t } = useTranslation('common')
  const { stats } = useLoaderData<typeof loader>()

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 md:flex-row',
        className,
      )}
    >
      <div className='flex -space-x-5 overflow-hidden'>
        {REVIEWERS.map(({ name, image }) => (
          <div
            key={`${name}${image}`}
            className='relative inline-flex size-12 overflow-hidden rounded-full border-4 border-white dark:border-slate-800'
          >
            <img
              alt={name}
              width='400'
              height='400'
              loading='lazy'
              src={image}
            />
          </div>
        ))}
      </div>
      <div className='mt-1 flex flex-col items-center justify-center gap-1 md:items-start'>
        <div
          className='relative inline-flex'
          role='img'
          aria-label='5 out of 5 stars'
        >
          <StarIcon
            className='size-5 text-yellow-500'
            aria-hidden='true'
            weight='fill'
          />
          <StarIcon
            className='size-5 text-yellow-500'
            aria-hidden='true'
            weight='fill'
          />
          <StarIcon
            className='size-5 text-yellow-500'
            aria-hidden='true'
            weight='fill'
          />
          <StarIcon
            className='size-5 text-yellow-500'
            aria-hidden='true'
            weight='fill'
          />
          <StarIcon
            className='size-5 text-yellow-500'
            aria-hidden='true'
            weight='fill'
          />
        </div>
        <div className='text-base text-gray-900/70 dark:text-gray-200'>
          <span className='font-semibold text-gray-900 dark:text-gray-50'>
            {t('gaAlternative.hero.teams', {
              amount: stats?.trials || '> 1000',
            })}
          </span>{' '}
          <span className='text-gray-700 dark:text-gray-200'>
            {t('gaAlternative.hero.ditched')}
          </span>
        </div>
      </div>
    </div>
  )
}

const LiveDemoPreview = () => {
  const { t } = useTranslation('common')
  const { theme } = useTheme()
  const isUpToLg = !useBreakpoint('lg')

  if (isUpToLg) {
    return (
      <div className='relative z-20 mx-auto mt-10 overflow-hidden rounded-xl ring-2 ring-gray-900/10 dark:ring-white/10'>
        <img
          src={
            theme === 'dark'
              ? '/assets/screenshot_dark.png'
              : '/assets/screenshot_light.png'
          }
          className='relative w-full'
          width='100%'
          height='auto'
          alt='Swetrix Analytics dashboard'
        />
        <div className='absolute inset-0 flex items-center justify-center bg-slate-900/20 opacity-100 backdrop-blur-[1px] transition-opacity duration-200'>
          <a
            href={LIVE_DEMO_URL}
            target='_blank'
            rel='noopener noreferrer'
            className='pointer-events-auto inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-black/10 transition-all hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden dark:bg-slate-950 dark:text-white dark:ring-white/10 dark:hover:bg-slate-900 dark:focus-visible:ring-slate-300'
            aria-label={
              t('gaAlternative.hero.viewDemo') + ' (opens in a new tab)'
            }
          >
            <ArrowRightIcon className='mr-2 h-4 w-4' />
            {t('gaAlternative.hero.viewDemo')}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className='group relative -mr-6 ml-auto w-[140%] overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5 transition-shadow ease-out sm:-mr-12 sm:w-[160%] lg:-mr-16 lg:w-[180%] xl:-mr-24 2xl:-mr-32 dark:bg-slate-800 dark:ring-white/10'>
      <div className='pointer-events-none relative h-[580px] lg:h-[640px] xl:h-[700px]'>
        <iframe
          src={`https://swetrix.com/projects/STEzHcB1rALV?tab=traffic&theme=${theme}&embedded=true&lng=en`}
          className='size-full'
          title='Swetrix Analytics Live Demo'
          style={{ pointerEvents: 'none' }}
          tabIndex={-1}
        />
        <div className='pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100'>
          <a
            href={LIVE_DEMO_URL}
            target='_blank'
            rel='noopener noreferrer'
            className='pointer-events-auto inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-black/10 transition-all hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden dark:bg-slate-950 dark:text-white dark:ring-white/10 dark:hover:bg-slate-900 dark:focus-visible:ring-slate-300'
            aria-label={
              t('gaAlternative.hero.viewDemo') + ' (opens in a new tab)'
            }
          >
            <ArrowRightIcon className='mr-2 h-4 w-4' />
            {t('gaAlternative.hero.viewDemo')}
          </a>
        </div>
      </div>
    </div>
  )
}

const Hero = () => {
  const { t } = useTranslation('common')
  return (
    <div className='relative isolate bg-gray-100/80 pt-2 dark:bg-slate-900/50'>
      <div className='relative mx-2 overflow-hidden rounded-4xl'>
        <div aria-hidden className='pointer-events-none absolute inset-0 -z-10'>
          <div className='absolute inset-0 rounded-4xl bg-linear-115 from-amber-100 from-28% via-purple-500 via-70% to-indigo-600 opacity-50 ring-1 ring-black/5 ring-inset sm:bg-linear-145 dark:from-slate-950 dark:opacity-60 dark:ring-white/10' />
          <div className='absolute top-28 -left-24 size-112 rounded-full bg-[radial-gradient(closest-side,#6366f1,transparent)] opacity-25 blur-3xl dark:opacity-20' />
          <div className='absolute -right-16 -bottom-12 size-104 rounded-full bg-[radial-gradient(closest-side,#eef2ff,transparent)] opacity-30 blur-3xl dark:opacity-20' />
        </div>
        <Header transparent />
        <section className='mx-auto max-w-7xl px-4 pt-10 pb-5 sm:px-3 lg:grid lg:grid-cols-12 lg:gap-8 lg:px-6 lg:pt-20 xl:px-8'>
          <div className='z-20 col-span-6 flex flex-col items-start'>
            <h1 className='max-w-5xl text-left text-5xl font-semibold tracking-tight text-pretty text-slate-900 sm:leading-none lg:mt-6 lg:text-6xl xl:text-7xl dark:text-white'>
              {t('gaAlternative.hero.title')}
            </h1>
            <p className='mt-4 max-w-2xl text-left text-lg text-slate-900 dark:text-gray-50'>
              {t('gaAlternative.hero.subtitle')}
            </p>

            <div className='mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center'>
              <Link
                to={routes.signup}
                className='flex h-12 items-center justify-center rounded-md border-2 border-slate-900 bg-slate-900 px-4 text-white transition-all hover:bg-transparent hover:text-slate-900 dark:border-slate-50 dark:bg-gray-50 dark:text-slate-900 dark:hover:text-gray-50'
                aria-label={t('gaAlternative.hero.cta', { count: TRIAL_DAYS })}
              >
                <span className='mr-1 text-center text-base font-semibold'>
                  {t('gaAlternative.hero.cta', { days: TRIAL_DAYS })}
                </span>
                <ArrowRightIcon className='mt-px h-4 w-5' />
              </Link>
            </div>

            <div className='mt-8 grid w-full grid-cols-2 gap-3 text-slate-900 dark:text-gray-50'>
              <div className='flex items-center gap-3 text-sm'>
                <CookieIcon className='size-5' />
                <span>{t('gaAlternative.hero.features.cookieless')}</span>
              </div>
              <div className='flex items-center gap-3 text-sm'>
                <ShieldCheckIcon className='size-5' />
                <span>{t('gaAlternative.hero.features.privacy')}</span>
              </div>
              <div className='flex items-center gap-3 text-sm'>
                <GaugeIcon className='size-5' />
                <span>{t('gaAlternative.hero.features.realtime')}</span>
              </div>
              <div className='flex items-center gap-3 text-sm'>
                <CheckIcon className='size-5' />
                <span>{t('gaAlternative.hero.features.noSampling')}</span>
              </div>
              <div className='flex items-center gap-3 text-sm'>
                <DatabaseIcon className='size-5' />
                <span>{t('gaAlternative.hero.features.ownData')}</span>
              </div>
              <div className='flex items-center gap-3 text-sm'>
                <GithubLogoIcon className='size-5' />
                <span>{t('gaAlternative.hero.features.openSource')}</span>
              </div>
            </div>

            <Testimonials className='mt-8 hidden lg:block' />
          </div>

          <div className='col-span-6 mt-10 overflow-visible lg:mt-0 lg:mr-0 lg:ml-4'>
            <ClientOnly
              fallback={
                <div className='h-[240px] w-full rounded-2xl bg-slate-800/10 ring-1 ring-black/5 sm:h-[320px] md:h-[580px] lg:h-[640px] xl:h-[700px] dark:bg-slate-800/20 dark:ring-white/10' />
              }
            >
              {() => <LiveDemoPreview />}
            </ClientOnly>
          </div>

          <Testimonials className='mt-8 lg:hidden' />
        </section>
      </div>
    </div>
  )
}

const COMPARISON_KEYS = [
  'cookieless',
  'privacy',
  'realtime',
  'noSampling',
  'ui',
  'publicDashboards',
  'openSource',
  'selfHosting',
  'webVitals',
]

const ComparisonTable = () => {
  const { t } = useTranslation('common')
  return (
    <section className='relative mx-auto max-w-7xl px-2 py-14 lg:px-8'>
      <div className='mx-auto max-w-3xl text-center'>
        <h2 className='text-4xl font-bold text-slate-900 sm:text-5xl dark:text-white'>
          {t('gaAlternative.comparison.title')}
        </h2>
        <p className='mt-4 text-lg text-slate-700 dark:text-gray-200'>
          {t('gaAlternative.comparison.subtitle')}
        </p>
      </div>

      <div className='mt-10 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 dark:bg-slate-950 dark:ring-white/10'>
        <div className='overflow-x-auto'>
          <table className='w-full min-w-[760px] border-separate border-spacing-0'>
            <caption className='sr-only'>
              {t('gaAlternative.comparison.title')}
            </caption>
            <thead>
              <tr className='bg-slate-50 dark:bg-slate-950/40'>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-gray-50'>
                  {t('gaAlternative.comparison.table.headers.whatMatters')}
                </th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-gray-50'>
                  {t('gaAlternative.comparison.table.headers.swetrix')}
                </th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-gray-50'>
                  {t('gaAlternative.comparison.table.headers.ga')}
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_KEYS.map((key, idx) => (
                <tr
                  key={key}
                  className={cn(
                    'border-t border-slate-200 dark:border-white/10',
                    idx % 2 === 1
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-slate-50/40 dark:bg-slate-950/10',
                  )}
                >
                  <td className='px-6 py-4 text-sm font-medium text-slate-900 dark:text-gray-50'>
                    {t(`gaAlternative.comparison.table.rows.${key}.label`)}
                  </td>
                  <td className='px-6 py-4 text-sm text-slate-700 dark:text-gray-200'>
                    <span className='inline-flex items-center gap-2'>
                      <CheckIcon className='size-4 text-emerald-600 dark:text-emerald-400' />
                      {t(`gaAlternative.comparison.table.rows.${key}.swetrix`)}
                    </span>
                  </td>
                  <td className='px-6 py-4 text-sm text-slate-700 dark:text-gray-200'>
                    <span className='inline-flex items-center gap-2'>
                      <XIcon className='size-4 text-rose-600 dark:text-rose-400' />
                      {t(`gaAlternative.comparison.table.rows.${key}.ga`)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className='mt-6 text-center text-sm text-slate-600 dark:text-gray-300'>
        {t('gaAlternative.comparison.footer')}
      </div>
    </section>
  )
}

const WhySwitch = () => {
  const { t } = useTranslation('common')
  return (
    <section className='relative mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-28'>
      <div className='grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16'>
        {/* Left column - headline and primary benefit */}
        <div className='lg:col-span-5'>
          <p className='text-sm font-medium tracking-wide text-indigo-600 uppercase dark:text-indigo-400'>
            {t('gaAlternative.whySwitch.label')}
          </p>
          <h2 className='mt-3 text-3xl leading-snug font-bold tracking-tight text-slate-900 sm:text-4xl sm:leading-snug dark:text-white'>
            <Trans
              i18nKey='gaAlternative.whySwitch.title'
              components={{
                1: (
                  <span className='rounded-md bg-slate-900 px-2 py-0.5 text-white dark:bg-white dark:text-slate-900' />
                ),
              }}
            />
          </h2>
          <p className='mt-5 text-base leading-relaxed text-slate-600 dark:text-slate-300'>
            {t('gaAlternative.whySwitch.subtitle')}
          </p>

          {/* Primary benefit - visually distinct */}
          <div className='mt-10 border-l-2 border-indigo-500 pl-6'>
            <div className='flex items-center gap-2'>
              <ShieldCheckIcon
                className='size-5 text-indigo-600 dark:text-indigo-400'
                weight='duotone'
              />
              <h3 className='text-lg font-semibold text-slate-900 dark:text-white'>
                {t('gaAlternative.whySwitch.privacy.title')}
              </h3>
            </div>
            <p className='mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400'>
              {t('gaAlternative.whySwitch.privacy.description')}
            </p>
          </div>
        </div>

        {/* Right column - secondary benefits */}
        <div className='lg:col-span-7 lg:pt-16'>
          <div className='space-y-10'>
            <div>
              <h3 className='flex items-center gap-2.5 text-lg font-semibold text-slate-900 dark:text-white'>
                <GlobeIcon
                  className='size-5 text-indigo-600 dark:text-indigo-400'
                  weight='duotone'
                />
                {t('gaAlternative.whySwitch.understandable.title')}
              </h3>
              <p className='mt-2 text-sm leading-relaxed text-slate-600 lg:pl-7 dark:text-slate-400'>
                {t('gaAlternative.whySwitch.understandable.description')}
              </p>
            </div>

            <div className='lg:pl-8'>
              <h3 className='flex items-center gap-2.5 text-lg font-semibold text-slate-900 dark:text-white'>
                <LightningIcon
                  className='size-5 text-amber-500 dark:text-amber-400'
                  weight='duotone'
                />
                {t('gaAlternative.whySwitch.actionable.title')}
              </h3>
              <p className='mt-2 text-sm leading-relaxed text-slate-600 lg:pl-7 dark:text-slate-400'>
                {t('gaAlternative.whySwitch.actionable.description')}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className='mt-12 flex flex-wrap items-baseline gap-x-10 gap-y-4'>
            <div>
              <span className='text-3xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white'>
                &lt;5KB
              </span>
              <span className='ml-2 text-sm text-slate-500 dark:text-slate-400'>
                {t('gaAlternative.whySwitch.stats.size')}
              </span>
            </div>
            <div>
              <span className='text-3xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white'>
                100%
              </span>
              <span className='ml-2 text-sm text-slate-500 dark:text-slate-400'>
                {t('gaAlternative.whySwitch.stats.accurate')}
              </span>
            </div>
            <div>
              <span className='text-3xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white'>
                0
              </span>
              <span className='ml-2 text-sm text-slate-500 dark:text-slate-400'>
                {t('gaAlternative.whySwitch.stats.cookies')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const Migration = () => {
  const { t } = useTranslation('common')
  return (
    <section className='relative mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-28'>
      <div className='grid grid-cols-1 gap-16 lg:grid-cols-2'>
        <div>
          <p className='text-sm font-medium tracking-wide text-indigo-600 uppercase dark:text-indigo-400'>
            {t('gaAlternative.migration.label')}
          </p>
          <h2 className='mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white'>
            {t('gaAlternative.migration.title')}
          </h2>
          <p className='mt-5 text-base leading-relaxed text-slate-600 dark:text-slate-300'>
            {t('gaAlternative.migration.subtitle')}
          </p>

          <div className='mt-10 space-y-8'>
            <div className='border-l-2 border-slate-200 pl-6 dark:border-slate-700'>
              <span className='inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300'>
                1
              </span>
              <h3 className='mt-2 text-base font-semibold text-slate-900 dark:text-white'>
                {t('gaAlternative.migration.steps.1.title')}
              </h3>
              <p className='mt-1 text-sm text-slate-600 dark:text-slate-400'>
                {t('gaAlternative.migration.steps.1.description')}
              </p>
            </div>

            <div className='border-l-2 border-slate-200 pl-6 dark:border-slate-700'>
              <span className='inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300'>
                2
              </span>
              <h3 className='mt-2 text-base font-semibold text-slate-900 dark:text-white'>
                {t('gaAlternative.migration.steps.2.title')}
              </h3>
              <p className='mt-1 text-sm text-slate-600 dark:text-slate-400'>
                {t('gaAlternative.migration.steps.2.description')}
              </p>
            </div>

            <div className='border-l-2 border-indigo-500 pl-6'>
              <span className='inline-block rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'>
                3
              </span>
              <h3 className='mt-2 text-base font-semibold text-slate-900 dark:text-white'>
                {t('gaAlternative.migration.steps.3.title')}
              </h3>
              <p className='mt-1 text-sm text-slate-600 dark:text-slate-400'>
                {t('gaAlternative.migration.steps.3.description')}
              </p>
            </div>
          </div>
        </div>

        <div className='flex flex-col justify-center lg:pl-8'>
          <div className='overflow-hidden rounded-xl bg-slate-900 p-1 ring-1 ring-white/10'>
            <div className='flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5'>
              <span className='size-2.5 rounded-full bg-red-500/80' />
              <span className='size-2.5 rounded-full bg-yellow-500/80' />
              <span className='size-2.5 rounded-full bg-green-500/80' />
              <span className='ml-3 text-xs text-slate-400'>index.html</span>
            </div>
            <div className='p-4 font-mono text-sm leading-relaxed'>
              <div className='text-slate-500'>
                {"<!-- That's it. Really. -->"}
              </div>
              <div className='mt-2'>
                <span className='text-pink-400'>{'<script '}</span>
                <span className='text-purple-400'>src</span>
                <span className='text-slate-400'>=</span>
                <span className='text-amber-300'>
                  "https://swetrix.org/swetrix.js"
                </span>
                <span className='text-sky-300'> defer</span>
                <span className='text-pink-400'>{'></script>'}</span>
              </div>
              <div className='mt-1'>
                <span className='text-pink-400'>{'<script>'}</span>
              </div>
              <div className='pl-4'>
                <span className='text-sky-300'>document</span>
                <span className='text-slate-400'>.</span>
                <span className='text-amber-300'>addEventListener</span>
                <span className='text-slate-400'>(</span>
                <span className='text-emerald-400'>'DOMContentLoaded'</span>
                <span className='text-slate-400'>,</span>
                <span className='text-sky-300'> function</span>
                <span className='text-slate-400'> {'() {'}</span>
              </div>
              <div className='pl-8'>
                <span className='text-sky-300'>swetrix</span>
                <span className='text-slate-400'>.</span>
                <span className='text-amber-300'>init</span>
                <span className='text-slate-400'>(</span>
                <span className='text-emerald-400'>'YOUR_PROJECT_ID'</span>
                <span className='text-slate-400'>)</span>
              </div>
              <div className='pl-8'>
                <span className='text-sky-300'>swetrix</span>
                <span className='text-slate-400'>.</span>
                <span className='text-amber-300'>trackViews</span>
                <span className='text-slate-400'>()</span>
              </div>
              <div className='pl-4'>
                <span className='text-slate-400'>{'}'}</span>
                <span className='text-slate-400'>)</span>
              </div>
              <div>
                <span className='text-pink-400'>{'</script>'}</span>
              </div>
            </div>
          </div>

          <div className='mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-slate-600 dark:text-slate-400'>
            <div className='flex items-center gap-2'>
              <CheckIcon className='size-4 text-emerald-600 dark:text-emerald-400' />
              <span>{t('gaAlternative.migration.stats.size')}</span>
            </div>
            <div className='flex items-center gap-2'>
              <CheckIcon className='size-4 text-emerald-600 dark:text-emerald-400' />
              <span>{t('gaAlternative.migration.stats.cookies')}</span>
            </div>
            <div className='flex items-center gap-2'>
              <CheckIcon className='size-4 text-emerald-600 dark:text-emerald-400' />
              <span>{t('gaAlternative.migration.stats.privacy')}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function GoogleAnalyticsAlternativeRoute() {
  return (
    <div className='overflow-hidden'>
      <main className='bg-gray-50 dark:bg-slate-950'>
        <Hero />
        <FeedbackDual />
        <FeaturesGrid />
        <WhySwitch />
        <ComparisonTable />
        <Migration />
        <MarketingPricing />
        <FAQ includeGAQuestions />
        <DitchGoogle />
      </main>
    </div>
  )
}
