import { ArrowRightIcon } from '@heroicons/react/20/solid'
import { StarIcon } from '@heroicons/react/24/solid'
import { SiGithub } from '@icons-pack/react-simple-icons'
import { UAParser } from '@ua-parser-js/pro-business'
import { motion } from 'framer-motion'
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
import { LogoTimeline } from '~/components/marketing/LogoTimeline'
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
    name: 'Tomasz',
    image: '/assets/small-testimonials/tomasz.png',
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
  const { theme } = useTheme()
  const {
    i18n: { language },
  } = useTranslation('common')

  return (
    <div className='group relative -mr-6 ml-auto w-[140%] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 sm:-mr-12 sm:w-[160%] lg:-mr-16 lg:w-[180%] xl:-mr-24 2xl:-mr-32 dark:bg-slate-800 dark:ring-white/10'>
      <div className='pointer-events-none relative h-[420px] sm:h-[500px] md:h-[580px] lg:h-[640px] xl:h-[700px]'>
        <iframe
          src={`https://swetrix.com/projects/STEzHcB1rALV?tab=traffic&theme=${theme}&embedded=true&lng=${language}`}
          className='size-full'
          title='Swetrix Analytics Live Demo'
          style={{ pointerEvents: 'none' }}
        />
        <div className='absolute inset-0 hidden items-center justify-center bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-200 group-hover:flex'>
          <a
            href={LIVE_DEMO_URL}
            target='_blank'
            rel='noopener noreferrer'
            className='pointer-events-auto inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-black/10 hover:bg-gray-50 dark:bg-slate-900 dark:text-white dark:ring-white/10 dark:hover:bg-slate-800'
            aria-label='Open live demo in a new tab'
          >
            <ArrowRightIcon className='mr-2 h-4 w-4' />
            See the live demo
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

const TrafficInsightsPreview = () => (
  <div className='h-full w-full bg-gradient-to-b from-white to-slate-50 p-4 sm:p-6 dark:from-slate-800 dark:to-slate-900'>
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
      <div className='space-y-4'>
        <div className='rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10'>
          <div className='text-xs text-slate-600 dark:text-gray-300'>Session duration</div>
          <div className='mt-1 flex items-baseline gap-2'>
            <div className='text-2xl font-bold text-slate-900 dark:text-white'>3m 23s</div>
            <span className='rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-600 ring-1 ring-emerald-500/20'>
              +3%
            </span>
          </div>
          <div className='mt-3 h-14 rounded-md bg-gradient-to-t from-emerald-200 via-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:via-emerald-800/30 dark:to-emerald-700/20' />
        </div>

        <div className='rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10'>
          <div className='text-xs text-slate-600 dark:text-gray-300'>Bounce rate</div>
          <div className='mt-1 flex items-baseline gap-2'>
            <div className='text-2xl font-bold text-slate-900 dark:text-white'>46%</div>
            <span className='rounded bg-rose-500/10 px-1.5 py-0.5 text-xs font-medium text-rose-600 ring-1 ring-rose-500/20'>
              -2%
            </span>
          </div>
          <div className='mt-3 h-14 rounded-md bg-gradient-to-t from-rose-200 via-rose-100 to-rose-50 dark:from-rose-900/40 dark:via-rose-800/30 dark:to-rose-700/20' />
        </div>
      </div>

      <div className='rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10'>
        <div className='mb-2 text-xs font-medium text-slate-600 dark:text-gray-300'>Top sources</div>
        <div className='divide-y divide-slate-100 dark:divide-white/10'>
          {[
            { label: 'Twitter', pct: '10%', value: '412' },
            { label: 'Google', pct: '49%', value: '2,039' },
            { label: 'Japan', pct: '15%', value: '751' },
            { label: 'United States', pct: '37%', value: '1,842' },
          ].map((row) => (
            <div key={row.label} className='flex items-center justify-between py-2.5'>
              <div className='flex items-center gap-2'>
                <span className='inline-block size-2.5 rounded-full bg-slate-400' />
                <span className='text-sm text-slate-800 dark:text-gray-200'>{row.label}</span>
              </div>
              <div className='flex items-center gap-4'>
                <span className='text-xs text-slate-600 dark:text-gray-400'>{row.pct}</span>
                <span className='text-sm font-medium text-slate-900 dark:text-white'>{row.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
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
          media={<TrafficInsightsPreview />}
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
          media={
            <img
              className='h-full w-full object-cover object-left'
              src={theme === 'dark' ? '/assets/performance_part_dark.png' : '/assets/performance_part_light.png'}
              alt='Web Vitals and performance metrics'
            />
          }
        />
        <FeatureCard
          title={t('main.errors.title')}
          description={t('main.errors.description')}
          media={
            <img
              className='h-full w-full object-cover object-left'
              src={theme === 'dark' ? '/assets/performance_part_dark.png' : '/assets/performance_part_light.png'}
              alt=''
            />
          }
        />
        <FeatureCard
          title={t('main.events.title')}
          description={t('main.events.description')}
          media={
            <img
              className='h-full w-full object-cover object-left'
              src={theme === 'dark' ? '/assets/custom_events_dark.png' : '/assets/custom_events_light.png'}
              alt='Custom events'
            />
          }
        />
        <FeatureCard
          title={t('main.funnels.title')}
          description={t('main.funnels.description')}
          media={
            <img
              className='h-full w-full object-cover object-left'
              src={theme === 'dark' ? '/assets/funnel_dark.png' : '/assets/funnel_light.png'}
              alt='Funnels and user flows'
            />
          }
        />
        <FeatureCard
          title={t('main.alerts.title')}
          description={t('main.alerts.description')}
          media={<LogoTimeline />}
        />
        <FeatureCard
          title={t('main.cookies.title')}
          description={t('main.cookies.description')}
          media={
            <div className='flex h-full items-center justify-center bg-gradient-to-br from-amber-100 to-pink-100/40 dark:from-slate-700 dark:to-slate-900'>
              <CookieIcon className='size-10 text-amber-700 dark:text-amber-400' />
            </div>
          }
        />
      </div>
    </section>
  )
}
