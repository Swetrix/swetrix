import NumberFlow from '@number-flow/react'
import {
  ArrowRightIcon,
  BuildingsIcon,
  CodeIcon,
  CookieIcon,
  EnvelopeSimpleIcon,
  GlobeIcon,
  LockKeyIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  StarIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import _map from 'lodash/map'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useEffect, useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { redirect, useLoaderData } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'
import { ClientOnly } from 'remix-utils/client-only'

import { getGeneralStats, serverFetch } from '~/api/api.server'
import Header from '~/components/Header'
import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import FAQ from '~/components/marketing/FAQ'
import { FeaturesGrid } from '~/components/marketing/FeaturesGrid'
import { LogoCloud } from '~/components/marketing/LogoCloud'
import MarketingPricing from '~/components/pricing/MarketingPricing'
import {
  FLOW_TIMING,
  FLOW_VALUE_CLASS,
  useFlowValue,
} from '~/hooks/useFlowValue'
import useBreakpoint from '~/hooks/useBreakpoint'
import {
  LIVE_DEMO_URL,
  TRIAL_DAYS,
  isDisableMarketingPages,
  isSelfhosted,
  localisePath,
} from '~/lib/constants'
import { DEFAULT_METAINFO, Metainfo } from '~/lib/models/Metainfo'
import { useTheme } from '~/providers/ThemeProvider'
import Button from '~/ui/Button'
import { Link } from '~/ui/Link'
import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'
import routes from '~/utils/routes'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

import { FeedbackDual } from './_index'

export const meta: MetaFunction = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation('common')

  return [
    ...getTitle(t('titles.agencies')),
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

  const [metainfoResult, stats] = await Promise.all([
    serverFetch<Metainfo>(request, 'user/metainfo', { skipAuth: true }),
    getGeneralStats(request),
  ])

  return {
    metainfo: metainfoResult.data ?? DEFAULT_METAINFO,
    stats,
  }
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

const HERO_TRUST = [
  { key: 'oneWorkspace', Icon: BuildingsIcon },
  { key: 'whiteLabel', Icon: GlobeIcon },
  { key: 'gdpr', Icon: ShieldCheckIcon },
] as const

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
            {t('agencies.hero.title')}
          </Text>
          <Text
            as='p'
            size='lg'
            className='mx-auto mt-5 max-w-2xl text-center leading-8 text-gray-50'
          >
            {t('agencies.hero.subtitle')}
          </Text>

          <div className='mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center'>
            <Link
              to={routes.signup}
              className='inline-flex h-12 items-center justify-center rounded-md bg-white px-5 text-slate-950 shadow-lg ring-1 shadow-slate-950/20 ring-white/30 transition-[transform,background-color] duration-150 ease-out-quint hover:bg-gray-100 active:scale-[0.97]'
              aria-label={t('agencies.hero.cta', { days: TRIAL_DAYS })}
            >
              <span className='text-center text-base font-semibold'>
                {t('agencies.hero.cta', { days: TRIAL_DAYS })}
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
              aria-label={`${t('agencies.hero.viewDemo')} (opens in a new tab)`}
            >
              {t('agencies.hero.viewDemo')}
            </Button>
          </div>

          <div className='mt-8 flex max-w-3xl flex-wrap justify-center gap-x-12 gap-y-3 text-gray-50'>
            {HERO_TRUST.map(({ key, Icon }) => (
              <div
                key={key}
                className='flex items-center gap-2 text-sm whitespace-nowrap'
              >
                <Icon className='size-5 shrink-0' weight='duotone' />
                <span>{t(`agencies.hero.trust.${key}`)}</span>
              </div>
            ))}
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

const AgencyWorkspace = () => {
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
            {t('agencies.workspace.label')}
          </Text>
          <Text
            as='h2'
            size='3xl'
            weight='bold'
            tracking='tight'
            className='mt-3 leading-snug sm:text-4xl sm:leading-snug'
          >
            <Trans
              i18nKey='agencies.workspace.title'
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
            {t('agencies.workspace.subtitle')}
          </Text>

          {/* Primary benefit - visually distinct */}
          <div className='mt-10 border-l-2 border-indigo-500 pl-6'>
            <div className='flex items-center gap-2'>
              <BuildingsIcon
                className='size-5 text-indigo-600 dark:text-indigo-400'
                weight='duotone'
              />
              <Text as='h3' size='lg' weight='semibold'>
                {t('agencies.workspace.primary.title')}
              </Text>
            </div>
            <Text
              as='p'
              size='sm'
              className='mt-2 leading-relaxed text-slate-600 dark:text-slate-400'
            >
              {t('agencies.workspace.primary.description')}
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
                <UsersThreeIcon
                  className='size-5 text-indigo-600 dark:text-indigo-400'
                  weight='duotone'
                />
                {t('agencies.workspace.roles.title')}
              </Text>
              <Text
                as='p'
                size='sm'
                className='mt-2 leading-relaxed text-slate-600 lg:pl-7 dark:text-slate-400'
              >
                {t('agencies.workspace.roles.description')}
              </Text>
            </div>

            <div className='lg:pl-8'>
              <Text
                as='h3'
                size='lg'
                weight='semibold'
                className='flex items-center gap-2.5'
              >
                <ReceiptIcon
                  className='size-5 text-emerald-500 dark:text-emerald-400'
                  weight='duotone'
                />
                {t('agencies.workspace.billing.title')}
              </Text>
              <Text
                as='p'
                size='sm'
                className='mt-2 leading-relaxed text-slate-600 lg:pl-7 dark:text-slate-400'
              >
                {t('agencies.workspace.billing.description')}
              </Text>
            </div>
          </div>

          {/* Concrete plan facts, not vanity numbers */}
          <div className='mt-12 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-200 pt-6 text-sm text-slate-600 dark:border-white/10 dark:text-slate-400'>
            <span>{t('agencies.workspace.stats.sites')}</span>
            <span aria-hidden className='text-slate-300 dark:text-slate-600'>
              &middot;
            </span>
            <span>{t('agencies.workspace.stats.members')}</span>
            <span aria-hidden className='text-slate-300 dark:text-slate-600'>
              &middot;
            </span>
            <span>{t('agencies.workspace.stats.invoice')}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

const WHITE_LABEL_POINTS = [
  { key: 'branded', Icon: GlobeIcon, accent: true },
  { key: 'embed', Icon: CodeIcon, accent: false },
  { key: 'reports', Icon: EnvelopeSimpleIcon, accent: false },
] as const

const WhiteLabelReporting = () => {
  const { t } = useTranslation('common')
  return (
    <section className='relative mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-28'>
      <div className='grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16'>
        <div className='lg:col-span-5'>
          <Text
            as='p'
            size='sm'
            weight='medium'
            tracking='wide'
            className='text-indigo-600 uppercase dark:text-indigo-400'
          >
            {t('agencies.whiteLabel.label')}
          </Text>
          <Text
            as='h2'
            size='3xl'
            weight='bold'
            tracking='tight'
            className='mt-3 sm:text-4xl'
          >
            {t('agencies.whiteLabel.title')}
          </Text>
          <Text
            as='p'
            size='base'
            className='mt-5 max-w-xl leading-relaxed text-slate-600 dark:text-slate-300'
          >
            {t('agencies.whiteLabel.subtitle')}
          </Text>

          <div className='mt-8'>
            <Link
              to={routes.signup}
              className='inline-flex h-12 items-center justify-center rounded-md border-2 border-slate-900 bg-slate-900 px-5 text-white transition-[transform,background-color,color] duration-150 ease-out-quint hover:bg-transparent hover:text-slate-900 active:scale-[0.97] dark:border-slate-50 dark:bg-gray-50 dark:text-slate-900 dark:hover:bg-transparent dark:hover:text-gray-50'
              aria-label={t('agencies.whiteLabel.cta')}
            >
              <span className='text-center text-base font-semibold'>
                {t('agencies.whiteLabel.cta')}
              </span>
              <ArrowRightIcon className='mt-px ml-1 h-4 w-5' />
            </Link>
          </div>
        </div>

        <div className='lg:col-span-7 lg:pt-2'>
          <div className='space-y-8'>
            {WHITE_LABEL_POINTS.map(({ key, Icon, accent }) => (
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
                  {t(`agencies.whiteLabel.points.${key}.title`)}
                </Text>
                <Text
                  as='p'
                  size='sm'
                  className='mt-1.5 leading-relaxed text-slate-600 lg:pl-7 dark:text-slate-400'
                >
                  {t(`agencies.whiteLabel.points.${key}.description`)}
                </Text>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

const COMPLIANCE_POINTS = [
  { key: 'gdpr', Icon: ShieldCheckIcon, className: 'text-indigo-500' },
  { key: 'cookieless', Icon: CookieIcon, className: 'text-emerald-500' },
  { key: 'residency', Icon: LockKeyIcon, className: 'text-amber-500' },
] as const

const Compliance = () => {
  const { t } = useTranslation('common')
  return (
    <section className='relative mx-auto max-w-7xl px-4 py-16 sm:py-20 lg:px-8'>
      <div className='mx-auto max-w-3xl text-center'>
        <Text
          as='p'
          size='sm'
          weight='medium'
          tracking='wide'
          className='text-indigo-600 uppercase dark:text-indigo-400'
        >
          {t('agencies.compliance.label')}
        </Text>
        <Text
          as='h2'
          size='3xl'
          weight='bold'
          tracking='tight'
          className='mt-3 sm:text-4xl'
        >
          {t('agencies.compliance.title')}
        </Text>
        <Text
          as='p'
          size='lg'
          className='mt-4 leading-8 text-slate-600 dark:text-slate-300'
        >
          {t('agencies.compliance.subtitle')}
        </Text>
      </div>

      <div className='mt-14 grid grid-cols-1 gap-x-10 gap-y-10 sm:mt-16 sm:grid-cols-3'>
        {COMPLIANCE_POINTS.map(({ key, Icon, className }) => (
          <div key={key}>
            <div className='flex items-center gap-2'>
              <Icon
                weight='duotone'
                className={cn('size-5 shrink-0', className)}
                aria-hidden='true'
              />
              <Text as='h3' weight='semibold'>
                {t(`agencies.compliance.points.${key}.title`)}
              </Text>
            </div>
            <Text
              as='p'
              size='sm'
              colour='secondary'
              className='mt-2 pl-7 leading-relaxed'
            >
              {t(`agencies.compliance.points.${key}.description`)}
            </Text>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function AgenciesRoute() {
  const { metainfo } = useLoaderData<typeof loader>()

  return (
    <div className='overflow-hidden'>
      <main className='bg-gray-50 dark:bg-slate-950'>
        <Hero />
        <LogoCloud />
        <AgencyWorkspace />
        <WhiteLabelReporting />
        <FeedbackDual />
        <FeaturesGrid />
        <Compliance />
        <MarketingPricing metainfo={metainfo} />
        <FAQ includeAgencyQuestions />
        <DitchGoogle />
      </main>
    </div>
  )
}
