import NumberFlow from '@number-flow/react'
import _map from 'lodash/map'
import {
  CookieIcon,
  GaugeIcon,
  GithubLogoIcon,
  ArrowRightIcon,
  StarIcon,
} from '@phosphor-icons/react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import React, { useEffect, useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { Link } from '~/ui/Link'
import { redirect, useLoaderData } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'
import { ClientOnly } from 'remix-utils/client-only'

import { getGeneralStats, serverFetch } from '~/api/api.server'
import Header from '~/components/Header'
import {
  FLOW_TIMING,
  FLOW_VALUE_CLASS,
  useFlowValue,
} from '~/hooks/useFlowValue'
import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import FAQ from '~/components/marketing/FAQ'
import Integrations from '~/components/marketing/Integrations'
import MarketingPricing from '~/components/pricing/MarketingPricing'
import useBreakpoint from '~/hooks/useBreakpoint'
import Button from '~/ui/Button'
import {
  LIVE_DEMO_URL,
  isSelfhosted,
  isDisableMarketingPages,
  localisePath,
} from '~/lib/constants'
import { DEFAULT_METAINFO, Metainfo } from '~/lib/models/Metainfo'
import { useTheme } from '~/providers/ThemeProvider'
import { cn } from '~/utils/generic'
import routesPath from '~/utils/routes'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'
import { FeaturesGrid } from '~/components/marketing/FeaturesGrid'
import { LogoCloud } from '~/components/marketing/LogoCloud'
import { ScrollReveal } from '~/components/marketing/ScrollReveal'
import { WhySwitch } from '~/components/marketing/WhySwitch'
import { Text } from '~/ui/Text'

export const meta: MetaFunction = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation('common')

  return [
    ...getTitle(t('titles.main'), false),
    ...getDescription(t('description.default')),
    ...getPreviewImage(),
  ]
}

export const sitemap: SitemapFunction = () => ({
  priority: 1,
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

interface FeedbackHighlightProps {
  children: React.ReactNode
}

const FeedbackHighlight = ({ children }: FeedbackHighlightProps) => (
  <Text
    as='span'
    colour='primary'
    size='lg'
    className='rounded-sm bg-indigo-600/20 px-0.5 dark:bg-indigo-400/30'
  >
    {children}
  </Text>
)

export const FeedbackDual = () => {
  const { theme } = useTheme()

  return (
    <section className='mx-auto max-w-7xl px-4 py-20 sm:py-24 lg:px-8'>
      <div className='mx-auto grid max-w-2xl grid-cols-1 lg:max-w-none lg:grid-cols-2'>
        <ScrollReveal className='flex flex-col pb-10 sm:pb-16 lg:pr-8 lg:pb-0 xl:pr-20'>
          <img
            alt='Casterlabs'
            src={
              theme === 'dark'
                ? '/assets/users/casterlabs-dark.svg'
                : '/assets/users/casterlabs-light.svg'
            }
            className='h-12 w-auto self-start'
            width={157}
            height={48}
            loading='lazy'
          />
          <figure className='mt-10 flex flex-auto flex-col justify-between'>
            <blockquote>
              <Text as='p' size='lg' colour='secondary'>
                "Swetrix has been a{' '}
                <FeedbackHighlight>
                  game changer for our analytics.
                </FeedbackHighlight>{' '}
                They've always been on top of feature requests and bug reports
                and have been friendly every step of the way. I can't recommend
                them enough."
              </Text>
            </blockquote>
            <figcaption className='mt-10 flex items-center gap-x-6'>
              <img
                alt='Alex Bowles'
                src='/assets/users/alex-casterlabs.jpg'
                className='size-14 rounded-full bg-gray-50 object-cover dark:bg-gray-800'
                width={56}
                height={56}
                loading='lazy'
              />
              <div className='space-y-1'>
                <Text as='p' size='base' weight='medium' colour='primary'>
                  Alex Bowles
                </Text>
                <Text as='p' size='base' colour='secondary'>
                  Co-founder of Casterlabs
                </Text>
              </div>
            </figcaption>
          </figure>
        </ScrollReveal>
        <ScrollReveal
          delay={0.12}
          className='flex flex-col border-t border-gray-900/10 pt-10 sm:pt-16 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8 xl:pl-20 dark:border-gray-100/10'
        >
          <img
            alt='Phalcode'
            src={
              theme === 'dark'
                ? '/assets/users/phalcode-dark.svg'
                : '/assets/users/phalcode-light.svg'
            }
            className='h-8 w-auto self-start'
            width={200}
            height={32}
            loading='lazy'
          />
          <figure className='mt-10 flex flex-auto flex-col justify-between'>
            <blockquote>
              <Text as='p' size='lg' colour='secondary'>
                "I was confused by Google Analytics so much that I was getting
                zero actionable insights. Swetrix changed everything -{' '}
                <FeedbackHighlight>
                  clean dashboard, instant understanding of user behavior, and
                  features that actually matter.
                </FeedbackHighlight>{' '}
                Finally, analytics that help me make better decisions instead of
                irritating me."
              </Text>
            </blockquote>
            <figcaption className='mt-10 flex items-center gap-x-6'>
              <img
                alt='Alper Alkan'
                src='/assets/users/alper-phalcode.jpg'
                className='size-14 rounded-full bg-gray-50 object-cover dark:bg-gray-800'
                width={56}
                height={56}
                loading='lazy'
              />
              <div className='space-y-1'>
                <Text as='p' size='base' weight='medium' colour='primary'>
                  Alper Alkan
                </Text>
                <Text as='p' size='base' colour='secondary'>
                  Co-founder of Phalcode
                </Text>
              </div>
            </figcaption>
          </figure>
        </ScrollReveal>
      </div>
    </section>
  )
}

const REVIEWERS = [
  {
    name: 'Luke',
    image: '/assets/small-testimonials/luke.jpg',
  },
  {
    name: 'Alex',
    image: '/assets/small-testimonials/alex.jpg',
  },
  {
    name: 'Artur',
    image: '/assets/small-testimonials/artur.jpg',
  },
  {
    name: 'Alper',
    image: '/assets/small-testimonials/alper.jpg',
  },
  {
    name: 'Andrii',
    image: '/assets/small-testimonials/andrii.jpg',
  },
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
  const { theme } = useTheme()
  const {
    i18n: { language },
  } = useTranslation('common')

  const isUpToLg = !useBreakpoint('lg')

  if (isUpToLg) {
    return (
      <ScrollReveal className='relative z-20 mx-auto mt-10 overflow-hidden rounded-2xl bg-white/80 p-1.5 shadow-2xl ring-1 shadow-slate-950/20 ring-white/40 backdrop-blur-md dark:bg-slate-950/80 dark:ring-white/10'>
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
      </ScrollReveal>
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
        WebkitMaskImage: '-webkit-radial-gradient(white, black)',
      }}
    >
      <div className='relative h-[580px] overflow-hidden rounded-xl bg-slate-950 lg:h-[640px] xl:h-[700px]'>
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
          <div className='absolute inset-0 bg-slate-950/50' />
          <div className='absolute inset-0 bg-radial-[at_50%_0%] from-indigo-300/30 via-slate-950/10 to-slate-950/80' />
          <div className='absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-b from-transparent to-slate-950' />
        </div>
        <Header transparent inverted />
        <section className='relative z-10 mx-auto flex max-w-[1500px] flex-col items-center px-4 pt-14 pb-6 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20'>
          <div className='flex w-full flex-col items-center'>
            <Text
              as='h1'
              weight='semibold'
              className='mx-auto max-w-6xl text-center [font-family:Geist,ui-sans-serif,system-ui,sans-serif] text-5xl leading-[0.98] text-balance text-white sm:text-6xl lg:text-7xl xl:text-8xl'
            >
              {t('main.slogan')}
            </Text>
            <Text
              as='p'
              size='lg'
              className='mx-auto mt-5 max-w-3xl text-center leading-8 text-gray-50'
            >
              {t('main.description')}
            </Text>
            <div className='mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center'>
              <Link
                to={routesPath.signup}
                className='inline-flex h-12 items-center justify-center rounded-md bg-white px-5 text-slate-950 shadow-lg ring-1 shadow-slate-950/20 ring-white/30 transition-colors hover:bg-gray-100'
                aria-label={t('titles.signup')}
              >
                <span className='text-center text-base font-semibold'>
                  {t('main.startAXDayFreeTrial', { amount: 14 })}
                </span>
                <ArrowRightIcon className='mt-[1px] ml-1 h-4 w-5' />
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
                aria-label={`${t('main.seeLiveDemo')} (opens in a new tab)`}
              >
                {t('common.liveDemo')}
              </Button>
            </div>
            <div className='mt-8 flex max-w-4xl flex-wrap justify-center gap-x-16 gap-y-3 text-gray-50'>
              <div className='flex items-center gap-2 text-sm whitespace-nowrap'>
                <GaugeIcon className='size-5 shrink-0' />
                <span>{t('main.heroBenefits.quickSetup')}</span>
              </div>
              <div className='flex items-center gap-2 text-sm whitespace-nowrap'>
                <CookieIcon className='size-5 shrink-0' />
                <span>{t('main.heroBenefits.cookieless')}</span>
              </div>
              <div className='flex items-center gap-2 text-sm whitespace-nowrap'>
                <StarIcon className='size-5 shrink-0' />
                <span>{t('main.heroBenefits.realTimeDashboard')}</span>
              </div>
              <div className='flex items-center gap-2 text-sm whitespace-nowrap'>
                <GithubLogoIcon className='size-5 shrink-0' />
                <span>{t('main.heroBenefits.openSource')}</span>
              </div>
            </div>
            <Testimonials className='dark mt-8' />
          </div>
          <div className='w-full'>
            <ClientOnly
              fallback={
                <div className='mx-auto mt-12 h-[580px] w-full max-w-[1480px] rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-xl lg:h-[640px] xl:h-[700px]' />
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

const SOFTWARE_APPLICATION_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Swetrix',
  url: 'https://swetrix.com',
  applicationCategory: 'WebApplication',
  operatingSystem: 'All',
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: '19',
    highPrice: '419',
    offerCount: '9',
    description: '14-day free trial, then paid plans from $19/month',
  },
  description:
    'Privacy-first, cookieless Google Analytics alternative with real-time analytics, no sampling, and built-in performance & error monitoring.',
  featureList: [
    'Cookie-free tracking',
    'Traffic web analytics',
    'Session analysis',
    'Session replays',
    'Website speed analytics',
    'Error tracking',
    'Funnels',
    'Feature flags',
    'Experiments',
    'reCAPTCHA alternative',
    'API access',
    'Team members',
  ],
  screenshot: 'https://swetrix.com/assets/screenshot_light.png',
  softwareHelp: {
    '@type': 'WebPage',
    url: 'https://swetrix.com/docs',
  },
  author: {
    '@type': 'Organization',
    name: 'Swetrix',
    url: 'https://swetrix.com',
  },
}

export default function Index() {
  const { metainfo } = useLoaderData<typeof loader>()

  return (
    <div className='overflow-hidden'>
      <main className='bg-gray-50 dark:bg-slate-950'>
        <Hero />

        <LogoCloud />

        <FeaturesGrid />

        <Integrations />

        <MarketingPricing metainfo={metainfo} />

        <FeedbackDual />

        <WhySwitch />

        <FAQ />

        <DitchGoogle />
      </main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(SOFTWARE_APPLICATION_JSONLD)
            .replace(/</g, '\\u003c')
            .replace(/\u2028|\u2029/g, ''),
        }}
      />
    </div>
  )
}
