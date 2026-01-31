import { motion, AnimatePresence } from 'framer-motion'
import _map from 'lodash/map'
import {
  CheckIcon,
  CookieIcon,
  HardDrivesIcon,
  DatabaseIcon,
  FileTextIcon,
  CursorClickIcon,
  GlobeIcon,
  GaugeIcon,
  GithubLogoIcon,
  BellRingingIcon,
  WarningIcon,
  CaretUpIcon,
  CaretDownIcon,
  ToggleRightIcon,
  FlaskIcon,
  TrendUpIcon,
  TargetIcon,
  CurrencyDollarIcon,
  ArrowRightIcon,
  StarIcon,
} from '@phosphor-icons/react'
import React, { useEffect, useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { Link, redirect, useLoaderData } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'
import { ClientOnly } from 'remix-utils/client-only'

import { getGeneralStats, serverFetch } from '~/api/api.server'
import Header from '~/components/Header'
import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import FAQ from '~/components/marketing/FAQ'
import MarketingPricing from '~/components/pricing/MarketingPricing'
import useBreakpoint from '~/hooks/useBreakpoint'
import {
  LIVE_DEMO_URL,
  isSelfhosted,
  isDisableMarketingPages,
  OS_LOGO_MAP,
  OS_LOGO_MAP_DARK,
  BROWSER_LOGO_MAP,
} from '~/lib/constants'
import { DEFAULT_METAINFO, Metainfo } from '~/lib/models/Metainfo'
import { Stats } from '~/lib/models/Stats'
import {
  MetricCard,
  MetricCardSelect,
} from '~/pages/Project/tabs/Traffic/MetricCards'
import CCRow from '~/pages/Project/View/components/CCRow'
import { useTheme } from '~/providers/ThemeProvider'
import Flag from '~/ui/Flag'
import { cn, getStringFromTime, getTimeFromSeconds } from '~/utils/generic'
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

  const userAgent = request.headers.get('user-agent')

  let deviceInfo: {
    browser?: string | null
    os?: string | null
  } = {
    browser: 'Chrome',
    os: 'Windows',
  }

  if (userAgent) {
    const { UAParser } = await import('@ua-parser-js/pro-business')
    const parser = new UAParser(userAgent)

    deviceInfo = {
      browser: parser.getBrowser().name || null,
      os: parser.getOS().name || null,
    }
  }

  const [metainfoResult, stats] = await Promise.all([
    serverFetch<Metainfo>(request, 'user/metainfo', { skipAuth: true }),
    getGeneralStats(request),
  ])

  return {
    deviceInfo,
    metainfo: metainfoResult.data ?? DEFAULT_METAINFO,
    stats,
  }
}

interface FeedbackHighlightProps {
  children: React.ReactNode
}

const FeedbackHighlight = ({ children }: FeedbackHighlightProps) => (
  <span className='bg-yellow-100/80 font-medium dark:bg-yellow-400/40'>
    &nbsp;{children}&nbsp;
  </span>
)

export const FeedbackDual = () => {
  const { theme } = useTheme()

  return (
    <section className='rounded-b-4xl bg-gray-100/80 py-24 sm:py-32 dark:bg-slate-800/50'>
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
              amount: stats?.users || '> 1000',
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
            className='pointer-events-auto inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-black/10 transition-all hover:bg-gray-50 dark:bg-slate-900 dark:text-white dark:ring-white/10 dark:hover:bg-slate-800'
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
    <div className='group relative -mr-6 ml-auto w-[140%] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition-shadow ease-out sm:-mr-12 sm:w-[160%] lg:-mr-16 lg:w-[180%] xl:-mr-24 2xl:-mr-32 dark:bg-slate-800 dark:ring-white/10'>
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
            className='pointer-events-auto inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-black/10 transition-all hover:bg-gray-50 dark:bg-slate-900 dark:text-white dark:ring-white/10 dark:hover:bg-slate-800'
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
    <div className='relative isolate bg-gray-100/80 pt-2 dark:bg-slate-800/50'>
      <div className='relative mx-2 overflow-hidden rounded-4xl'>
        <div aria-hidden className='pointer-events-none absolute inset-0 -z-10'>
          <div className='absolute inset-0 rounded-4xl bg-linear-115 from-amber-100 from-28% via-purple-500 via-70% to-indigo-600 opacity-50 ring-1 ring-black/5 ring-inset sm:bg-linear-145 dark:from-slate-600 dark:opacity-60 dark:ring-white/10' />
          <div className='absolute top-28 -left-24 size-[28rem] rounded-full bg-[radial-gradient(closest-side,#6366f1,transparent)] opacity-25 blur-3xl dark:opacity-20' />
          <div className='absolute -right-16 bottom-[-3rem] size-[26rem] rounded-full bg-[radial-gradient(closest-side,#eef2ff,transparent)] opacity-30 blur-3xl dark:opacity-20' />
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

const FeatureCard = ({
  title,
  description,
  media,
  size = 'default',
}: {
  title: string
  description: React.ReactNode
  media: React.ReactNode
  size?: 'default' | 'large'
}) => (
  <div
    className={cn(
      'flex h-full flex-col overflow-hidden bg-white ring-1 ring-gray-200 dark:bg-slate-800/25 dark:ring-slate-800/60 dark:ring-white/10',
      size === 'large' ? 'rounded-2xl' : 'rounded-xl',
    )}
  >
    <div className='relative h-60 overflow-hidden'>{media}</div>
    <div className='p-6'>
      <h3
        className={cn(
          'font-semibold text-gray-950 dark:text-white',
          size === 'large' ? 'text-xl' : 'text-lg',
        )}
      >
        {title}
      </h3>
      <div className='mt-1 text-sm text-gray-700 dark:text-gray-300'>
        {description}
      </div>
    </div>
  </div>
)

const PreviewFallback = () => (
  <div className='h-full w-full bg-slate-100 dark:bg-slate-800/40' />
)

const SdurMetric = () => {
  const { t } = useTranslation('common')
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const timerId = setInterval(() => {
      setDuration((prevDuration) => prevDuration + 1)
    }, 1000)

    return () => clearInterval(timerId)
  }, [])

  return (
    <MetricCard
      classes={{
        value: 'max-md:text-xl md:text-3xl',
        container:
          'rounded-md bg-gray-50 dark:bg-slate-800/60 py-1 px-2 max-w-max',
      }}
      label={t('dashboard.sessionDuration')}
      value={duration}
      valueMapper={(value) => getStringFromTime(getTimeFromSeconds(value))}
    />
  )
}

const AnalyticsLivePreview = () => {
  const { t } = useTranslation('common')
  const [points, setPoints] = useState<number[]>(() =>
    Array.from({ length: 32 }, () => 2 + Math.random() * 10),
  )
  const [live, setLive] = useState(18)

  useEffect(() => {
    const intervalId = setInterval(() => {
      setPoints((prev) => {
        const next = prev.slice(1)
        next.push(
          Math.max(
            1,
            Math.min(14, prev[prev.length - 1] + (Math.random() - 0.5) * 3),
          ),
        )
        return next
      })
      setLive((v) => {
        const n =
          v + (Math.random() > 0.5 ? 1 : -1) * (Math.random() > 0.6 ? 2 : 1)
        return Math.max(8, Math.min(28, n))
      })
    }, 2000)
    return () => clearInterval(intervalId)
  }, [])

  const width = 600
  const height = 140
  const maxV = 16
  const step = width / (points.length - 1)
  const toPath = () => {
    let d = `M 0 ${height - (points[0] / maxV) * height}`
    points.forEach((v, i) => {
      const x = i * step
      const y = height - (v / maxV) * height
      d += ` L ${x} ${y}`
    })
    return d
  }

  const lastY = height - (points[points.length - 1] / maxV) * height
  const lastX = (points.length - 1) * step

  return (
    <div className='h-full w-full bg-gradient-to-b from-white to-slate-50 p-4 sm:p-6 dark:from-slate-800 dark:to-slate-900'>
      <div className='mb-3 flex items-center justify-between'>
        <div className='flex gap-3'>
          {[
            { l: t('dashboard.sessions'), v: 471 },
            { l: t('dashboard.pageviews'), v: 994 },
            { l: t('dashboard.bounceRate'), v: '28.5%' },
          ].map((k) => (
            <div
              key={k.l}
              className='rounded-md bg-white px-3 py-2 text-xs text-slate-900 ring-1 ring-black/5 dark:bg-slate-900 dark:text-gray-50 dark:ring-white/10'
            >
              <div className='text-xl font-bold'>{k.v}</div>
              <div>{k.l}</div>
            </div>
          ))}
        </div>
        <div className='inline-flex items-center gap-2 px-1 text-sm font-medium text-slate-900 dark:text-gray-50'>
          <span className='relative inline-flex'>
            <span className='absolute inline-flex size-3 animate-ping rounded-full bg-emerald-400 opacity-75 duration-1000' />
            <span className='relative inline-flex size-3 rounded-full bg-emerald-500' />
          </span>
          {live} online
        </div>
      </div>

      <div className='rounded-lg bg-white p-3 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10'>
        <svg viewBox={`0 0 ${width} ${height}`} className='h-40 w-full'>
          <defs>
            <linearGradient id='grad' x1='0' x2='0' y1='0' y2='1'>
              <stop offset='0%' stopColor='#2563eb' stopOpacity='0.5' />
              <stop offset='100%' stopColor='#2563eb' stopOpacity='0' />
            </linearGradient>
          </defs>
          <motion.path
            d={toPath()}
            fill='none'
            stroke='#2563eb'
            strokeWidth='3'
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
          <motion.circle
            cx={lastX}
            cy={lastY}
            r='5'
            fill='#2563eb'
            animate={{ r: [4, 6, 4] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
          <motion.path
            d={`${toPath()} L ${width} ${height} L 0 ${height} Z`}
            fill='url(#grad)'
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 0.45 }}
            transition={{ duration: 1.2 }}
          />
        </svg>
      </div>

      <div className='mt-3 grid grid-cols-2 gap-3 md:grid-cols-4'>
        {[
          {
            l: t('dashboard.bounceRate'),
            v: '47.4%',
            trend: '-3.6%',
          },
          {
            l: t('dashboard.sessionDuration'),
            v: '16m 41s',
            trend: '-11m 58s',
          },
          {
            l: t('project.entryPages'),
            v: '401',
            trend: '+12',
          },
          {
            l: t('project.devices'),
            v: '94',
            trend: '+5',
          },
        ].map((k) => (
          <div
            key={k.l}
            className='rounded-md bg-white p-3 text-xs ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10'
          >
            <div className='text-slate-600 dark:text-gray-300'>{k.l}</div>
            <div className='mt-1 flex items-baseline justify-between text-slate-900 dark:text-white'>
              <div className='text-lg font-semibold'>{k.v}</div>
              <span className='rounded px-1.5 py-0.5 ring-1'>{k.trend}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

type EventItem = { id: string; name: string; meta: React.ReactNode }

const randomEvent = (): EventItem => {
  const names = [
    'signup',
    'purchase',
    'goal_reached',
    'pageview',
    'add_to_cart',
    'checkout_complete',
    'newsletter_join',
  ]
  const metas = [
    {
      text: 'United States • Chrome • iOS',
      flag: (
        <Flag
          className='rounded-xs'
          country='US'
          size={16}
          alt=''
          aria-hidden='true'
        />
      ),
    },
    {
      text: 'France • Edge • Windows',
      flag: (
        <Flag
          className='rounded-xs'
          country='FR'
          size={16}
          alt=''
          aria-hidden='true'
        />
      ),
    },
    {
      text: 'United Kingdom • Safari • macOS',
      flag: (
        <Flag
          className='rounded-xs'
          country='GB'
          size={16}
          alt=''
          aria-hidden='true'
        />
      ),
    },
    {
      text: 'Germany • Firefox • Linux',
      flag: (
        <Flag
          className='rounded-xs'
          country='DE'
          size={16}
          alt=''
          aria-hidden='true'
        />
      ),
    },
    {
      text: 'Ukraine • Chrome • macOS',
      flag: (
        <Flag
          className='rounded-xs'
          country='UA'
          size={16}
          alt=''
          aria-hidden='true'
        />
      ),
    },
  ]
  const pick = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)]

  const meta = pick(metas)
  return {
    id: Math.random().toString(36).slice(2),
    name: pick(names),
    meta: (
      <div className='flex items-center gap-1'>
        {meta.flag}
        {meta.text}
      </div>
    ),
  }
}

const CustomEventsPreview = () => {
  const [items, setItems] = useState<EventItem[]>(() =>
    Array.from({ length: 5 }, randomEvent),
  )
  const agos = [
    'just now',
    '5 sec ago',
    '12 sec ago',
    '18 sec ago',
    '25 sec ago',
    '32 sec ago',
  ]

  useEffect(() => {
    const id = setInterval(() => {
      setItems((prev) => [randomEvent(), ...prev].slice(0, 6))
    }, 3500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className='h-full w-full bg-gradient-to-b from-white to-slate-50 p-4 dark:from-slate-800 dark:to-slate-900'>
      <ul className='space-y-2'>
        <AnimatePresence initial={false}>
          {items.map((ev, index) => (
            <motion.li
              key={ev.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.25 }}
              className='flex items-center justify-between rounded-md bg-slate-50 p-2 text-sm ring-1 ring-black/5 dark:bg-slate-800/60 dark:text-gray-200 dark:ring-white/10'
            >
              <div className='flex items-center gap-2'>
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-md ring-1',
                    ev.name === 'goal_reached'
                      ? 'bg-emerald-500/10 ring-emerald-500/30'
                      : 'bg-indigo-500/10 ring-indigo-500/30',
                  )}
                >
                  {ev.name === 'pageview' ? (
                    <FileTextIcon className='size-4 text-indigo-600 dark:text-indigo-400' />
                  ) : ev.name === 'goal_reached' ? (
                    <TargetIcon className='size-4 text-emerald-600 dark:text-emerald-400' />
                  ) : (
                    <CursorClickIcon className='size-4 text-indigo-600 dark:text-indigo-400' />
                  )}
                </span>
                <div>
                  <div className='font-medium text-slate-900 dark:text-gray-50'>
                    {ev.name}
                  </div>
                  <div className='text-xs text-slate-600 dark:text-gray-400'>
                    {ev.meta}
                  </div>
                </div>
              </div>
              <div className='text-xs whitespace-nowrap text-slate-500 dark:text-gray-400'>
                {agos[index]}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}

const PerformancePreview = () => {
  const { t } = useTranslation('common')

  type SeriesId = 'frontend' | 'backend' | 'network'

  type Series = {
    id: SeriesId
    color: string
    values: number[]
    base: number
    amp: number
  }

  const POINTS = 40
  const width = 560
  const height = 120

  const init = (base: number, amp: number) =>
    Array.from({ length: POINTS }, (_, i) =>
      Math.max(0, base + (Math.sin(i / 3) + (Math.random() - 0.5)) * amp),
    )

  const [series, setSeries] = useState<Series[]>([
    {
      id: 'frontend',
      color: '#709775',
      base: 0.5,
      amp: 0.15,
      values: init(0.5, 0.15),
    },
    {
      id: 'backend',
      color: '#00A8E8',
      base: 0.14,
      amp: 0.06,
      values: init(0.14, 0.06),
    },
    {
      id: 'network',
      color: '#F7A265',
      base: 0.06,
      amp: 0.03,
      values: init(0.06, 0.03),
    },
  ])

  useEffect(() => {
    const id = setInterval(() => {
      setSeries((prev) =>
        prev.map((s) => {
          const next = s.values.slice(1)
          const last = next[next.length - 1] ?? s.values[s.values.length - 1]
          const nv = Math.max(0, last + (Math.random() - 0.5) * s.amp)
          next.push(nv)
          return { ...s, values: next }
        }),
      )
    }, 2800)
    return () => clearInterval(id)
  }, [])

  const maxY = Math.max(0.8, ...series.flatMap((s) => s.values))
  const step = width / (POINTS - 1)
  const yScale = (v: number) => height - (v / (maxY * 1.15)) * height

  const toPath = (values: number[]) => {
    let d = `M 0 ${yScale(values[0])}`
    for (let i = 1; i < values.length; i++) {
      const x = i * step
      const y = yScale(values[i])
      d += ` L ${x} ${y}`
    }
    return d
  }

  const label = (id: SeriesId) => t(`dashboard.${id}`)
  const last = (id: SeriesId) =>
    series.find((s) => s.id === id)!.values[POINTS - 1]
  const prev = (id: SeriesId) =>
    series.find((s) => s.id === id)!.values[POINTS - 2]

  const fmt = (v: number) => `${v.toFixed(2)}s`

  const frontend = last('frontend')
  const frontendPrev = prev('frontend')
  const backend = last('backend')
  const backendPrev = prev('backend')
  const network = last('network')
  const networkPrev = prev('network')

  const legend = (
    <ul className='flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-slate-600 dark:text-gray-300'>
      {series.map((s) => (
        <li key={s.id} className='inline-flex items-center gap-1'>
          <span
            className='inline-block size-2 rounded-[2px]'
            style={{ backgroundColor: s.color }}
          />
          {label(s.id)}
        </li>
      ))}
    </ul>
  )

  const metric = (label: string, value: number, prevValue: number) => {
    const isUp = value >= prevValue
    const pct =
      prevValue > 0
        ? Math.abs(Math.round(((value - prevValue) / prevValue) * 100))
        : 0
    return (
      <div className='min-w-0 flex-1 rounded-md bg-white px-2.5 py-1.5 text-[11px] text-slate-900 ring-1 ring-black/5 dark:bg-slate-900 dark:text-gray-50 dark:ring-white/10'>
        <div className='text-lg font-bold'>{fmt(value)}</div>
        <div className='mt-0.5 flex items-center justify-between'>
          <div className='text-[10px] text-slate-600 dark:text-gray-300'>
            {label}
          </div>
          <div
            className={cn('flex items-center gap-1 text-[10px]', {
              'text-emerald-600 dark:text-emerald-400': isUp,
              'text-rose-600 dark:text-rose-400': !isUp,
            })}
          >
            {isUp ? (
              <>
                <CaretUpIcon className='h-4 w-4 shrink-0' />
                {`${pct}%`}
              </>
            ) : (
              <>
                <CaretDownIcon className='h-4 w-4 shrink-0' />
                {`${pct}%`}
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='h-full w-full bg-gradient-to-b from-white to-slate-50 p-3 sm:p-4 dark:from-slate-800 dark:to-slate-900'>
      <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
        <div className='flex min-w-0 flex-1 gap-2'>
          {metric(label('frontend'), frontend, frontendPrev)}
          {metric(label('backend'), backend, backendPrev)}
          {metric(label('network'), network, networkPrev)}
        </div>
      </div>

      <div className='relative rounded-lg bg-white p-2.5 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10'>
        <svg viewBox={`0 0 ${width} ${height}`} className='h-28 w-full'>
          <defs>
            <linearGradient id='gridfade' x1='0' x2='0' y1='0' y2='1'>
              <stop offset='0%' stopColor='#64748b' stopOpacity='0.06' />
              <stop offset='100%' stopColor='#64748b' stopOpacity='0' />
            </linearGradient>
          </defs>
          {[0.5].map((r) => (
            <line
              key={r}
              x1={0}
              x2={width}
              y1={height * r}
              y2={height * r}
              stroke='url(#gridfade)'
              strokeWidth={1}
            />
          ))}
          {series.map((s) => (
            <g key={s.id}>
              <motion.path
                d={toPath(s.values)}
                fill='none'
                stroke={s.color}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.1 }}
              />
            </g>
          ))}
        </svg>
      </div>
      <div className='mt-2'>{legend}</div>
    </div>
  )
}

type LogItem = { id: string; message: string }
const randomLog = (): LogItem => {
  const messages = [
    'TypeError: Cannot read properties of undefined',
    'NetworkError: Failed to fetch /api/data',
    'UnhandledRejection: Timeout while loading script',
    'ReferenceError: gtag is not defined',
  ]
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]
  return { id: Math.random().toString(36).slice(2), message: pick(messages) }
}

const ErrorsPreview = () => {
  const [logs, setLogs] = useState<LogItem[]>(() =>
    Array.from({ length: 5 }, () => randomLog()),
  )
  const agos = [
    'just now',
    '5 sec ago',
    '12 sec ago',
    '18 sec ago',
    '25 sec ago',
    '32 sec ago',
  ]

  useEffect(() => {
    const id = setInterval(
      () => setLogs((prev) => [randomLog(), ...prev].slice(0, 6)),
      4800,
    )
    return () => clearInterval(id)
  }, [])

  return (
    <div className='h-full w-full bg-gradient-to-b from-white to-slate-50 p-4 dark:from-slate-800 dark:to-slate-900'>
      <ul className='space-y-2'>
        <AnimatePresence initial={false}>
          {logs.map((log, index) => (
            <motion.li
              key={log.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
              className='flex items-start justify-between rounded-md bg-rose-50 p-2 text-sm ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:ring-rose-900/50'
            >
              <div className='flex items-start gap-2'>
                <span className='mt-0.5 inline-block size-2.5 flex-shrink-0 rounded-full bg-rose-500' />
                <div className='text-rose-700 dark:text-rose-200'>
                  {log.message}
                </div>
              </div>
              <div className='text-xs whitespace-nowrap text-rose-600 dark:text-rose-300'>
                {agos[index]}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}

const FunnelsPreview = () => {
  const steps = [
    { label: '/', base: 100 },
    { label: '/signup', base: 86 },
    { label: '/billing', base: 62 },
    { label: 'SALE', base: 29 },
  ]

  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((s) => s + 1), 1300)
    return () => clearInterval(id)
  }, [])

  const width = 620
  const height = 140
  const centerY = height / 2
  const segW = width / (steps.length - 1)
  const topY = (h: number) => centerY - h
  const botY = (h: number) => centerY + h
  const maxHalf = 42

  const vals = steps.map((s, i) => {
    const fluctuation = ((tick + i) % 5) - 2
    const v = Math.max(6, Math.min(100, s.base + fluctuation))
    return v
  })
  const halves = vals.map((v) => (v / 100) * maxHalf)

  const toPath = () => {
    let d = `M 0 ${topY(halves[0])}`
    for (let i = 1; i < halves.length; i++) {
      const x = i * segW
      const y = topY(halves[i])
      const cx1 = (i - 0.5) * segW
      const cy1 = topY(halves[i - 1])
      const cx2 = (i - 0.5) * segW
      const cy2 = y
      d += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x} ${y}`
    }
    // bottom side (right to left)
    for (let i = halves.length - 1; i >= 0; i--) {
      const x = i * segW
      const y = botY(halves[i])
      if (i === halves.length - 1) {
        d += ` L ${x} ${y}`
      } else {
        const cx1 = (i + 0.5) * segW
        const cy1 = botY(halves[i + 1])
        const cx2 = (i + 0.5) * segW
        const cy2 = y
        d += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x} ${y}`
      }
    }
    d += ' Z'
    return d
  }

  const midLabels = steps.map((s, i) => ({
    x: i * segW + (i < steps.length - 1 ? segW / 2 : 0),
    v: vals[i],
  }))

  return (
    <div className='h-full w-full bg-gradient-to-b from-white to-slate-50 p-4 dark:from-slate-800 dark:to-slate-900'>
      <div className='mb-2 flex items-center justify-between'>
        <div className='text-xs font-medium text-slate-700 dark:text-gray-300'>
          Sample funnel
        </div>
        <div className='text-[11px] text-slate-700 dark:text-gray-300'>
          % of previous step
        </div>
      </div>
      <div className='relative'>
        <svg viewBox={`0 0 ${width} ${height}`} className='h-36 w-full'>
          <defs>
            <linearGradient id='fgrad' x1='0' y1='0' x2='1' y2='0'>
              <stop offset='0%' stopColor='#3730a3' />
              <stop offset='35%' stopColor='#4f46e5' />
              <stop offset='70%' stopColor='#3b82f6' />
              <stop offset='100%' stopColor='#93c5fd' />
            </linearGradient>
            <linearGradient id='fstroke' x1='0' y1='0' x2='1' y2='0'>
              <stop offset='0%' stopColor='rgba(0,0,0,0.08)' />
              <stop offset='100%' stopColor='rgba(0,0,0,0.04)' />
            </linearGradient>
          </defs>

          <motion.path
            d={toPath()}
            fill='url(#fgrad)'
            stroke='url(#fstroke)'
            strokeWidth='1'
            animate={{ opacity: 1 }}
          />

          {steps.map((_, i) => (
            <line
              key={i}
              x1={i * segW}
              x2={i * segW}
              y1={topY(maxHalf + 6)}
              y2={botY(maxHalf + 6)}
              stroke='rgba(100,116,139,0.15)'
            />
          ))}
        </svg>

        <div className='pointer-events-none absolute inset-0 flex items-center justify-between px-3'>
          {midLabels.slice(0, -1).map((p, idx) => (
            <div
              key={idx}
              className='rounded-md bg-gray-200 p-1 text-xs font-semibold text-slate-900'
            >
              {p.v.toFixed(0)}%
            </div>
          ))}
          <div className='rounded-md bg-gray-200 p-1 text-xs font-semibold text-slate-900'>
            {midLabels[midLabels.length - 1].v.toFixed(0)}%
          </div>
        </div>

        <div className='mt-2 grid grid-cols-4 gap-2 text-[11px] text-slate-900 dark:text-gray-200'>
          {steps.map((s, i) => (
            <div key={s.label} className='text-center'>
              <div className='font-medium'>{s.label}</div>
              <div className='tabular-nums'>{vals[i].toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

type ChatItem = { id: string; kind: 'error' | 'online' | 'no-traffic' }
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
const randomChatItem = (): ChatItem => {
  const kinds: ChatItem['kind'][] = ['error', 'online']
  return { id: Math.random().toString(36).slice(2), kind: pick(kinds) }
}

const AlertsPreview = () => {
  const [items, setItems] = useState<ChatItem[]>(() =>
    Array.from({ length: 3 }, () => randomChatItem()),
  )

  const agos = ['just now', '7 sec ago', '52 sec ago', '2 min ago', '6 min ago']

  useEffect(() => {
    const id = setInterval(
      () => setItems((prev) => [randomChatItem(), ...prev].slice(0, 5)),
      5140,
    )
    return () => clearInterval(id)
  }, [])

  const renderMessage = (it: ChatItem, index: number) => {
    if (it.kind === 'error') {
      return (
        <div className='rounded-2xl bg-white p-3 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10'>
          <div className='mb-1 flex items-center gap-2 text-slate-900 dark:text-white'>
            <WarningIcon className='size-4 text-rose-600 dark:text-rose-400' />
            <span className='text-sm'>
              Error alert <span className='font-semibold'>Unique error</span>{' '}
              triggered!
            </span>
          </div>
          <div className='text-sm leading-5 wrap-break-word whitespace-pre-wrap text-slate-800 dark:text-gray-200'>
            Project: <span className='font-mono'>Demo</span>
            <br />
            Error:{' '}
            <span className='font-mono'>
              NetworkError: Failed to fetch /api/data
            </span>
          </div>
          <div className='mt-2 text-xs whitespace-nowrap text-slate-500 dark:text-gray-400'>
            {agos[index]}
          </div>
        </div>
      )
    }

    if (it.kind === 'online') {
      const online = 15 // Demo value

      return (
        <div className='rounded-2xl bg-white p-3 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10'>
          <div className='mb-1 flex items-center gap-2 text-slate-900 dark:text-white'>
            <BellRingingIcon className='size-4 text-amber-600 dark:text-amber-400' />
            <span className='text-sm'>
              Alert <span className='font-semibold'>Online &gt;= 10</span> got
              triggered!
            </span>
          </div>
          <div className='text-sm leading-5 text-slate-800 dark:text-gray-200'>
            Your project <span className='font-semibold'>Example</span> has{' '}
            {online} online users right now!
          </div>
          <div className='mt-2 text-xs whitespace-nowrap text-slate-500 dark:text-gray-400'>
            {agos[index]}
          </div>
        </div>
      )
    }

    return (
      <div className='rounded-2xl bg-white p-3 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10'>
        <div className='mb-1 flex items-center gap-2 text-slate-900 dark:text-white'>
          <BellRingingIcon className='size-4 text-amber-600 dark:text-amber-400' />
          <span className='text-sm'>
            Alert <span className='font-semibold'>No traffic</span> got
            triggered!
          </span>
        </div>
        <div className='text-sm leading-5 text-slate-800 dark:text-gray-200'>
          Your project <span className='font-semibold'>Demo</span> has had no
          traffic for the last 24 hours!
        </div>
        <div className='mt-2 text-xs whitespace-nowrap text-slate-500 dark:text-gray-400'>
          {agos[index]}
        </div>
      </div>
    )
  }

  return (
    <div className='h-full w-full rounded-lg bg-sky-100/60 p-2 ring-1 ring-black/5 dark:bg-slate-800/40 dark:ring-white/10'>
      <div className='relative h-56 overflow-hidden'>
        <ul className='absolute inset-0 space-y-3'>
          <AnimatePresence initial={false}>
            {items.map((it, index) => (
              <motion.li
                key={it.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.25 }}
              >
                {renderMessage(it, index)}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  )
}

const RevenuePreview = () => {
  const [revenue, setRevenue] = useState(2840)
  const [sources, setSources] = useState([
    { name: 'Google Search', amount: 1240, color: '#4285F4' },
    { name: 'Twitter / X', amount: 850, color: '#1DA1F2' },
    { name: 'Direct', amount: 460, color: '#64748b' },
  ])

  useEffect(() => {
    const id = setInterval(() => {
      const amountToAdd = Math.floor(Math.random() * 15)
      setRevenue((prev) => prev + amountToAdd)
      setSources((prev) => {
        const next = [...prev]
        const idx = Math.floor(Math.random() * next.length)
        next[idx] = { ...next[idx], amount: next[idx].amount + amountToAdd }
        return next
      })
    }, 4000)
    return () => clearInterval(id)
  }, [])

  const total = sources.reduce((acc, s) => acc + s.amount, 0)

  return (
    <div className='h-full w-full bg-gradient-to-b from-white to-slate-50 p-4 dark:from-slate-800 dark:to-slate-900'>
      <div className='mb-4 flex items-center justify-between rounded-xl bg-white p-4 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10'>
        <div>
          <div className='flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-gray-400'>
            <CurrencyDollarIcon className='size-3' />
            Total Revenue
          </div>
          <motion.div
            key={Math.floor(revenue / 10)}
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 1 }}
            className='text-2xl font-bold text-slate-900 tabular-nums dark:text-white'
          >
            ${revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </motion.div>
        </div>
        <div className='flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'>
          <TrendUpIcon className='size-3.5' />
          +14.2%
        </div>
      </div>

      <div className='space-y-4'>
        {sources.map((source) => (
          <div key={source.name} className='space-y-2'>
            <div className='flex items-center justify-between text-[11px]'>
              <div className='flex items-center gap-2'>
                <div
                  className='size-2 rounded-full'
                  style={{ backgroundColor: source.color }}
                />
                <span className='font-medium text-slate-700 dark:text-gray-300'>
                  {source.name}
                </span>
              </div>
              <span className='font-semibold text-slate-900 tabular-nums dark:text-white'>
                $
                {source.amount.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
            <div className='relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800'>
              <motion.div
                className='absolute inset-y-0 left-0 rounded-full'
                style={{ backgroundColor: source.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(source.amount / total) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

type FlagItem = {
  id: string
  name: string
  enabled: boolean
  type: 'boolean' | 'percentage'
  value: number
  evaluations: number
}

const FeatureFlagsPreview = () => {
  const [flags, setFlags] = useState<FlagItem[]>([
    {
      id: '1',
      name: 'dark-mode',
      enabled: true,
      type: 'boolean',
      value: 100,
      evaluations: 1247,
    },
    {
      id: '2',
      name: 'new-checkout',
      enabled: true,
      type: 'percentage',
      value: 75,
      evaluations: 892,
    },
    {
      id: '3',
      name: 'beta-features',
      enabled: false,
      type: 'boolean',
      value: 0,
      evaluations: 156,
    },
  ])

  useEffect(() => {
    const id = setInterval(() => {
      setFlags((prev) =>
        prev.map((f) => ({
          ...f,
          evaluations: f.evaluations + Math.floor(Math.random() * 5),
        })),
      )
    }, 3000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className='h-full w-full bg-gradient-to-b from-white to-slate-50 p-4 dark:from-slate-800 dark:to-slate-900'>
      <ul className='space-y-2'>
        {flags.map((flag) => (
          <motion.li
            key={flag.id}
            className='flex items-center justify-between rounded-md bg-white p-3 ring-1 ring-black/5 dark:bg-slate-800/60 dark:ring-white/10'
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className='flex items-center gap-3'>
              <div
                className={cn(
                  'flex size-8 items-center justify-center rounded-md',
                  flag.enabled
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500',
                )}
              >
                <ToggleRightIcon className='size-4' />
              </div>
              <div>
                <div className='flex items-center gap-2'>
                  <span className='font-medium text-slate-900 dark:text-gray-50'>
                    {flag.name}
                  </span>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-medium',
                      flag.enabled
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
                    )}
                  >
                    {flag.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <span className='rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400'>
                    {flag.type === 'boolean' ? 'Boolean' : `${flag.value}%`}
                  </span>
                </div>
                <div className='text-xs text-slate-500 dark:text-gray-400'>
                  {flag.evaluations.toLocaleString()} evaluations
                </div>
              </div>
            </div>
            <div
              className={cn(
                'size-3 rounded-full',
                flag.enabled
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  : 'bg-slate-300 dark:bg-slate-600',
              )}
            />
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

const ExperimentsPreview = () => {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((s) => s + 1), 2500)
    return () => clearInterval(id)
  }, [])

  const controlProb = 35 + ((tick * 2) % 15)
  const variantProb = 100 - controlProb

  const variants = [
    { name: 'Control', conversions: 127, exposures: 1842, color: '#3b82f6' },
    { name: 'Variant A', conversions: 186, exposures: 1756, color: '#22c55e' },
  ]

  const winnerIdx = variantProb > 50 ? 1 : 0

  return (
    <div className='h-full w-full bg-gradient-to-b from-white to-slate-50 p-4 dark:from-slate-800 dark:to-slate-900'>
      <div className='mb-3 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <FlaskIcon className='size-4 text-indigo-600 dark:text-indigo-400' />
          <span className='text-sm font-medium text-slate-900 dark:text-white'>
            Checkout Flow Test
          </span>
          <span className='rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'>
            Running
          </span>
        </div>
        <div className='rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400'>
          95% confidence
        </div>
      </div>

      <div className='rounded-lg bg-white p-3 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10'>
        <div className='mb-2 text-[10px] font-medium text-slate-600 dark:text-gray-300'>
          Probability of winning
        </div>
        <div className='relative h-6 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800'>
          <motion.div
            className='absolute top-0 left-0 h-full bg-blue-500'
            initial={{ width: '50%' }}
            animate={{ width: `${controlProb}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <motion.div
            className='absolute top-0 right-0 h-full bg-emerald-500'
            initial={{ width: '50%' }}
            animate={{ width: `${variantProb}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <div className='absolute inset-0 flex items-center justify-between px-3 text-[10px] font-bold text-white'>
            <span>{controlProb.toFixed(0)}%</span>
            <span>{variantProb.toFixed(0)}%</span>
          </div>
        </div>

        <div className='mt-3 grid grid-cols-2 gap-2'>
          {variants.map((v, i) => (
            <div
              key={v.name}
              className={cn(
                'rounded-md p-2 text-xs ring-1',
                i === winnerIdx
                  ? 'bg-emerald-50 ring-emerald-200 dark:bg-emerald-950/40 dark:ring-emerald-800'
                  : 'bg-slate-50 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700',
              )}
            >
              <div className='flex items-center justify-between'>
                <span className='font-medium text-slate-900 dark:text-white'>
                  {v.name}
                </span>
                {i === winnerIdx ? (
                  <TrendUpIcon className='size-3 text-emerald-600 dark:text-emerald-400' />
                ) : null}
              </div>
              <div className='mt-1 text-slate-600 dark:text-gray-300'>
                <span className='font-semibold text-slate-900 dark:text-white'>
                  {((v.conversions / v.exposures) * 100).toFixed(1)}%
                </span>{' '}
                conversion
              </div>
              <div className='text-[10px] text-slate-500 dark:text-gray-400'>
                {v.conversions} / {v.exposures.toLocaleString()} exposures
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className='mt-2 flex items-center justify-center gap-4 text-[10px] text-slate-600 dark:text-gray-300'>
        <span className='flex items-center gap-1'>
          <span className='inline-block size-2 rounded-[2px] bg-blue-500' />
          Control
        </span>
        <span className='flex items-center gap-1'>
          <span className='inline-block size-2 rounded-[2px] bg-emerald-500' />
          Variant A
        </span>
      </div>
    </div>
  )
}

const FeaturesShowcase = () => {
  const { theme } = useTheme()
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { deviceInfo, metainfo } = useLoaderData<typeof loader>()

  const geoOptions = [
    {
      label: t('project.mapping.cc'),
      value: metainfo.country || 'US',
    },
    {
      label: t('project.mapping.rg'),
      value: metainfo.region || 'California',
    },
    {
      label: t('project.mapping.ct'),
      value: metainfo.city || 'San Francisco',
    },
  ]

  const sessionsMedia = (
    <div className='relative space-y-2 overflow-hidden p-4 sm:p-6'>
      <ClientOnly>
        {() => (
          <MetricCardSelect
            classes={{
              value: 'max-md:text-xl md:text-2xl',
              container:
                'rounded-md bg-gray-50 dark:bg-slate-800/60 py-1 px-2 max-w-max',
            }}
            values={geoOptions}
            selectLabel={t('project.geo')}
            valueMapper={({ value }, index) => {
              if (index !== 0) return value || 'N/A'
              if (!value) return t('project.unknownCountry')
              return (
                <div className='flex items-center'>
                  <CCRow size={26} cc={value} language={language} />
                </div>
              )
            }}
          />
        )}
      </ClientOnly>

      <MetricCard
        classes={{
          value: 'max-md:text-xl md:text-3xl',
          container:
            'rounded-md bg-gray-50 dark:bg-slate-800/60 py-1 px-2 max-w-max',
        }}
        label={t('project.mapping.os')}
        value={deviceInfo.os}
        valueMapper={(value: keyof typeof OS_LOGO_MAP) => {
          const logoUrlLight = OS_LOGO_MAP[value]
          const logoUrlDark =
            OS_LOGO_MAP_DARK[value as keyof typeof OS_LOGO_MAP_DARK]
          let logoUrl = theme === 'dark' ? logoUrlDark : logoUrlLight
          logoUrl ||= logoUrlLight

          if (!logoUrl) {
            return (
              <>
                <GlobeIcon className='size-6' />
                &nbsp;{value}
              </>
            )
          }

          return (
            <div className='flex items-center'>
              <img src={logoUrl} className='size-6 dark:fill-gray-50' alt='' />
              &nbsp;{value}
            </div>
          )
        }}
      />

      <MetricCard
        classes={{
          value: 'max-md:text-xl md:text-3xl',
          container:
            'rounded-md bg-gray-50 dark:bg-slate-800/60 py-1 px-2 max-w-max',
        }}
        label={t('project.mapping.br')}
        value={deviceInfo.browser}
        valueMapper={(value: keyof typeof BROWSER_LOGO_MAP) => {
          const logoUrl = BROWSER_LOGO_MAP[value]
          if (!logoUrl) {
            return (
              <>
                <GlobeIcon className='size-6' />
                &nbsp;{value}
              </>
            )
          }
          return (
            <div className='flex items-center'>
              <img src={logoUrl} className='size-6 dark:fill-gray-50' alt='' />
              &nbsp;{value}
            </div>
          )
        }}
      />

      <SdurMetric />

      <div className='absolute right-0 bottom-0 rotate-12 px-2 py-1 opacity-40'>
        {['/home', '/product', 'SALE'].map((path, index) => (
          <div key={path} className='relative pb-8'>
            {index !== 2 && (
              <span
                className='absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200 dark:bg-slate-700'
                aria-hidden='true'
              />
            )}
            <div className='relative flex space-x-3'>
              <span className='flex h-8 w-8 items-center justify-center rounded-full bg-slate-400 dark:bg-slate-800'>
                {path.startsWith('/') ? (
                  <FileTextIcon
                    className='h-5 w-5 text-white'
                    aria-hidden='true'
                  />
                ) : (
                  <CursorClickIcon
                    className='h-5 w-5 text-white'
                    aria-hidden='true'
                  />
                )}
              </span>
              <p className='pt-1.5 text-sm text-gray-700 dark:text-gray-300'>
                <Trans
                  t={t}
                  i18nKey={
                    path.startsWith('/')
                      ? 'project.pageviewX'
                      : 'project.eventX'
                  }
                  components={{
                    value: (
                      <span className='font-medium text-gray-900 dark:text-gray-50' />
                    ),
                    span: <span />,
                  }}
                  values={{ x: path }}
                />
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const featureList = (featureKey: string) => (
    <ul className='mt-2 grid grid-cols-1 gap-2 text-gray-900 sm:grid-cols-2 dark:text-gray-50'>
      {_map(
        t(`main.${featureKey}.features`, { returnObjects: true }),
        (feature: string) => (
          <li
            className='flex items-center gap-2 text-sm text-gray-900 dark:text-gray-50'
            key={feature}
          >
            <CheckIcon className='h-4 w-4' />
            <span>{feature}</span>
          </li>
        ),
      )}
    </ul>
  )

  return (
    <section className='relative mx-auto max-w-7xl px-4 py-14 lg:px-8'>
      <h2 className='text-center text-4xl font-bold text-slate-900 sm:text-5xl dark:text-white'>
        {t('main.coreFeatures')}
      </h2>

      <div className='mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2'>
        <FeatureCard
          size='large'
          title={t('main.web.title')}
          description={
            <>
              {t('main.web.description')}
              {featureList('web')}
            </>
          }
          media={
            <ClientOnly fallback={<PreviewFallback />}>
              {() => <AnalyticsLivePreview />}
            </ClientOnly>
          }
        />
        <FeatureCard
          size='large'
          title={t('main.sessions.title')}
          description={
            <>
              {t('main.sessions.description')}
              {featureList('sessions')}
            </>
          }
          media={sessionsMedia}
        />
      </div>

      <div className='mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <FeatureCard
          title={t('main.performance.title')}
          description={t('main.performance.description')}
          media={
            <ClientOnly fallback={<PreviewFallback />}>
              {() => <PerformancePreview />}
            </ClientOnly>
          }
        />
        <FeatureCard
          title={t('main.errors.title')}
          description={t('main.errors.description')}
          media={
            <ClientOnly fallback={<PreviewFallback />}>
              {() => <ErrorsPreview />}
            </ClientOnly>
          }
        />
        <FeatureCard
          title={t('main.events.title')}
          description={t('main.events.description')}
          media={
            <ClientOnly fallback={<PreviewFallback />}>
              {() => <CustomEventsPreview />}
            </ClientOnly>
          }
        />
        <FeatureCard
          title={t('main.funnels.title')}
          description={t('main.funnels.description')}
          media={
            <ClientOnly fallback={<PreviewFallback />}>
              {() => <FunnelsPreview />}
            </ClientOnly>
          }
        />
        <FeatureCard
          title={t('main.alerts.title')}
          description={t('main.alerts.description')}
          media={
            <ClientOnly fallback={<PreviewFallback />}>
              {() => <AlertsPreview />}
            </ClientOnly>
          }
        />
        <FeatureCard
          title={t('main.cookies.title')}
          description={t('main.cookies.description')}
          media={
            <img
              src='/assets/say-no-to-cookies.png'
              alt=''
              className='h-full w-full object-cover'
            />
          }
        />
        <FeatureCard
          title={t('main.revenue.title')}
          description={t('main.revenue.description')}
          media={
            <ClientOnly fallback={<PreviewFallback />}>
              {() => <RevenuePreview />}
            </ClientOnly>
          }
        />
        <FeatureCard
          title={t('main.featureFlags.title')}
          description={t('main.featureFlags.description')}
          media={
            <ClientOnly fallback={<PreviewFallback />}>
              {() => <FeatureFlagsPreview />}
            </ClientOnly>
          }
        />
        <FeatureCard
          title={t('main.experiments.title')}
          description={t('main.experiments.description')}
          media={
            <ClientOnly fallback={<PreviewFallback />}>
              {() => <ExperimentsPreview />}
            </ClientOnly>
          }
        />
      </div>
    </section>
  )
}

export default function Index() {
  const { metainfo } = useLoaderData<typeof loader>()

  return (
    <div className='overflow-hidden'>
      <main className='bg-gray-50 dark:bg-slate-900'>
        <Hero />

        <FeedbackDual />

        <FeaturesShowcase />

        <MarketingPricing metainfo={metainfo} />

        <FAQ />

        <DitchGoogle />
      </main>
    </div>
  )
}
