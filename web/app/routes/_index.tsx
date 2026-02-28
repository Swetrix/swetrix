import _map from 'lodash/map'
import {
  CookieIcon,
  HardDrivesIcon,
  DatabaseIcon,
  CursorClickIcon,
  GaugeIcon,
  GithubLogoIcon,
  CaretUpIcon,
  CaretDownIcon,
  ArrowRightIcon,
  StarIcon,
  ShieldCheckIcon,
  MegaphoneIcon,
  BugIcon,
  UsersThreeIcon,
  CodeIcon,
  TerminalWindowIcon,
} from '@phosphor-icons/react'
import React from 'react'
import { useTranslation, Trans } from 'react-i18next'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { Link, redirect, useLoaderData } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'
import { ClientOnly } from 'remix-utils/client-only'

import { getGeneralStats, serverFetch } from '~/api/api.server'
import Header from '~/components/Header'
import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import FAQ from '~/components/marketing/FAQ'
import Integrations from '~/components/marketing/Integrations'
import MarketingPricing from '~/components/pricing/MarketingPricing'
import useBreakpoint from '~/hooks/useBreakpoint'
import {
  LIVE_DEMO_URL,
  isSelfhosted,
  isDisableMarketingPages,
} from '~/lib/constants'
import { DEFAULT_METAINFO, Metainfo } from '~/lib/models/Metainfo'
import { Stats } from '~/lib/models/Stats'
import { useTheme } from '~/providers/ThemeProvider'
import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'
import routesPath from '~/utils/routes'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

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
  <span className='bg-yellow-100/80 font-medium dark:bg-yellow-900/60'>
    &nbsp;{children}&nbsp;
  </span>
)

export const FeedbackDual = () => {
  const { theme } = useTheme()

  return (
    <section className='rounded-b-4xl bg-gray-100/80 py-24 sm:py-32 dark:bg-slate-900/50'>
      <div className='mx-auto max-w-7xl px-4 lg:px-8'>
        <div className='mx-auto grid max-w-2xl grid-cols-1 lg:mx-0 lg:max-w-none lg:grid-cols-2'>
          <div className='flex flex-col pb-10 sm:pb-16 lg:pr-8 lg:pb-0 xl:pr-20'>
            <img
              alt='Casterlabs'
              src={
                theme === 'dark'
                  ? '/assets/users/casterlabs-dark.svg'
                  : '/assets/users/casterlabs-light.svg'
              }
              className='h-12 self-start'
            />
            <figure className='mt-10 flex flex-auto flex-col justify-between'>
              <blockquote className='text-lg/8 text-gray-900 dark:text-gray-100'>
                <p>
                  "Swetrix has been a
                  <FeedbackHighlight>
                    game changer for our analytics.
                  </FeedbackHighlight>{' '}
                  They've always been on top of feature requests and bug reports
                  and have been friendly every step of the way. I can't
                  recommend them enough."
                </p>
              </blockquote>
              <figcaption className='mt-10 flex items-center gap-x-6'>
                <img
                  alt=''
                  src='/assets/users/alex-casterlabs.jpg'
                  className='size-14 rounded-full bg-gray-50 dark:bg-gray-800'
                />
                <div className='text-base'>
                  <div className='font-semibold text-gray-900 dark:text-gray-100'>
                    Alex Bowles
                  </div>
                  <div className='mt-1 text-gray-500 dark:text-gray-400'>
                    Co-founder of Casterlabs
                  </div>
                </div>
              </figcaption>
            </figure>
          </div>
          <div className='flex flex-col border-t border-gray-900/10 pt-10 sm:pt-16 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8 xl:pl-20 dark:border-gray-100/10'>
            <img
              alt='Phalcode'
              src={
                theme === 'dark'
                  ? '/assets/users/phalcode-dark.svg'
                  : '/assets/users/phalcode-light.svg'
              }
              className='h-8 self-start'
            />
            <figure className='mt-10 flex flex-auto flex-col justify-between'>
              <blockquote className='text-lg/8 text-gray-900 dark:text-gray-100'>
                <p>
                  "I was confused by Google Analytics so much that I was getting
                  zero actionable insights. Swetrix changed everything -
                  <FeedbackHighlight>
                    clean dashboard, instant understanding of user behavior, and
                    features that actually matter.
                  </FeedbackHighlight>
                  Finally, analytics that help me make better decisions instead
                  of irritating me."
                </p>
              </blockquote>
              <figcaption className='mt-10 flex items-center gap-x-6'>
                <img
                  alt=''
                  src='/assets/users/alper-phalcode.jpg'
                  className='size-14 rounded-full bg-gray-50 dark:bg-gray-800'
                />
                <div className='text-base'>
                  <div className='font-semibold text-gray-900 dark:text-gray-100'>
                    Alper Alkan
                  </div>
                  <div className='mt-1 text-gray-500 dark:text-gray-400'>
                    Co-founder of Phalcode
                  </div>
                </div>
              </figcaption>
            </figure>
          </div>
        </div>
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

const Testimonials = ({
  className,
  stats,
}: {
  className?: string
  stats: Stats | null
}) => {
  const { t } = useTranslation('common')

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
              width='400'
              height='400'
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
              amount: stats?.trials || '> 1000',
            }}
            t={t}
            i18nKey='main.understandTheirUsers'
          >
            <span className='font-semibold text-gray-900 dark:text-gray-50' />
          </Trans>
        </div>
      </div>
    </div>
  )
}

const LiveDemoPreview = () => {
  const { t } = useTranslation('common')
  const { theme } = useTheme()
  const {
    i18n: { language },
  } = useTranslation('common')

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
            className='pointer-events-auto inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-black/10 transition-all hover:bg-gray-50 dark:bg-slate-950 dark:text-white dark:ring-white/10 dark:hover:bg-slate-900'
            aria-label={`${t('main.seeLiveDemo')} (opens in a new tab)`}
          >
            <ArrowRightIcon className='mr-2 h-4 w-4' />
            {t('common.liveDemo')}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className='group relative -mr-6 ml-auto w-[140%] overflow-hidden rounded-2xl bg-gray-50 shadow-lg ring-1 ring-black/5 transition-shadow ease-out sm:-mr-12 sm:w-[160%] lg:-mr-16 lg:w-[180%] xl:-mr-24 2xl:-mr-32 dark:bg-slate-950 dark:ring-white/10'>
      <div className='pointer-events-none relative h-[580px] lg:h-[640px] xl:h-[700px]'>
        <iframe
          src={`https://swetrix.com/projects/STEzHcB1rALV?tab=traffic&theme=${theme}&embedded=true&lng=${language}`}
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
            className='pointer-events-auto inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-black/10 transition-all hover:bg-gray-50 dark:bg-slate-950 dark:text-white dark:ring-white/10 dark:hover:bg-slate-900'
            aria-label={`${t('main.seeLiveDemo')} (opens in a new tab)`}
          >
            <ArrowRightIcon className='mr-2 h-4 w-4' />
            {t('main.seeLiveDemo')}
          </a>
        </div>
      </div>
    </div>
  )
}

const Hero = () => {
  const { t } = useTranslation('common')
  const { stats } = useLoaderData<typeof loader>()

  return (
    <div className='relative isolate bg-gray-100/80 pt-2 dark:bg-slate-900/50'>
      <div className='relative mx-2 overflow-hidden rounded-4xl'>
        <div aria-hidden className='pointer-events-none absolute inset-0 -z-10'>
          <div className='absolute inset-0 rounded-4xl bg-linear-115 from-slate-100 from-28% via-purple-500 via-70% to-indigo-600 opacity-50 ring-1 ring-black/5 ring-inset sm:bg-linear-145 dark:from-slate-950 dark:opacity-45 dark:ring-white/10' />
          <div className='absolute top-28 -left-24 size-[28rem] rounded-full bg-[radial-gradient(closest-side,#6366f1,transparent)] opacity-25 blur-3xl dark:opacity-15' />
          <div className='absolute -right-16 bottom-[-3rem] size-[26rem] rounded-full bg-[radial-gradient(closest-side,#eef2ff,transparent)] opacity-30 blur-3xl dark:opacity-15' />
        </div>
        <Header transparent />
        <section className='mx-auto max-w-7xl px-4 pt-10 pb-5 sm:px-3 lg:grid lg:grid-cols-12 lg:gap-8 lg:px-6 lg:pt-20 xl:px-8'>
          <div className='z-20 col-span-6 flex flex-col items-start'>
            <h1 className='max-w-5xl text-left text-5xl font-semibold tracking-tight text-pretty text-slate-900 sm:leading-none lg:mt-6 lg:text-6xl xl:text-7xl dark:text-white'>
              {t('main.slogan')}
            </h1>
            <p className='mt-4 max-w-2xl text-left text-lg text-slate-900 dark:text-gray-50'>
              {t('main.description')}
            </p>
            <div className='mt-8 flex flex-col items-stretch sm:flex-row sm:items-center'>
              <Link
                to={routesPath.signup}
                className='flex h-12 items-center justify-center rounded-md border-2 border-slate-900 bg-slate-900 px-4 text-white transition-all hover:bg-transparent hover:text-slate-900 dark:border-slate-50 dark:bg-gray-50 dark:text-slate-900 dark:hover:text-gray-50'
                aria-label={t('titles.signup')}
              >
                <span className='mr-1 text-center text-base font-semibold'>
                  {t('main.startAXDayFreeTrial', { amount: 14 })}
                </span>
                <ArrowRightIcon className='mt-[1px] h-4 w-5' />
              </Link>
            </div>
            <div className='mt-8 grid w-full grid-cols-2 gap-3 text-slate-900 dark:text-gray-50'>
              <div className='flex items-center gap-3 text-sm'>
                <StarIcon className='size-5' />
                <span>{t('main.heroBenefits.trial', { days: 14 })}</span>
              </div>
              <div className='flex items-center gap-3 text-sm'>
                <GaugeIcon className='size-5' />
                <span>{t('main.heroBenefits.quickSetup')}</span>
              </div>
              <div className='flex items-center gap-3 text-sm'>
                <CookieIcon className='size-5' />
                <span>{t('main.heroBenefits.cookieless')}</span>
              </div>
              <div className='flex items-center gap-3 text-sm'>
                <GithubLogoIcon className='size-5' />
                <span>{t('main.heroBenefits.openSource')}</span>
              </div>
              <div className='flex items-center gap-3 text-sm'>
                <DatabaseIcon className='size-5' />
                <span>{t('main.heroBenefits.dataOwnership')}</span>
              </div>
              <div className='flex items-center gap-3 text-sm'>
                <HardDrivesIcon className='size-5' />
                <span>{t('main.heroBenefits.selfHostable')}</span>
              </div>
            </div>
            <Testimonials className='mt-8 hidden lg:block' stats={stats} />
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
          <Testimonials className='mt-8 lg:hidden' stats={stats} />
        </section>
      </div>
    </div>
  )
}

const FEATURES_ALT = [
  { icon: ShieldCheckIcon, key: 'privacy' },
  { icon: CursorClickIcon, key: 'events' },
  { icon: MegaphoneIcon, key: 'campaigns' },
  { icon: GaugeIcon, key: 'perf' },
  { icon: BugIcon, key: 'errors' },
  { icon: UsersThreeIcon, key: 'sessions' },
  { icon: CodeIcon, key: 'opensource' },
  { icon: TerminalWindowIcon, key: 'devs' },
] as const

const DashboardMockup = () => (
  <div
    className='relative mx-auto h-[440px] w-full max-w-lg select-none'
    aria-hidden
  >
    {/* Chart card */}
    <div className='absolute -top-4 -right-4 w-[290px] rotate-2 rounded-2xl bg-white p-5 shadow-md ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800/20'>
      <div className='mb-1 flex items-center justify-between'>
        <Text
          size='xxs'
          weight='semibold'
          colour='muted'
          tracking='wide'
          className='uppercase'
        >
          Pageviews
        </Text>
        <div className='flex items-center gap-1.5'>
          <Text size='xl' weight='bold'>
            24.5k
          </Text>
          <Text
            size='xxs'
            weight='medium'
            colour='success'
            className='flex items-center'
          >
            <CaretUpIcon weight='fill' className='size-3' />
            12%
          </Text>
        </div>
      </div>
      <svg
        viewBox='0 0 260 90'
        className='mt-2 w-full'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
      >
        <defs>
          <linearGradient id='mockChartGrad' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0%' stopColor='rgb(99 102 241)' stopOpacity='0.25' />
            <stop
              offset='100%'
              stopColor='rgb(99 102 241)'
              stopOpacity='0.01'
            />
          </linearGradient>
        </defs>
        <path
          d='M0,72 C15,68 30,58 52,54 C74,50 88,62 110,44 C132,26 148,34 170,22 C192,10 210,16 230,12 L260,8 L260,90 L0,90 Z'
          fill='url(#mockChartGrad)'
        />
        <path
          d='M0,72 C15,68 30,58 52,54 C74,50 88,62 110,44 C132,26 148,34 170,22 C192,10 210,16 230,12 L260,8'
          stroke='rgb(99 102 241)'
          strokeWidth='2'
          strokeLinecap='round'
        />
        <circle
          cx='170'
          cy='22'
          r='3.5'
          fill='white'
          stroke='rgb(99 102 241)'
          strokeWidth='2'
        />
      </svg>
      <div className='mt-1 flex justify-between'>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <Text key={d} size='xxs' colour='muted'>
            {d}
          </Text>
        ))}
      </div>
    </div>

    {/* Events card */}
    <div className='absolute top-6 left-0 w-[270px] -rotate-3 rounded-2xl bg-white p-5 shadow-md ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800/20'>
      <Text as='h3' size='lg' weight='bold'>
        Events
      </Text>
      <div className='mt-2 mb-1.5 flex items-center justify-between px-1'>
        <Text size='xxs' weight='medium' colour='muted'>
          Event
        </Text>
        <Text size='xxs' weight='medium' colour='muted'>
          Quantity
        </Text>
      </div>
      <div className='space-y-0.5'>
        {[
          { name: 'SIGNUP', count: 97, pct: 56, barW: 100 },
          { name: 'AI_CHAT_CREATED', count: 12, pct: 7, barW: 42 },
          { name: 'PURCHASE', count: 7, pct: 4, barW: 28 },
          { name: 'NEWSLETTER_SUB', count: 4, pct: 2, barW: 18 },
          { name: 'PROJECT_CREATED', count: 2, pct: 1, barW: 10 },
        ].map(({ name, count, pct, barW }) => (
          <div
            key={name}
            className='relative flex items-center justify-between rounded-sm px-1 py-1.5'
          >
            <div
              className='absolute inset-0 rounded-sm bg-blue-50 dark:bg-blue-900/10'
              style={{ width: `${barW}%` }}
            />
            <Text size='xs' className='relative z-10'>
              {name}
            </Text>
            <span className='relative z-10'>
              <Text size='xs' weight='medium'>
                {count}
              </Text>
              <Text size='xs' colour='muted' className='mx-1.5'>
                |
              </Text>
              <Text size='xs' colour='muted'>
                {pct}%
              </Text>
            </span>
          </div>
        ))}
      </div>
    </div>

    {/* Metrics card */}
    <div className='absolute bottom-0 left-6 w-[220px] rotate-1 rounded-2xl bg-white p-4 shadow-md ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800/20'>
      <div className='space-y-2.5'>
        {[
          { label: 'Unique visitors', value: '125k', up: true },
          { label: 'Total pageviews', value: '85.1k', up: true },
          { label: 'Avg. session', value: '3m 24s', up: true },
          { label: 'Bounce rate', value: '42%', up: false },
        ].map(({ label, value, up }) => (
          <div key={label} className='flex items-center justify-between'>
            <Text size='xs' colour='muted'>
              {label}
            </Text>
            <div className='flex items-center gap-1.5'>
              <Text size='sm' weight='semibold'>
                {value}
              </Text>
              {up ? (
                <CaretUpIcon
                  weight='fill'
                  className='size-3 text-emerald-500'
                />
              ) : (
                <CaretDownIcon weight='fill' className='size-3 text-red-500' />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Top pages card */}
    <div className='absolute right-0 bottom-12 w-[220px] -rotate-1 rounded-2xl bg-white p-4 shadow-md ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800/20'>
      <Text as='h3' size='lg' weight='bold' className='mb-2'>
        Pages
      </Text>
      <div className='mb-1 flex items-center justify-between px-1'>
        <Text size='xs' weight='medium' colour='muted'>
          Page
        </Text>
        <Text size='xs' weight='medium' colour='muted'>
          Visitors
        </Text>
      </div>
      <div className='space-y-0.5'>
        {[
          { page: '/', count: 512, barW: 100 },
          { page: '/pricing', count: 407, barW: 79 },
          { page: '/dashboard', count: 128, barW: 25 },
          { page: '/blog', count: 65, barW: 13 },
        ].map(({ page, count, barW }) => (
          <div
            key={page}
            className='relative flex h-7 items-center justify-between rounded-sm px-1'
          >
            <div
              className='absolute inset-0 rounded-sm bg-blue-50 dark:bg-blue-900/30'
              style={{ width: `${barW}%` }}
            />
            <Text size='xs' className='relative z-10'>
              {page}
            </Text>
            <Text size='xs' weight='medium' className='relative z-10'>
              {count}
            </Text>
          </div>
        ))}
      </div>
    </div>
  </div>
)

const FeaturesGridAlt = () => {
  const { t } = useTranslation('common')

  return (
    <section className='relative mx-auto max-w-7xl px-4 py-14 lg:px-8'>
      <div className='grid items-center gap-10 lg:grid-cols-2 lg:gap-16'>
        <DashboardMockup />
        <div>
          <Text
            as='h2'
            size='3xl'
            weight='bold'
            tracking='tight'
            className='sm:text-4xl'
          >
            {t('main.featuresAlt.heading')}
          </Text>
          <div className='mt-8 grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2'>
            {FEATURES_ALT.map(({ icon: Icon, key }) => (
              <div key={key}>
                <div className='flex items-center gap-2'>
                  <Icon
                    weight='duotone'
                    className='size-5 shrink-0 text-indigo-600 dark:text-indigo-400'
                  />
                  <Text as='h3' weight='semibold'>
                    {t(`main.featuresAlt.${key}.title`)}
                  </Text>
                </div>
                <Text
                  as='p'
                  size='sm'
                  colour='muted'
                  className='mt-1 pl-7 leading-relaxed'
                >
                  {t(`main.featuresAlt.${key}.desc`)}
                </Text>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Index() {
  const { metainfo } = useLoaderData<typeof loader>()

  return (
    <div className='overflow-hidden'>
      <main className='bg-gray-50 dark:bg-slate-950'>
        <Hero />

        <FeedbackDual />

        <FeaturesGridAlt />

        <Integrations />

        <MarketingPricing metainfo={metainfo} />

        <FAQ />

        <DitchGoogle />
      </main>
    </div>
  )
}
