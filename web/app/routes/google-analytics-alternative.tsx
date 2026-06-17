import NumberFlow from '@number-flow/react'
import {
  CheckIcon,
  CodeIcon,
  DownloadSimpleIcon,
  GlobeIcon,
  ShieldCheckIcon,
  LightningIcon,
  ArrowRightIcon,
  StarIcon,
  XIcon,
} from '@phosphor-icons/react'
import _map from 'lodash/map'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useTranslation, Trans } from 'react-i18next'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { Link } from '~/ui/Link'
import { redirect, useLoaderData } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'
import { ClientOnly } from 'remix-utils/client-only'

import Header from '~/components/Header'
import useBreakpoint from '~/hooks/useBreakpoint'
import {
  LIVE_DEMO_URL,
  TRIAL_DAYS,
  isDisableMarketingPages,
  isSelfhosted,
  localisePath,
} from '~/lib/constants'
import { useTheme } from '~/providers/ThemeProvider'
import Button from '~/ui/Button'
import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'
import routes from '~/utils/routes'
import { getGeneralStats } from '~/api/api.server'
import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import FAQ from '~/components/marketing/FAQ'
import { FeedbackDual } from './_index'
import { LogoCloud } from '~/components/marketing/LogoCloud'
import MarketingPricing from '~/components/pricing/MarketingPricing'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'
import { FeaturesGrid } from '~/components/marketing/FeaturesGrid'
import { useEffect, useState } from 'react'
import {
  FLOW_TIMING,
  FLOW_VALUE_CLASS,
  useFlowValue,
} from '~/hooks/useFlowValue'

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

const TrialsFlow = ({ value, locale }: { value: number; locale: string }) => {
  const flowValue = useFlowValue(value)

  return (
    <NumberFlow
      className={FLOW_VALUE_CLASS}
      {...FLOW_TIMING}
      value={flowValue}
      locales={locale}
      willChange
    />
  )
}

/**
 * Wraps the trials count interpolated by <Trans>. The server (and no-JS
 * visitors) get the plain interpolated text; after hydration it swaps to a
 * NumberFlow that rolls up from zero. Content is never hidden without JS.
 * The interpolated text must be formatted with the same locale so the swap
 * is visually seamless.
 */
const TrialsHighlight = ({
  value,
  locale,
  children,
}: {
  value?: number
  locale: string
  children?: React.ReactNode
}) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <span className='font-semibold text-gray-900 dark:text-gray-50'>
      {mounted && value != null ? (
        <TrialsFlow value={value} locale={locale} />
      ) : (
        children
      )}
    </span>
  )
}

const Testimonials = ({ className }: { className?: string }) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { stats } = useLoaderData<typeof loader>()

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 md:flex-row',
        className,
      )}
    >
      <div className='flex -space-x-5 overflow-hidden'>
        {_map(REVIEWERS, ({ name, image }) => (
          <div
            key={`${name}${image}`}
            className='relative inline-flex size-12 overflow-hidden rounded-full border-4 border-gray-50 dark:border-slate-800/90'
          >
            <img
              alt={name}
              width={48}
              height={48}
              loading='lazy'
              className='object-cover'
              style={{ color: 'transparent' }}
              src={image}
            />
          </div>
        ))}
      </div>
      <div className='mt-1 flex flex-col items-center justify-center gap-1 md:items-start'>
        <div className='relative inline-flex'>
          <StarIcon className='size-5 text-yellow-500' weight='fill' />
          <StarIcon className='size-5 text-yellow-500' weight='fill' />
          <StarIcon className='size-5 text-yellow-500' weight='fill' />
          <StarIcon className='size-5 text-yellow-500' weight='fill' />
          <StarIcon className='size-5 text-yellow-500' weight='fill' />
        </div>
        <div className='text-base text-gray-900/70 dark:text-gray-200'>
          <Trans
            values={{
              amount:
                stats?.trials != null
                  ? stats.trials.toLocaleString(language)
                  : '> 1000',
            }}
            t={t}
            i18nKey='main.understandTheirUsers'
          >
            <TrialsHighlight value={stats?.trials} locale={language} />
          </Trans>
        </div>
      </div>
    </div>
  )
}

const LiveDemoPreview = () => {
  const {
    i18n: { language },
  } = useTranslation('common')
  const { theme } = useTheme()
  const isUpToLg = !useBreakpoint('lg')

  if (isUpToLg) {
    return (
      <div className='relative z-20 mx-auto mt-10 overflow-hidden rounded-2xl bg-white/80 p-1.5 shadow-2xl ring-1 shadow-slate-950/20 ring-white/40 backdrop-blur-md dark:bg-slate-950/80 dark:ring-white/10'>
        <img
          src={
            theme === 'dark'
              ? '/assets/screenshot_dark.png'
              : '/assets/screenshot_light.png'
          }
          className='relative h-auto w-full rounded-xl'
          width={2328}
          height={1666}
          alt='Swetrix Analytics dashboard'
        />
      </div>
    )
  }

  const localisedDemoPath = localisePath('/demo', language)

  return (
    <div
      className='relative z-20 mx-auto mt-12 w-full max-w-[1480px] overflow-hidden rounded-2xl bg-white/90 p-2 shadow-2xl ring-1 shadow-slate-950/25 ring-white/40 backdrop-blur-xl dark:bg-slate-950/90 dark:ring-white/10'
      style={{
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        willChange: 'transform',
        contain: 'paint',
      }}
    >
      <div className='relative h-[560px] overflow-hidden rounded-xl bg-slate-950 lg:h-[620px] xl:h-[680px]'>
        <iframe
          src={`https://swetrix.com${localisedDemoPath}?tab=traffic&theme=${theme}&embedded=true`}
          className='size-full rounded-xl'
          title='Swetrix Analytics Live Demo'
          loading='eager'
        />
      </div>
    </div>
  )
}

const HeroParallaxBackground = () => {
  const reduceMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const scale = useTransform(scrollY, [0, 900], [1, 1.08])

  return (
    <motion.div
      className='absolute inset-0 transform-gpu'
      style={
        reduceMotion ? undefined : { scale, transformOrigin: 'center 35%' }
      }
    >
      <picture className='absolute inset-0 block'>
        <source srcSet='/assets/hero-background.avif' type='image/avif' />
        <img
          alt=''
          className='size-full object-cover object-center opacity-95 saturate-125'
          src='/assets/hero-background.webp'
        />
      </picture>
    </motion.div>
  )
}

const Hero = () => {
  const { t } = useTranslation('common')

  return (
    <div className='relative isolate overflow-hidden bg-gray-50 pt-2 dark:bg-slate-950'>
      <div className='relative mx-2 overflow-hidden rounded-t-4xl bg-slate-950 shadow-2xl ring-1 shadow-slate-950/20 ring-black/5 dark:ring-white/10'>
        <div aria-hidden className='pointer-events-none absolute inset-0'>
          <HeroParallaxBackground />
          <div className='absolute inset-0 bg-slate-950/55' />
          <div className='absolute inset-0 bg-radial-[at_50%_0%] from-indigo-300/30 via-slate-950/10 to-slate-950/80' />
          <div className='absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-b from-transparent to-slate-950' />
        </div>
        <Header transparent inverted />
        <section className='relative z-10 mx-auto flex max-w-[1500px] flex-col items-center px-4 pt-14 pb-6 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20'>
          <Text
            as='h1'
            weight='semibold'
            className='mx-auto max-w-5xl text-center text-5xl leading-[0.98] text-balance text-white sm:text-6xl lg:text-7xl'
          >
            {t('gaAlternative.hero.title')}
          </Text>
          <Text
            as='p'
            size='lg'
            className='mx-auto mt-5 max-w-2xl text-center leading-8 text-gray-50'
          >
            {t('gaAlternative.hero.subtitle')}
          </Text>

          <div className='mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center'>
            <Link
              to={routes.signup}
              className='inline-flex h-12 items-center justify-center rounded-md bg-white px-5 text-slate-950 shadow-lg ring-1 shadow-slate-950/20 ring-white/30 transition-colors hover:bg-gray-100'
              aria-label={t('gaAlternative.hero.cta', { days: TRIAL_DAYS })}
            >
              <span className='text-center text-base font-semibold'>
                {t('gaAlternative.hero.cta', { days: TRIAL_DAYS })}
              </span>
              <ArrowRightIcon className='mt-px ml-1 h-4 w-5' />
            </Link>
            <Button
              to={LIVE_DEMO_URL}
              linkProps={{
                target: '_blank',
                rel: 'noopener noreferrer',
              }}
              variant='secondary'
              size='xl'
              className='flex h-12 items-center justify-center border-white/25 bg-white/10 px-5 text-center text-base font-semibold text-white shadow-none ring-white/25 backdrop-blur-md hover:bg-white/20 dark:border-white/25 dark:bg-white/10 dark:text-white dark:hover:bg-white/20'
              aria-label={`${t('gaAlternative.hero.viewDemo')} (opens in a new tab)`}
            >
              {t('gaAlternative.hero.viewDemo')}
            </Button>
          </div>

          <Testimonials className='dark mt-8' />

          <div className='w-full'>
            <ClientOnly
              fallback={
                <div className='mx-auto mt-12 h-[560px] w-full max-w-[1480px] rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-xl lg:h-[620px] xl:h-[680px]' />
              }
            >
              {() => <LiveDemoPreview />}
            </ClientOnly>
          </div>
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
        <Text as='h2' size='4xl' weight='bold' className='sm:text-5xl'>
          {t('gaAlternative.comparison.title')}
        </Text>
        <Text
          as='p'
          size='lg'
          className='mt-4 text-slate-700 dark:text-gray-200'
        >
          {t('gaAlternative.comparison.subtitle')}
        </Text>
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
          <Text
            as='p'
            size='sm'
            weight='medium'
            tracking='wide'
            className='text-indigo-600 uppercase dark:text-indigo-400'
          >
            {t('gaAlternative.whySwitch.label')}
          </Text>
          <Text
            as='h2'
            size='3xl'
            weight='bold'
            tracking='tight'
            className='mt-3 leading-snug sm:text-4xl sm:leading-snug'
          >
            <Trans
              i18nKey='gaAlternative.whySwitch.title'
              components={{
                1: (
                  <span className='rounded-md bg-slate-900 px-2 py-0.5 text-white dark:bg-white dark:text-slate-900' />
                ),
              }}
            />
          </Text>
          <Text
            as='p'
            size='base'
            className='mt-5 leading-relaxed text-slate-600 dark:text-slate-300'
          >
            {t('gaAlternative.whySwitch.subtitle')}
          </Text>

          {/* Primary benefit - visually distinct */}
          <div className='mt-10 border-l-2 border-indigo-500 pl-6'>
            <div className='flex items-center gap-2'>
              <ShieldCheckIcon
                className='size-5 text-indigo-600 dark:text-indigo-400'
                weight='duotone'
              />
              <Text as='h3' size='lg' weight='semibold'>
                {t('gaAlternative.whySwitch.privacy.title')}
              </Text>
            </div>
            <Text
              as='p'
              size='sm'
              className='mt-2 leading-relaxed text-slate-600 dark:text-slate-400'
            >
              {t('gaAlternative.whySwitch.privacy.description')}
            </Text>
          </div>
        </div>

        {/* Right column - secondary benefits */}
        <div className='lg:col-span-7 lg:pt-16'>
          <div className='space-y-10'>
            <div>
              <Text
                as='h3'
                size='lg'
                weight='semibold'
                className='flex items-center gap-2.5'
              >
                <GlobeIcon
                  className='size-5 text-indigo-600 dark:text-indigo-400'
                  weight='duotone'
                />
                {t('gaAlternative.whySwitch.understandable.title')}
              </Text>
              <Text
                as='p'
                size='sm'
                className='mt-2 leading-relaxed text-slate-600 lg:pl-7 dark:text-slate-400'
              >
                {t('gaAlternative.whySwitch.understandable.description')}
              </Text>
            </div>

            <div className='lg:pl-8'>
              <Text
                as='h3'
                size='lg'
                weight='semibold'
                className='flex items-center gap-2.5'
              >
                <LightningIcon
                  className='size-5 text-amber-500 dark:text-amber-400'
                  weight='duotone'
                />
                {t('gaAlternative.whySwitch.actionable.title')}
              </Text>
              <Text
                as='p'
                size='sm'
                className='mt-2 leading-relaxed text-slate-600 lg:pl-7 dark:text-slate-400'
              >
                {t('gaAlternative.whySwitch.actionable.description')}
              </Text>
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

const IMPORT_POINTS = [
  { key: 'history', Icon: DownloadSimpleIcon, accent: true },
  { key: 'script', Icon: CodeIcon, accent: false },
  { key: 'live', Icon: LightningIcon, accent: false },
] as const

const ImportAndMigrate = () => {
  const { t } = useTranslation('common')
  return (
    <section className='relative mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-28'>
      <div className='grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center'>
        <div>
          <Text
            as='p'
            size='sm'
            weight='medium'
            tracking='wide'
            className='text-indigo-600 uppercase dark:text-indigo-400'
          >
            {t('gaAlternative.import.label')}
          </Text>
          <Text
            as='h2'
            size='3xl'
            weight='bold'
            tracking='tight'
            className='mt-3 sm:text-4xl'
          >
            {t('gaAlternative.import.title')}
          </Text>
          <Text
            as='p'
            size='base'
            className='mt-5 max-w-xl leading-relaxed text-slate-600 dark:text-slate-300'
          >
            {t('gaAlternative.import.subtitle')}
          </Text>

          <div className='mt-10 space-y-8'>
            {IMPORT_POINTS.map(({ key, Icon, accent }) => (
              <div
                key={key}
                className={cn(
                  'border-l-2 pl-6',
                  accent
                    ? 'border-indigo-500'
                    : 'border-slate-200 dark:border-slate-700',
                )}
              >
                <Text
                  as='h3'
                  size='base'
                  weight='semibold'
                  className='flex items-center gap-2.5'
                >
                  <Icon
                    className={cn(
                      'size-5',
                      accent
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-500 dark:text-slate-400',
                    )}
                    weight='duotone'
                  />
                  {t(`gaAlternative.import.points.${key}.title`)}
                </Text>
                <Text
                  as='p'
                  size='sm'
                  className='mt-1.5 leading-relaxed text-slate-600 lg:pl-7 dark:text-slate-400'
                >
                  {t(`gaAlternative.import.points.${key}.description`)}
                </Text>
              </div>
            ))}
          </div>
        </div>

        <div className='lg:pl-8'>
          <div className='overflow-hidden rounded-xl bg-slate-950 ring-1 ring-white/10'>
            <div className='border-b border-white/10 px-4 py-2.5'>
              <span className='font-mono text-xs text-slate-400'>
                {t('gaAlternative.import.snippet.filename')}
              </span>
            </div>
            <pre className='overflow-x-auto p-4 font-mono text-sm leading-relaxed text-slate-200'>
              <code>
                <span className='text-indigo-300'>{'<script '}</span>
                <span className='text-sky-300'>src</span>
                <span className='text-slate-400'>=</span>
                <span className='text-emerald-300'>
                  "https://swetrix.org/swetrix.js"
                </span>
                <span className='text-sky-300'> defer</span>
                <span className='text-indigo-300'>{'></script>'}</span>
                {'\n'}
                <span className='text-indigo-300'>{'<script>'}</span>
                {'\n  '}
                <span className='text-sky-300'>swetrix</span>
                <span className='text-slate-400'>.</span>
                <span className='text-amber-300'>init</span>
                <span className='text-slate-400'>(</span>
                <span className='text-emerald-300'>'YOUR_PROJECT_ID'</span>
                <span className='text-slate-400'>)</span>
                {'\n  '}
                <span className='text-sky-300'>swetrix</span>
                <span className='text-slate-400'>.</span>
                <span className='text-amber-300'>trackViews</span>
                <span className='text-slate-400'>()</span>
                {'\n'}
                <span className='text-indigo-300'>{'</script>'}</span>
              </code>
            </pre>
            <div className='border-t border-white/10 px-4 py-2.5 text-xs text-slate-500'>
              {t('gaAlternative.import.snippet.comment')}
            </div>
          </div>

          <div className='mt-8 flex justify-center lg:justify-start'>
            <Link
              to={routes.signup}
              className='inline-flex h-12 items-center justify-center rounded-md border-2 border-slate-900 bg-slate-900 px-5 text-white transition-colors hover:bg-transparent hover:text-slate-900 dark:border-slate-50 dark:bg-gray-50 dark:text-slate-900 dark:hover:bg-transparent dark:hover:text-gray-50'
              aria-label={t('gaAlternative.import.cta')}
            >
              <span className='text-center text-base font-semibold'>
                {t('gaAlternative.import.cta')}
              </span>
              <ArrowRightIcon className='mt-px ml-1 h-4 w-5' />
            </Link>
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
        <LogoCloud />
        <ComparisonTable />
        <WhySwitch />
        <FeedbackDual />
        <FeaturesGrid />
        <ImportAndMigrate />
        <MarketingPricing />
        <FAQ includeGAQuestions />
        <DitchGoogle />
      </main>
    </div>
  )
}
