import { ArrowRightIcon } from '@heroicons/react/20/solid'
import { StarIcon } from '@heroicons/react/24/solid'
import { SiGithub } from '@icons-pack/react-simple-icons'
import { UAParser } from '@ua-parser-js/pro-business'
import { motion, AnimatePresence } from 'framer-motion'
import _map from 'lodash/map'
import {
  CheckIcon,
  CookieIcon,
  ServerIcon,
  DatabaseIcon,
  FileTextIcon,
  MousePointerClickIcon,
  GlobeIcon,
  GaugeIcon,
  BellRingIcon,
  BugIcon,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import type { LoaderFunctionArgs } from 'react-router'
import { Link, redirect, useLoaderData } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'
import { ClientOnly } from 'remix-utils/client-only'

import { getGeneralStats, getPaymentMetainfo } from '~/api'
import Header from '~/components/Header'
import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import Pricing from '~/components/marketing/Pricing'
import {
  GITHUB_URL,
  LIVE_DEMO_URL,
  isSelfhosted,
  isDisableMarketingPages,
  OS_LOGO_MAP,
  OS_LOGO_MAP_DARK,
  BROWSER_LOGO_MAP,
} from '~/lib/constants'
import { DEFAULT_METAINFO, Metainfo } from '~/lib/models/Metainfo'
import { Stats } from '~/lib/models/Stats'
import CCRow from '~/pages/Project/View/components/CCRow'
import { MetricCard, MetricCardSelect } from '~/pages/Project/View/components/MetricCards'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
import Flag from '~/ui/Flag'
import { cn, getStringFromTime, getTimeFromSeconds } from '~/utils/generic'
import routesPath from '~/utils/routes'

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
    const parser = new UAParser(userAgent)

    deviceInfo = {
      browser: parser.getBrowser().name || null,
      os: parser.getOS().name || null,
    }
  }

  return { deviceInfo }
}

interface FeedbackHighlightProps {
  children: React.ReactNode
}

const FeedbackHighlight = ({ children }: FeedbackHighlightProps) => (
  <span className='bg-yellow-100/80 dark:bg-yellow-400/40'>{children}</span>
)

const FeedbackDual = () => {
  const { theme } = useTheme()

  return (
    <section className='bg-gray-100/80 py-24 sm:py-32 dark:bg-slate-800/50'>
      <div className='mx-auto max-w-7xl px-6 lg:px-8'>
        <div className='mx-auto grid max-w-2xl grid-cols-1 lg:mx-0 lg:max-w-none lg:grid-cols-2'>
          <div className='flex flex-col pb-10 sm:pb-16 lg:pr-8 lg:pb-0 xl:pr-20'>
            <img
              alt='Casterlabs'
              src={theme === 'dark' ? '/assets/users/casterlabs-dark.svg' : '/assets/users/casterlabs-light.svg'}
              className='h-12 self-start'
            />
            <figure className='mt-10 flex flex-auto flex-col justify-between'>
              <blockquote className='text-lg/8 text-gray-900 dark:text-gray-100'>
                <p>
                  "Swetrix has been a <FeedbackHighlight>game changer for our analytics</FeedbackHighlight>. They've
                  always been on top of feature requests and bug reports and have been friendly every step of the way. I
                  can't recommend them enough."
                </p>
              </blockquote>
              <figcaption className='mt-10 flex items-center gap-x-6'>
                <img
                  alt=''
                  src='/assets/users/alex-casterlabs.jpg'
                  className='size-14 rounded-full bg-gray-50 dark:bg-gray-800'
                />
                <div className='text-base'>
                  <div className='font-semibold text-gray-900 dark:text-gray-100'>Alex Bowles</div>
                  <div className='mt-1 text-gray-500 dark:text-gray-400'>Co-founder of Casterlabs</div>
                </div>
              </figcaption>
            </figure>
          </div>
          <div className='flex flex-col border-t border-gray-900/10 pt-10 sm:pt-16 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8 xl:pl-20 dark:border-gray-100/10'>
            <img
              alt='Phalcode'
              src={theme === 'dark' ? '/assets/users/phalcode-dark.svg' : '/assets/users/phalcode-light.svg'}
              className='h-8 self-start'
            />
            <figure className='mt-10 flex flex-auto flex-col justify-between'>
              <blockquote className='text-lg/8 text-gray-900 dark:text-gray-100'>
                <p>
                  "I was confused by Google Analytics so much that I was getting zero actionable insights. Swetrix
                  changed everything -{' '}
                  <FeedbackHighlight>
                    clean dashboard, instant understanding of user behavior, and features that actually matter
                  </FeedbackHighlight>
                  . Finally, analytics that help me make better decisions instead of irritating me."
                </p>
              </blockquote>
              <figcaption className='mt-10 flex items-center gap-x-6'>
                <img
                  alt=''
                  src='/assets/users/alper-phalcode.jpg'
                  className='size-14 rounded-full bg-gray-50 dark:bg-gray-800'
                />
                <div className='text-base'>
                  <div className='font-semibold text-gray-900 dark:text-gray-100'>Alper Alkan</div>
                  <div className='mt-1 text-gray-500 dark:text-gray-400'>Co-founder of Phalcode</div>
                </div>
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  )
}

const WeAreOpensource = () => {
  const { theme } = useTheme()
  const { t } = useTranslation('common')

  return (
    <section className='mx-auto flex w-full max-w-7xl flex-col-reverse items-center justify-between px-5 py-20 lg:flex-row lg:py-32'>
      <img
        className='rounded-xl ring-1 ring-gray-900/10 dark:ring-white/10'
        width='576'
        height='406'
        src={theme === 'dark' ? '/assets/opensource_dark.png' : '/assets/opensource_light.png'}
        loading='lazy'
        alt='Swetrix open source'
      />
      <div className='w-full max-w-lg lg:ml-5'>
        <h2 className='text-4xl font-extrabold text-slate-900 dark:text-white'>
          <Trans
            t={t}
            i18nKey='main.weAreOpensource'
            components={{
              url: (
                <a
                  href={GITHUB_URL}
                  className='underline decoration-dashed hover:decoration-solid'
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label='Source code (opens in a new tab)'
                />
              ),
            }}
          />
        </h2>
        <hr className='my-6 max-w-[346px] border-1 border-slate-300 dark:border-slate-700' />
        <div className='mb-9 w-full max-w-md lg:mb-0'>
          {_map(t('main.opensource', { returnObjects: true }), (item: { desc: string }) => (
            <p key={item.desc} className='mb-3 flex items-center text-sm leading-6 text-slate-700 dark:text-gray-300'>
              <span>
                <CheckIcon className='mr-4 h-6 w-6 text-green-500' />
              </span>
              {item.desc}
            </p>
          ))}
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

const Testimonials = () => {
  const { t } = useTranslation('common')
  const [stats, setStats] = useState<Stats>({} as Stats)

  useEffect(() => {
    getGeneralStats()
      .then((stats) => setStats(stats))
      .catch(console.error)
  }, [])

  return (
    <div className='flex flex-col items-center justify-center gap-3 md:flex-row'>
      <div className='flex -space-x-5 overflow-hidden'>
        {_map(REVIEWERS, ({ name, image }) => (
          <div
            key={`${name}${image}`}
            className='relative inline-flex size-12 overflow-hidden rounded-full border-4 border-gray-50 dark:border-slate-900/90'
          >
            <img alt={name} width='400' height='400' style={{ color: 'transparent' }} src={image} />
          </div>
        ))}
      </div>
      <div className='flex flex-col items-center justify-center gap-1 md:items-start'>
        <div className='relative inline-flex'>
          <StarIcon className='size-5 text-yellow-500' />
          <StarIcon className='size-5 text-yellow-500' />
          <StarIcon className='size-5 text-yellow-500' />
          <StarIcon className='size-5 text-yellow-500' />
          <StarIcon className='size-5 text-yellow-500' />
        </div>
        <div className='text-base text-gray-900/70 dark:text-gray-200'>
          <ClientOnly
            fallback={
              <Trans
                values={{
                  amount: '> 1000',
                }}
                t={t}
                i18nKey='main.understandTheirUsers'
              >
                <span className='font-semibold text-gray-900 dark:text-gray-50' />
              </Trans>
            }
          >
            {() => (
              <Trans
                values={{
                  amount: stats.users || '> 1000',
                }}
                t={t}
                i18nKey='main.understandTheirUsers'
              >
                <span className='font-semibold text-gray-900 dark:text-gray-50' />
              </Trans>
            )}
          </ClientOnly>
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

  return (
    <div className='group relative -mr-6 ml-auto w-[140%] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition-shadow duration-300 ease-out hover:ring-indigo-300/50 sm:-mr-12 sm:w-[160%] lg:-mr-16 lg:w-[180%] xl:-mr-24 2xl:-mr-32 dark:bg-slate-800 dark:ring-white/10 dark:hover:ring-indigo-400/40'>
      <div className='pointer-events-none relative h-[420px] sm:h-[500px] md:h-[580px] lg:h-[640px] xl:h-[700px]'>
        <iframe
          src={`https://swetrix.com/projects/STEzHcB1rALV?tab=traffic&theme=${theme}&embedded=true&lng=${language}`}
          className='size-full'
          title='Swetrix Analytics Live Demo'
          style={{ pointerEvents: 'none' }}
        />
        <div className='pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100'>
          <a
            href={LIVE_DEMO_URL}
            target='_blank'
            rel='noopener noreferrer'
            className='pointer-events-auto inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-black/10 hover:bg-gray-50 dark:bg-slate-900 dark:text-white dark:ring-white/10 dark:hover:bg-slate-800'
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

  return (
    <div className='relative isolate pt-2'>
      <div className='relative mx-2 overflow-hidden rounded-4xl'>
        <div aria-hidden className='pointer-events-none absolute inset-0 -z-10'>
          <div className='absolute inset-0 rounded-4xl bg-linear-115 from-amber-100 from-28% via-purple-500 via-70% to-indigo-600 opacity-50 ring-1 ring-black/5 ring-inset sm:bg-linear-145 dark:opacity-35 dark:ring-white/10' />
          <div className='absolute top-28 -left-24 size-[28rem] rounded-full bg-[radial-gradient(closest-side,#6366f1,transparent)] opacity-25 blur-3xl dark:opacity-20' />
          <div className='absolute -right-16 bottom-[-3rem] size-[26rem] rounded-full bg-[radial-gradient(closest-side,#eef2ff,transparent)] opacity-30 blur-3xl dark:opacity-20' />
        </div>
        <Header transparent />
        <section className='mx-auto max-w-7xl px-4 pt-10 pb-5 sm:px-3 lg:grid lg:grid-cols-12 lg:gap-8 lg:px-6 lg:pt-24 xl:px-8'>
          <div className='z-20 col-span-6 flex flex-col items-start'>
            <Testimonials />
            <h1 className='mt-6 max-w-5xl text-left text-4xl font-semibold tracking-tight text-pretty text-slate-900 sm:text-5xl sm:leading-none lg:text-6xl xl:text-7xl dark:text-white'>
              {t('main.slogan')}
            </h1>
            <p className='mt-4 max-w-2xl text-left text-base text-slate-900 sm:text-lg dark:text-slate-200'>
              {t('main.description')}
            </p>
            <div className='mt-8 flex flex-col items-stretch sm:flex-row sm:items-center'>
              <Link
                to={routesPath.signup}
                className='group flex h-12 items-center justify-center rounded-md bg-slate-900 px-4 text-white ring-1 ring-slate-900 transition-all !duration-300 hover:bg-slate-700 sm:mr-6 dark:bg-indigo-700 dark:ring-indigo-700 dark:hover:bg-indigo-600'
                aria-label={t('titles.signup')}
              >
                <span className='mr-1 text-center text-base font-semibold'>
                  {t('main.startAXDayFreeTrial', { amount: 14 })}
                </span>
                <ArrowRightIcon className='mt-[1px] h-4 w-5 transition-transform group-hover:scale-[1.15]' />
              </Link>
            </div>

            <div className='mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-2'>
              <div className='flex items-center gap-3 text-sm text-slate-900 dark:text-gray-200'>
                <StarIcon className='size-5 text-slate-900 dark:text-gray-200' />
                <span>{t('main.heroBenefits.trial', { days: 14 })}</span>
              </div>
              <div className='flex items-center gap-3 text-sm text-slate-900 dark:text-gray-200'>
                <GaugeIcon className='size-5 text-slate-900 dark:text-gray-200' />
                <span>{t('main.heroBenefits.quickSetup')}</span>
              </div>
              <div className='flex items-center gap-3 text-sm text-slate-900 dark:text-gray-200'>
                <CookieIcon className='size-5 text-slate-900 dark:text-gray-200' />
                <span>{t('main.heroBenefits.cookieless')}</span>
              </div>
              <div className='flex items-center gap-3 text-sm text-slate-900 dark:text-gray-200'>
                <SiGithub className='size-5 text-slate-900 dark:text-gray-200' />
                <span>{t('main.heroBenefits.openSource')}</span>
              </div>
              <div className='flex items-center gap-3 text-sm text-slate-900 dark:text-gray-200'>
                <DatabaseIcon className='size-5 text-slate-900 dark:text-gray-200' />
                <span>{t('main.heroBenefits.dataOwnership')}</span>
              </div>
              <div className='flex items-center gap-3 text-sm text-slate-900 dark:text-gray-200'>
                <ServerIcon className='size-5 text-slate-900 dark:text-gray-200' />
                <span>{t('main.heroBenefits.selfHostable')}</span>
              </div>
            </div>
          </div>
          <div className='col-span-6 mt-10 overflow-visible lg:mt-0 lg:mr-0 lg:ml-4'>
            <ClientOnly
              fallback={
                <div className='h-[380px] w-full rounded-2xl bg-slate-800/10 ring-1 ring-black/5 dark:bg-slate-800/20 dark:ring-white/10' />
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

const FAQ = () => {
  const { t } = useTranslation('common')

  const faqs = [
    { q: 'Is Swetrix cookie-less?', a: 'Yes. We do not use cookies and we are fully GDPR-compliant.' },
    { q: 'Can I self-host?', a: 'Yes. Swetrix is open-source and provides a self-hostable edition.' },
    {
      q: 'Do you support e‑commerce events?',
      a: 'Yes. You can send custom events and properties to track sales and funnels.',
    },
    { q: 'Is there a free trial?', a: 'Yes. You can try Swetrix free for 14 days, no credit card required.' },
    { q: 'Can I export my data?', a: 'Yes. You own your data and can export it any time.' },
  ]

  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className='relative mx-auto max-w-7xl px-6 py-14 lg:px-8'>
      <div aria-hidden className='pointer-events-none absolute inset-0 -z-10'>
        <div className='absolute inset-2 bottom-0 rounded-4xl bg-linear-115 from-[#d6e7ff] via-transparent to-[#f9d2ff] opacity-40 ring-1 ring-black/5 ring-inset sm:bg-linear-145 dark:opacity-25 dark:ring-white/10' />
      </div>
      <h2 className='text-center text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-white'>
        {t('main.faq.title')}
      </h2>
      <div className='mt-8 divide-y rounded-xl bg-white ring-1 ring-black/5 dark:divide-white/10 dark:bg-slate-800 dark:ring-white/10'>
        {faqs.map((item, idx) => {
          const expanded = open === idx
          return (
            <button
              key={item.q}
              onClick={() => setOpen(expanded ? null : idx)}
              className='w-full text-left'
              aria-expanded={expanded}
            >
              <div className='flex items-center justify-between px-5 py-4'>
                <span className='text-base font-medium text-slate-900 dark:text-gray-100'>{item.q}</span>
                <ArrowRightIcon
                  className={cn(
                    'h-5 w-5 text-slate-600 transition-transform dark:text-gray-300',
                    expanded && 'rotate-90',
                  )}
                />
              </div>
              <motion.div
                initial={false}
                animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
                transition={{ duration: 0.2 }}
                className='overflow-hidden px-5'
              >
                <p className='pb-4 text-sm text-slate-700 dark:text-gray-300'>{item.a}</p>
              </motion.div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default function Index() {
  const { isAuthenticated } = useAuth()

  return (
    <div className='overflow-hidden'>
      <main className='bg-gray-50 dark:bg-slate-900'>
        <Hero />

        <FeedbackDual />

        <FeaturesShowcase />

        <FAQ />

        {/* Hiding the Pricing for authenticated users on the main page as the Paddle script only loads on the Billing page */}
        {!isAuthenticated ? <Pricing authenticated={false} /> : null}

        <WeAreOpensource />

        <DitchGoogle />
      </main>
    </div>
  )
}

const FeatureCard = ({ title, description, media }: { title: string; description: string; media: React.ReactNode }) => (
  <div className='flex h-full flex-col overflow-hidden rounded-xl bg-white ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10'>
    <div className='relative h-60 overflow-hidden'>{media}</div>
    <div className='p-6'>
      <h3 className='text-lg font-semibold text-gray-950 dark:text-white'>{title}</h3>
      <p className='mt-1 text-sm text-gray-700 dark:text-gray-300'>{description}</p>
    </div>
  </div>
)

const LargeFeatureCard = ({
  title,
  description,
  media,
}: {
  title: string
  description: React.ReactNode
  media: React.ReactNode
}) => (
  <div className='flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10'>
    <div className='relative h-64 overflow-hidden sm:h-72 md:h-80'>{media}</div>
    <div className='p-6'>
      <h3 className='text-xl font-semibold text-gray-950 dark:text-white'>{title}</h3>
      <p className='mt-1 text-sm text-gray-700 dark:text-gray-300'>{description}</p>
    </div>
  </div>
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
        container: 'rounded-md bg-gray-50 dark:bg-slate-700/60 py-1 px-2 max-w-max',
      }}
      label={t('dashboard.sessionDuration')}
      value={duration}
      valueMapper={(value) => getStringFromTime(getTimeFromSeconds(value))}
    />
  )
}

const AnalyticsLivePreview = () => {
  const { t } = useTranslation('common')
  const [points, setPoints] = useState<number[]>(() => Array.from({ length: 32 }, () => 2 + Math.random() * 10))
  const [live, setLive] = useState(18)

  useEffect(() => {
    const intervalId = setInterval(() => {
      setPoints((prev) => {
        const next = prev.slice(1)
        next.push(Math.max(1, Math.min(14, prev[prev.length - 1] + (Math.random() - 0.5) * 3)))
        return next
      })
      setLive((v) => {
        const n = v + (Math.random() > 0.5 ? 1 : -1) * (Math.random() > 0.6 ? 2 : 1)
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
            { l: t('dashboard.unique'), v: 471 },
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
  const names = ['signup', 'purchase', 'button_click', 'pageview', 'add_to_cart', 'checkout_start', 'newsletter_join']
  const metas = [
    {
      text: 'US • Chrome • iOS',
      flag: <Flag className='rounded-xs' country='US' size={16} alt='' aria-hidden='true' />,
    },
    {
      text: 'France • Edge • Windows',
      flag: <Flag className='rounded-xs' country='FR' size={16} alt='' aria-hidden='true' />,
    },
    {
      text: 'United Kingdom • Safari • macOS',
      flag: <Flag className='rounded-xs' country='GB' size={16} alt='' aria-hidden='true' />,
    },
    {
      text: 'Germany • Firefox • Linux',
      flag: <Flag className='rounded-xs' country='DE' size={16} alt='' aria-hidden='true' />,
    },
    {
      text: 'Ukraine • Chrome • macOS',
      flag: <Flag className='rounded-xs' country='DE' size={16} alt='' aria-hidden='true' />,
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
  const [items, setItems] = useState<EventItem[]>(() => Array.from({ length: 5 }, randomEvent))
  const agos = ['just now', '5 sec ago', '12 sec ago', '18 sec ago', '25 sec ago', '32 sec ago']

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
                <span className='flex size-6 items-center justify-center rounded-md bg-indigo-500/10 ring-1 ring-indigo-500/30'>
                  <MousePointerClickIcon className='size-4 text-indigo-600 dark:text-indigo-400' />
                </span>
                <div>
                  <div className='font-medium text-slate-900 dark:text-gray-50'>{ev.name}</div>
                  <div className='text-xs text-slate-600 dark:text-gray-400'>{ev.meta}</div>
                </div>
              </div>
              <div className='text-xs whitespace-nowrap text-slate-500 dark:text-gray-400'>{agos[index]}</div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}

// Animated performance metrics (Web Vitals style)
const PerformancePreview = () => {
  const [score, setScore] = useState(82)
  const [lcp, setLcp] = useState(2.4)
  const [fid, setFid] = useState(95)
  const [cls, setCls] = useState(0.08)
  const [fcp, setFcp] = useState(1.8)

  useEffect(() => {
    const id = setInterval(() => {
      setScore((s) => Math.max(68, Math.min(96, Math.round(s + (Math.random() - 0.5) * 4))))
      setLcp((v) => Math.max(1.6, Math.min(3.2, +(v + (Math.random() - 0.5) * 0.2).toFixed(1))))
      setFid((v) => Math.max(40, Math.min(140, Math.round(v + (Math.random() - 0.5) * 8))))
      setCls((v) => Math.max(0.01, Math.min(0.15, +(v + (Math.random() - 0.5) * 0.01).toFixed(2))))
      setFcp((v) => Math.max(0.9, Math.min(2.8, +(v + (Math.random() - 0.5) * 0.15).toFixed(1))))
    }, 1200)
    return () => clearInterval(id)
  }, [])

  const circumference = 2 * Math.PI * 26
  const ratio = score / 100
  const dash = circumference * ratio

  const metric = (label: string, value: string, color: string) => (
    <div className='rounded-lg bg-white p-3 shadow-sm ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10'>
      <div className='text-xs text-slate-600 dark:text-gray-300'>{label}</div>
      <div className='mt-1 text-lg font-semibold text-slate-900 dark:text-white'>{value}</div>
      <div className={`mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700`}>
        <motion.div
          className={`h-1.5 rounded-full ${color}`}
          initial={{ width: '45%' }}
          animate={{ width: `${40 + Math.round(Math.random() * 40)}%` }}
          transition={{ duration: 1.2 }}
        />
      </div>
    </div>
  )

  return (
    <div className='h-full w-full bg-gradient-to-b from-white to-slate-50 p-4 sm:p-6 dark:from-slate-800 dark:to-slate-900'>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <div className='flex items-center justify-center rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10'>
          <svg viewBox='0 0 64 64' className='mr-3 h-16 w-16 -rotate-90'>
            <circle cx='32' cy='32' r='26' stroke='#e5e7eb' strokeWidth='7' fill='none' />
            <motion.circle
              cx='32'
              cy='32'
              r='26'
              stroke='#10b981'
              strokeWidth='7'
              strokeLinecap='round'
              fill='none'
              strokeDasharray={`${dash} ${circumference}`}
              animate={{ strokeDasharray: [`0 ${circumference}`, `${dash} ${circumference}`] }}
              transition={{ duration: 1.2 }}
            />
          </svg>
          <div>
            <div className='text-xs text-slate-600 dark:text-gray-300'>Performance score</div>
            <div className='text-2xl font-bold text-slate-900 dark:text-white'>{score}</div>
            <div className='text-xs text-emerald-600 dark:text-emerald-400'>Good</div>
          </div>
        </div>
        {metric('LCP', `${lcp}s`, 'bg-emerald-500')}
        {metric('FID', `${fid}ms`, 'bg-indigo-500')}
        {metric('CLS', `${cls}`, 'bg-amber-500')}
        {metric('FCP', `${fcp}s`, 'bg-rose-500')}
      </div>
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
  const [logs, setLogs] = useState<LogItem[]>(() => Array.from({ length: 5 }, () => randomLog()))
  const agos = ['just now', '5 sec ago', '12 sec ago', '18 sec ago', '25 sec ago', '32 sec ago']

  useEffect(() => {
    const id = setInterval(() => setLogs((prev) => [randomLog(), ...prev].slice(0, 6)), 4800)
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
                <div className='text-rose-700 dark:text-rose-200'>{log.message}</div>
              </div>
              <div className='text-xs whitespace-nowrap text-rose-600 dark:text-rose-300'>{agos[index]}</div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}

// Animated funnels preview
const FunnelsPreview = () => {
  const steps = [
    { label: 'Visited', base: 100 },
    { label: 'Signed up', base: 65 },
    { label: 'Activated', base: 42 },
    { label: 'Purchased', base: 18 },
  ]
  const [seed, setSeed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSeed((s) => s + 1), 1400)
    return () => clearInterval(id)
  }, [])
  return (
    <div className='h-full w-full bg-gradient-to-b from-white to-slate-50 p-4 sm:p-6 dark:from-slate-800 dark:to-slate-900'>
      <div className='rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10'>
        <div className='mb-2 text-xs font-medium text-slate-600 dark:text-gray-300'>Sample funnel</div>
        <div className='space-y-3'>
          {steps.map((s, idx) => {
            const fluctuation = ((seed + idx) % 5) - 2
            const val = Math.max(5, Math.min(100, s.base + fluctuation))
            return (
              <div key={s.label}>
                <div className='mb-1 flex items-center justify-between text-xs text-slate-600 dark:text-gray-300'>
                  <span>{s.label}</span>
                  <span>{val}%</span>
                </div>
                <div className='h-2 rounded-full bg-slate-200 dark:bg-slate-700'>
                  <motion.div
                    className='h-2 rounded-full bg-indigo-500'
                    initial={{ width: '0%' }}
                    animate={{ width: `${val}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Animated alerts preview: telegram-like message feed
type ChatItem = { id: string; kind: 'error' | 'online' | 'no-traffic' }
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
const randomChatItem = (): ChatItem => {
  const kinds: ChatItem['kind'][] = ['error', 'online']
  return { id: Math.random().toString(36).slice(2), kind: pick(kinds) }
}

const AlertsPreview = () => {
  const [items, setItems] = useState<ChatItem[]>(() => Array.from({ length: 3 }, () => randomChatItem()))

  const agos = ['just now', '7 sec ago', '52 sec ago', '2 min ago', '6 min ago']

  useEffect(() => {
    const id = setInterval(() => setItems((prev) => [randomChatItem(), ...prev].slice(0, 5)), 5140)
    return () => clearInterval(id)
  }, [])

  const renderMessage = (it: ChatItem, index: number) => {
    if (it.kind === 'error') {
      return (
        <div className='rounded-2xl bg-white p-3 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10'>
          <div className='mb-1 flex items-center gap-2 text-slate-900 dark:text-white'>
            <BugIcon className='size-4 text-rose-600 dark:text-rose-400' />
            <span className='text-sm'>
              Error alert <span className='font-semibold'>Unique error</span> triggered!
            </span>
          </div>
          <div className='font-mono text-[13px] leading-5 break-words whitespace-pre-wrap text-slate-800 dark:text-gray-200'>
            Project: Demo
            <br />
            Error: NetworkError: Failed to fetch /api/data
          </div>
          <div className='mt-2 text-xs whitespace-nowrap text-slate-500 dark:text-gray-400'>{agos[index]}</div>
        </div>
      )
    }

    if (it.kind === 'online') {
      const online = 10 + Math.floor(Math.random() * 10)

      return (
        <div className='rounded-2xl bg-white p-3 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10'>
          <div className='mb-1 flex items-center gap-2 text-slate-900 dark:text-white'>
            <BellRingIcon className='size-4 text-amber-600 dark:text-amber-400' />
            <span className='text-sm'>
              Alert <span className='font-semibold'>Online &gt;= 10</span> got triggered!
            </span>
          </div>
          <div className='text-[13px] leading-5 text-slate-800 dark:text-gray-200'>
            Your project <span className='font-semibold'>Example</span> has {online} online users right now!
          </div>
          <div className='mt-2 text-xs whitespace-nowrap text-slate-500 dark:text-gray-400'>{agos[index]}</div>
        </div>
      )
    }

    return (
      <div className='rounded-2xl bg-white p-3 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10'>
        <div className='mb-1 flex items-center gap-2 text-slate-900 dark:text-white'>
          <BellRingIcon className='size-4 text-amber-600 dark:text-amber-400' />
          <span className='text-sm'>
            Alert <span className='font-semibold'>No traffic</span> got triggered!
          </span>
        </div>
        <div className='text-[13px] leading-5 text-slate-800 dark:text-gray-200'>
          Your project <span className='font-semibold'>Demo</span> has had no traffic for the last 24 hours!
        </div>
        <div className='mt-2 text-xs whitespace-nowrap text-slate-500 dark:text-gray-400'>{agos[index]}</div>
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

const FeaturesShowcase = () => {
  const { theme } = useTheme()
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const [metainfo, setMetainfo] = useState<Metainfo>(DEFAULT_METAINFO)
  const { deviceInfo } = useLoaderData<typeof loader>()

  useEffect(() => {
    const abortController = new AbortController()

    getPaymentMetainfo({ signal: abortController.signal })
      .then(setMetainfo)
      .catch(() => {})

    return () => abortController.abort()
  }, [])

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

  return (
    <section className='relative mx-auto max-w-7xl px-6 py-14 lg:px-8'>
      <div aria-hidden className='pointer-events-none absolute inset-0 -z-10'>
        <div className='absolute inset-x-0 -top-10 h-40 bg-gradient-to-b from-indigo-200/50 to-transparent blur-2xl dark:from-indigo-500/20' />
        <div className='absolute top-1/4 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,#ee87cb,transparent_70%)] opacity-30 blur-3xl dark:opacity-20' />
      </div>
      <div className='mx-auto w-fit'>
        <h2 className='text-center text-4xl font-extrabold text-slate-900 sm:text-5xl dark:text-white'>
          {t('main.coreFeatures')}
        </h2>
      </div>
      <div className='mt-8 grid grid-cols-2 gap-4 sm:mt-12'>
        <LargeFeatureCard
          title={t('main.web.title')}
          description={
            <>
              {t('main.web.description')}
              <ul className='mt-2 grid grid-cols-1 gap-2 text-gray-900 sm:grid-cols-2 dark:text-gray-50'>
                {_map(t('main.web.features', { returnObjects: true }), (feature: string) => (
                  <li className='flex items-center gap-2 text-sm text-gray-900 dark:text-gray-50' key={feature}>
                    <CheckIcon className='h-4 w-4' strokeWidth={1.5} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </>
          }
          media={<AnalyticsLivePreview />}
        />
        <LargeFeatureCard
          title={t('main.sessions.title')}
          description={
            <>
              {t('main.sessions.description')}
              <ul className='mt-2 grid grid-cols-1 gap-2 text-gray-900 sm:grid-cols-2 dark:text-gray-50'>
                {_map(t('main.sessions.features', { returnObjects: true }), (feature: string) => (
                  <li className='flex items-center gap-2 text-sm text-gray-900 dark:text-gray-50' key={feature}>
                    <CheckIcon className='h-4 w-4' strokeWidth={1.5} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </>
          }
          media={
            <div className='relative space-y-2 overflow-hidden px-10 pt-5'>
              <ClientOnly>
                {() => (
                  <MetricCardSelect
                    classes={{
                      value: 'max-md:text-xl md:text-2xl',
                      container: 'rounded-md bg-gray-50 dark:bg-slate-700/60 py-1 px-2 max-w-max',
                    }}
                    values={geoOptions}
                    selectLabel={t('project.geo')}
                    valueMapper={({ value }, index) => {
                      if (index !== 0) {
                        return value || 'N/A'
                      }

                      if (!value) {
                        return t('project.unknownCountry')
                      }

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
                  container: 'rounded-md bg-gray-50 dark:bg-slate-700/60 py-1 px-2 max-w-max',
                }}
                label={t('project.mapping.os')}
                value={deviceInfo.os}
                valueMapper={(value: keyof typeof OS_LOGO_MAP) => {
                  const logoPathLight = OS_LOGO_MAP[value]
                  const logoPathDark = OS_LOGO_MAP_DARK[value as keyof typeof OS_LOGO_MAP_DARK]

                  let logoPath = theme === 'dark' ? logoPathDark : logoPathLight
                  logoPath ||= logoPathLight

                  if (!logoPath) {
                    return (
                      <>
                        <GlobeIcon className='size-6' />
                        &nbsp;
                        {value}
                      </>
                    )
                  }
                  const logoUrl = `/${logoPath}`

                  return (
                    <div className='flex items-center'>
                      <img src={logoUrl} className='size-6 dark:fill-gray-50' alt='' />
                      &nbsp;
                      {value}
                    </div>
                  )
                }}
              />

              <MetricCard
                classes={{
                  value: 'max-md:text-xl md:text-3xl',
                  container: 'rounded-md bg-gray-50 dark:bg-slate-700/60 py-1 px-2 max-w-max',
                }}
                label={t('project.mapping.br')}
                value={deviceInfo.browser}
                valueMapper={(value: keyof typeof BROWSER_LOGO_MAP) => {
                  const logoUrl = BROWSER_LOGO_MAP[value]

                  if (!logoUrl) {
                    return (
                      <>
                        <GlobeIcon className='size-6' />
                        &nbsp;
                        {value}
                      </>
                    )
                  }

                  return (
                    <div className='flex items-center'>
                      <img src={logoUrl} className='size-6 dark:fill-gray-50' alt='' />
                      &nbsp;
                      {value}
                    </div>
                  )
                }}
              />

              <SdurMetric />

              <div className='absolute right-0 bottom-0 rotate-12 rounded-md bg-gray-50 px-2 py-1 opacity-20 transition-all group-hover:scale-110 group-hover:rotate-6 group-hover:opacity-50 dark:bg-slate-700/60'>
                {['/home', '/product', 'SALE'].map((path, index) => (
                  <div key={path} className='relative pb-8'>
                    {index !== 2 ? (
                      <span
                        className='absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200 dark:bg-slate-700'
                        aria-hidden='true'
                      />
                    ) : null}
                    <div className='relative flex space-x-3'>
                      <div>
                        <span className='flex h-8 w-8 items-center justify-center rounded-full bg-slate-400 dark:bg-slate-800'>
                          {path.startsWith('/') ? (
                            <FileTextIcon className='h-5 w-5 text-white' aria-hidden='true' strokeWidth={1.5} />
                          ) : (
                            <MousePointerClickIcon
                              className='h-5 w-5 text-white'
                              aria-hidden='true'
                              strokeWidth={1.5}
                            />
                          )}
                        </span>
                      </div>
                      <p className='pt-1.5 text-sm text-gray-700 dark:text-gray-300'>
                        <Trans
                          t={t}
                          i18nKey={path.startsWith('/') ? 'project.pageviewX' : 'project.eventX'}
                          components={{
                            value: <span className='font-medium text-gray-900 dark:text-gray-50' />,
                            span: <span />,
                          }}
                          values={{
                            x: path,
                          }}
                        />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
        />
      </div>
      <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
        <FeatureCard
          title={t('main.performance.title')}
          description={t('main.performance.description')}
          media={<PerformancePreview />}
        />
        <FeatureCard
          title={t('main.errors.title')}
          description={t('main.errors.description')}
          media={<ErrorsPreview />}
        />
        <FeatureCard
          title={t('main.events.title')}
          description={t('main.events.description')}
          media={<CustomEventsPreview />}
        />
        <FeatureCard
          title={t('main.funnels.title')}
          description={t('main.funnels.description')}
          media={<FunnelsPreview />}
        />
        <FeatureCard
          title={t('main.alerts.title')}
          description={t('main.alerts.description')}
          media={<AlertsPreview />}
        />
        <FeatureCard
          title={t('main.cookies.title')}
          description={t('main.cookies.description')}
          media={<img src='/assets/say-no-to-cookies.png' alt='' className='h-full w-full object-cover' />}
        />
      </div>
    </section>
  )
}
