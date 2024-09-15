import type { LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, Link } from '@remix-run/react'
import { json, redirect } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'
import { UAParser } from 'ua-parser-js'
import { motion } from 'framer-motion'

import { detectTheme, isAuthenticated } from 'utils/server'

import { useTranslation, Trans } from 'react-i18next'
import { useSelector } from 'react-redux'
import { ClientOnly } from 'remix-utils/client-only'
import { CheckCircleIcon, StarIcon } from '@heroicons/react/24/solid'
import { ArrowRightIcon } from '@heroicons/react/20/solid'
import _map from 'lodash/map'

import routesPath from 'utils/routes'
import { getAccessToken } from 'utils/accessToken'
import { getStringFromTime, getTimeFromSeconds } from 'utils/generic'
import {
  GITHUB_URL,
  LIVE_DEMO_URL,
  isBrowser,
  isSelfhosted,
  OS_LOGO_MAP,
  OS_LOGO_MAP_DARK,
  BROWSER_LOGO_MAP,
} from 'redux/constants'
import { StateType } from 'redux/store/index'
import BackgroundSvg from 'ui/icons/BackgroundSvg'

import Header from 'components/Header'
import Pricing from 'components/marketing/Pricing'
import { DitchGoogle } from 'components/marketing/DitchGoogle'
import { Lines } from 'components/marketing/Lines'
import React, { useEffect, useState } from 'react'
import clsx from 'clsx'
import { MetricCard, MetricCardSelect } from 'pages/Project/View/components/MetricCards'
import CCRow from 'pages/Project/View/components/CCRow'
import { CursorArrowRaysIcon, GlobeAltIcon, NewspaperIcon } from '@heroicons/react/24/outline'
import { LogoTimeline } from 'components/marketing/LogoTimeline'
import { MarketplaceCluster } from 'components/marketing/MarketplaceCluster'

export const sitemap: SitemapFunction = () => ({
  priority: 1,
  exclude: isSelfhosted,
})

export async function loader({ request }: LoaderFunctionArgs) {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  const [theme] = detectTheme(request)
  const isAuth = isAuthenticated(request)

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

  return json({ theme, isAuth, deviceInfo })
}

const Problem = () => {
  const { t } = useTranslation('common')

  return (
    <section className='bg-neutral-600'>
      <div className='mx-auto max-w-7xl px-8 py-16 text-center md:py-32'>
        <h2 className='mb-6 text-4xl font-extrabold text-gray-50 sm:text-5xl sm:leading-none md:mb-8'>
          Most people struggle to make sense of their analytics data
        </h2>
        <p className='mx-auto mb-12 max-w-prose text-lg font-bold leading-relaxed text-gray-100 opacity-80 md:mb-20'>
          Many web analytics solutions are either too complex and overwhelming, or too simple and don't provide enough
          insight. Business owners don't understand their customers and lose money.
        </p>

        <div className='flex flex-col items-center justify-center gap-6 text-gray-50 md:flex-row md:items-start'>
          <div className='flex w-full flex-col items-center justify-center gap-2 md:w-48'>
            <span className='text-4xl'>🤔</span>
            <p className='font-bold'>Business owner collects web data</p>
          </div>
          <svg
            className='w-12 shrink-0 fill-gray-200 opacity-70 max-md:-scale-x-100 md:-rotate-90'
            viewBox='0 0 138 138'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <g>
              <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M72.9644 5.31431C98.8774 43.8211 83.3812 88.048 54.9567 120.735C54.4696 121.298 54.5274 122.151 55.0896 122.639C55.6518 123.126 56.5051 123.068 56.9922 122.506C86.2147 88.9044 101.84 43.3918 75.2003 3.80657C74.7866 3.18904 73.9486 3.02602 73.3287 3.44222C72.7113 3.85613 72.5484 4.69426 72.9644 5.31431Z'
              />
              <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M56.5084 121.007C56.9835 118.685 57.6119 115.777 57.6736 115.445C59.3456 106.446 59.5323 97.67 58.4433 88.5628C58.3558 87.8236 57.6824 87.2948 56.9433 87.3824C56.2042 87.4699 55.6756 88.1435 55.7631 88.8828C56.8219 97.7138 56.6432 106.225 55.0203 114.954C54.926 115.463 53.5093 121.999 53.3221 123.342C53.2427 123.893 53.3688 124.229 53.4061 124.305C53.5887 124.719 53.8782 124.911 54.1287 125.015C54.4123 125.13 54.9267 125.205 55.5376 124.926C56.1758 124.631 57.3434 123.699 57.6571 123.487C62.3995 120.309 67.4155 116.348 72.791 113.634C77.9171 111.045 83.3769 109.588 89.255 111.269C89.9704 111.475 90.7181 111.057 90.9235 110.342C91.1288 109.626 90.7117 108.878 89.9963 108.673C83.424 106.794 77.3049 108.33 71.5763 111.223C66.2328 113.922 61.2322 117.814 56.5084 121.007Z'
              />
            </g>
          </svg>
          <div className='flex w-full flex-col items-center justify-center gap-2 md:w-48'>
            <span className='text-4xl'>😕</span>
            <p className='font-bold'>
              Overwhelmed by <u>complex dashboards</u> or limited by oversimplified metrics
            </p>
          </div>
          <svg
            className='w-12 shrink-0 fill-gray-200 opacity-70 md:-rotate-90 md:-scale-x-100'
            viewBox='0 0 138 138'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <g>
              <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M72.9644 5.31431C98.8774 43.8211 83.3812 88.048 54.9567 120.735C54.4696 121.298 54.5274 122.151 55.0896 122.639C55.6518 123.126 56.5051 123.068 56.9922 122.506C86.2147 88.9044 101.84 43.3918 75.2003 3.80657C74.7866 3.18904 73.9486 3.02602 73.3287 3.44222C72.7113 3.85613 72.5484 4.69426 72.9644 5.31431Z'
              />
              <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M56.5084 121.007C56.9835 118.685 57.6119 115.777 57.6736 115.445C59.3456 106.446 59.5323 97.67 58.4433 88.5628C58.3558 87.8236 57.6824 87.2948 56.9433 87.3824C56.2042 87.4699 55.6756 88.1435 55.7631 88.8828C56.8219 97.7138 56.6432 106.225 55.0203 114.954C54.926 115.463 53.5093 121.999 53.3221 123.342C53.2427 123.893 53.3688 124.229 53.4061 124.305C53.5887 124.719 53.8782 124.911 54.1287 125.015C54.4123 125.13 54.9267 125.205 55.5376 124.926C56.1758 124.631 57.3434 123.699 57.6571 123.487C62.3995 120.309 67.4155 116.348 72.791 113.634C77.9171 111.045 83.3769 109.588 89.255 111.269C89.9704 111.475 90.7181 111.057 90.9235 110.342C91.1288 109.626 90.7117 108.878 89.9963 108.673C83.424 106.794 77.3049 108.33 71.5763 111.223C66.2328 113.922 61.2322 117.814 56.5084 121.007Z'
              />
            </g>
          </svg>
          <div className='flex w-full flex-col items-center justify-center gap-2 md:w-48'>
            <span className='text-4xl'>📉</span>
            <p className='font-bold'>Makes uninformed decisions, missing opportunities for growth</p>
          </div>
        </div>
      </div>
    </section>
  )
}

interface IFeedback {
  name: string
  title: string
  feedback: string
  logoUrl: string
  photoUrl: string
}

const Feedback = ({ name, title, feedback, logoUrl, photoUrl }: IFeedback) => (
  <section className='relative isolate bg-white px-6 py-24 dark:bg-slate-900 sm:py-32 lg:px-8'>
    <div className='absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.indigo.100),white)] opacity-20 blur-3xl dark:bg-[radial-gradient(45rem_50rem_at_top,theme(colors.indigo.400),theme(colors.slate.900))]' />
    <div className='absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] border-r-2 border-slate-900/10 bg-white dark:border-slate-50/50 dark:bg-slate-900 sm:mr-28 lg:mr-0 xl:mr-16 xl:origin-center' />
    <div className='mx-auto max-w-2xl lg:max-w-4xl'>
      <img alt='' src={logoUrl} className='mx-auto h-12' />
      <figure className='mt-10'>
        <blockquote className='text-center text-xl font-semibold leading-8 text-gray-900 dark:text-gray-50 sm:text-2xl sm:leading-9'>
          <p>{`“${feedback}”`}</p>
        </blockquote>
        <figcaption className='mt-10'>
          <img alt='' src={photoUrl} className='mx-auto h-10 w-10 rounded-full' />
          <div className='mt-4 flex items-center justify-center space-x-3 text-base'>
            <p className='font-semibold text-gray-900 dark:text-gray-50'>{name}</p>
            <svg width={3} height={3} viewBox='0 0 2 2' aria-hidden='true' className='fill-gray-900'>
              <circle r={1} cx={1} cy={1} />
            </svg>
            <p className='text-gray-600 dark:text-gray-200'>{title}</p>
          </div>
        </figcaption>
      </figure>
    </div>
  </section>
)

const OpensourceAdvantages = ({ theme }: { theme: 'dark' | 'light' }) => {
  const { t } = useTranslation('common')

  return (
    <section className='mx-auto flex w-full max-w-7xl flex-col-reverse items-center justify-between px-5 py-20 lg:flex-row lg:py-32'>
      <picture>
        <source
          srcSet={theme === 'dark' ? '/assets/opensource_dark.webp' : '/assets/opensource_light.webp'}
          type='image/webp'
        />
        <img
          className='rounded-xl ring-1 ring-gray-900/10 dark:ring-white/10'
          width='576'
          height='406'
          src={theme === 'dark' ? '/assets/opensource_dark.png' : '/assets/opensource_light.png'}
          loading='lazy'
          alt='Swetrix open source'
        />
      </picture>
      <div className='w-full max-w-lg lg:ml-5'>
        <h2 className='text-4xl font-extrabold text-slate-900 dark:text-white md:text-4xl'>
          <Trans
            t={t}
            i18nKey='main.opensourceAdv'
            components={{
              // eslint-disable-next-line jsx-a11y/anchor-has-content
              url: (
                <a
                  href={GITHUB_URL}
                  className='hover:underline'
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label='Source code (opens in a new tab)'
                />
              ),
            }}
          />
        </h2>
        <hr className='border-1 my-6 max-w-[346px] border-slate-300 dark:border-slate-700' />
        <div className='mb-9 w-full max-w-md lg:mb-0'>
          {_map(t('main.opensource', { returnObjects: true }), (item: { desc: string }) => (
            <p key={item.desc} className='mb-3 flex items-center text-sm leading-6 text-slate-700 dark:text-gray-300'>
              <span>
                <CheckCircleIcon className='mr-4 h-6 w-6 text-indigo-500' />
              </span>
              {item.desc}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}

const CoreFeatures = ({ theme }: { theme: 'dark' | 'light' }) => {
  const { t } = useTranslation('common')

  return (
    <section className='relative bg-white pb-14 pt-14 dark:bg-slate-900'>
      <BackgroundSvg theme={theme} className='absolute -left-8' type='shapes' />
      <div className='relative mx-auto w-fit text-4xl font-extrabold text-slate-900 sm:text-5xl'>
        <h2 className='relative z-20 dark:text-white'>{t('main.coreFeaturesBlock')}</h2>
        <BackgroundSvg
          theme={theme}
          className='absolute right-0 top-9 z-10 opacity-30 sm:-right-16'
          type='semicircle'
        />
      </div>
      <div className='mx-auto mt-[60px] flex w-full max-w-7xl flex-wrap items-center justify-center xl:justify-between'>
        {_map(
          // @ts-expect-error
          t('main.features', { returnObjects: true }),
          (
            item: {
              name: string
              desc: string
            },
            index: number,
          ) => (
            <div key={item.name} className='h-64 w-[416px] px-7 py-11 text-center'>
              <span className='text-4xl font-semibold text-indigo-500'>{1 + index}</span>
              <div className='mt-2'>
                <h2 className='mx-auto mb-3 max-w-[300px] whitespace-pre-line text-xl font-semibold text-slate-900 dark:text-white'>
                  {item.name}
                </h2>
                <p className='mx-auto max-w-xs leading-relaxed text-gray-600 dark:text-gray-400'>{item.desc}</p>
              </div>
            </div>
          ),
        )}
      </div>
      <BackgroundSvg theme={theme} className='absolute bottom-0 right-0 z-10' type='twolinecircle' />
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
  const { stats } = useSelector((state: StateType) => state.ui.misc)

  return (
    <div className='mt-8 flex flex-col items-center justify-center gap-3 md:flex-row'>
      <div className='flex -space-x-5 overflow-hidden'>
        {_map(REVIEWERS, ({ name, image }) => (
          <div
            key={`${name}${image}`}
            className='relative inline-flex size-12 overflow-hidden rounded-full border-4 border-gray-50 dark:border-slate-900'
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
                  // TODO: Move this stuff to loader so there won't be flickering
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

const Highlighted = ({ children }: { children: React.ReactNode }) => (
  <span className='relative whitespace-nowrap'>
    <span className='absolute -bottom-1 -left-2 -right-2 -top-1 -rotate-1 bg-slate-900 dark:bg-gray-200 md:-bottom-0 md:-left-3 md:-right-3 md:-top-0' />
    <span className='relative text-gray-50 dark:text-slate-900'>{children}</span>
  </span>
)

interface FeatureBlockProps {
  heading: string
  description: string
  children: React.ReactNode
  className?: string
  dark?: boolean
}

const FeatureBlock = ({ heading, description, children, className, dark }: FeatureBlockProps) => (
  <motion.div
    initial='idle'
    whileHover='active'
    variants={{ idle: {}, active: {} }}
    data-dark={dark ? 'true' : undefined}
    className={clsx(
      'group relative flex flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5 data-[dark]:bg-slate-800 data-[dark]:ring-white/15',
      className,
    )}
  >
    <div className='relative h-80 shrink-0'>{children}</div>

    <div className='relative p-10'>
      <h3 className='mt-1 text-2xl/8 font-medium tracking-tight text-gray-950 group-data-[dark]:text-white'>
        {heading}
      </h3>
      <p className='mt-2 max-w-[600px] text-sm/6 text-gray-600 group-data-[dark]:text-gray-400'>{description}</p>
    </div>
  </motion.div>
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

const FeatureBlocks = ({ theme }: { theme: 'dark' | 'light' }) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { metainfo } = useSelector((state: StateType) => state.ui.misc)

  const { deviceInfo } = useLoaderData<typeof loader>()

  const geo = [
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
    <section className='relative mx-auto max-w-7xl bg-white pb-14 pt-14 dark:bg-slate-900'>
      <div className='relative mx-auto w-fit'>
        <div>
          <p className='mb-4 text-sm font-medium text-slate-800 dark:text-gray-200'>But there is a solution...</p>
          <h2 className='relative z-20 text-4xl font-extrabold text-slate-900 dark:text-white sm:text-5xl'>
            Know your customers and users
          </h2>
        </div>
      </div>
      <div className='mt-10 grid grid-cols-1 gap-4 sm:mt-16 lg:grid-cols-6 lg:grid-rows-2'>
        <FeatureBlock
          heading='Get insights into your traffic'
          description='Swetrix helps you understand everything you need to know about your website traffic. Know how many people are online, what pages are most popular, where are your users from, and more.'
          className='max-lg:rounded-t-4xl lg:rounded-tl-4xl lg:col-span-3'
          dark={theme === 'dark'}
        >
          <div
            className='absolute -top-40 left-60 right-0 z-10 h-full w-full rotate-45 transform-gpu overflow-hidden blur-3xl'
            aria-hidden='true'
          >
            <div
              className='mx-auto aspect-[1/3] h-full w-full bg-gradient-to-r from-amber-400 to-purple-600 opacity-20'
              style={{
                clipPath:
                  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
            />
          </div>
          <div className='h-80 overflow-hidden'>
            <img
              className='object-cover transition-transform group-hover:scale-105'
              src={theme === 'dark' ? '/assets/traffic_part_dark.png' : '/assets/traffic_part_light.png'}
              alt='Swetrix Traffic Dashboard'
            />
          </div>
          <div className='absolute inset-0 bg-gradient-to-t from-white to-50% group-data-[dark]:from-slate-800' />
        </FeatureBlock>
        <FeatureBlock
          heading="Understand your site's pain points"
          description='Nobody likes slow websites. Users are more likely to abandon your website if it takes too long to load, stay ahead of these problems and measure insights from real interactions.'
          className='lg:rounded-tr-4xl lg:col-span-3'
          dark={theme === 'dark'}
        >
          <div
            className='absolute -top-40 left-60 right-0 z-10 h-full w-full rotate-45 transform-gpu overflow-hidden blur-3xl'
            aria-hidden='true'
          >
            <div
              className='mx-auto aspect-[1/3] h-full w-full bg-gradient-to-r from-red-400 to-red-800 opacity-15'
              style={{
                clipPath:
                  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
            />
          </div>
          <div className='h-80 overflow-hidden'>
            <img
              className='object-cover transition-transform group-hover:scale-105'
              src={theme === 'dark' ? '/assets/performance_part_dark.png' : '/assets/performance_part_light.png'}
              alt='Website speed and performance monitoring'
            />
          </div>
          <div className='absolute inset-0 bg-gradient-to-t from-white to-50% group-data-[dark]:from-gray-800' />
        </FeatureBlock>
        <FeatureBlock
          heading='Complete customisation'
          description='Missing a feature? We will build it :) But you can also build your own features or install 3rd party addons from our Extensions Marketplace.'
          className='lg:rounded-bl-4xl lg:col-span-2'
          dark={theme === 'dark'}
        >
          <MarketplaceCluster />
        </FeatureBlock>
        <FeatureBlock
          heading='Works with any platform'
          description='With dozens of integrations, Swetrix makes it easy to connect your website and know your users, out of the box.'
          className='!overflow-visible lg:col-span-2'
          dark={theme === 'dark'}
        >
          <LogoTimeline />
        </FeatureBlock>
        <FeatureBlock
          heading='Session analysis'
          description='Analyse the sessions of your website users and make data-driven decisions.'
          className='max-lg:rounded-b-4xl lg:rounded-br-4xl lg:col-span-2'
          dark={theme === 'dark'}
        >
          <div className='relative space-y-2 overflow-hidden px-10 pt-5'>
            <MetricCardSelect
              classes={{
                value: 'max-md:text-xl md:text-3xl',
                container: 'rounded-md bg-gray-50 dark:bg-slate-700/60 py-1 px-2 max-w-max',
              }}
              values={geo}
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
                    <CCRow spaces={1} size={26} cc={value} language={language} />
                  </div>
                )
              }}
            />

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
                      <GlobeAltIcon className='size-6' />
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
                      <GlobeAltIcon className='size-6' />
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

            <div className='absolute bottom-0 right-0 rotate-12 rounded-md bg-gray-50 px-2 py-1 opacity-20 transition-all group-hover:rotate-6 group-hover:scale-110 group-hover:opacity-50 dark:bg-slate-700/60'>
              {['/home', '/product', 'SALE'].map((path, index) => (
                <div key={path} className='relative pb-8'>
                  {index !== 2 ? (
                    <span
                      className='absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200 dark:bg-slate-700'
                      aria-hidden='true'
                    />
                  ) : null}
                  <div className='relative flex space-x-3'>
                    <div>
                      <span className='flex h-8 w-8 items-center justify-center rounded-full bg-slate-400 dark:bg-slate-800'>
                        {path.startsWith('/') ? (
                          <NewspaperIcon className='h-5 w-5 text-white' aria-hidden='true' />
                        ) : (
                          <CursorArrowRaysIcon className='h-5 w-5 text-white' aria-hidden='true' />
                        )}
                      </span>
                    </div>
                    <p className='pt-1.5 text-sm text-gray-700 dark:text-gray-300'>
                      <Trans
                        t={t}
                        i18nKey={path.startsWith('/') ? 'project.pageviewX' : 'project.eventX'}
                        components={{
                          value: <span className='font-medium text-gray-900 dark:text-gray-50' />,
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
        </FeatureBlock>
      </div>
    </section>
  )
}

const Hero = ({
  theme,
  ssrTheme,
  authenticated,
}: {
  theme: 'dark' | 'light'
  ssrTheme: 'dark' | 'light'
  authenticated: boolean
}) => {
  const { t } = useTranslation('common')

  return (
    <div className='relative isolate overflow-x-clip'>
      <svg
        className='absolute inset-0 -z-10 h-full w-full stroke-gray-200 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)] dark:stroke-white/10'
        aria-hidden='true'
      >
        <defs>
          <pattern id='rect-pattern' width={200} height={200} x='50%' y={-1} patternUnits='userSpaceOnUse'>
            <path d='M.5 200V.5H200' fill='none' />
          </pattern>
        </defs>
        <svg x='50%' y={-1} className='overflow-visible fill-white dark:fill-gray-800/20'>
          <path
            d='M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z'
            strokeWidth={0}
          />
        </svg>
        <rect width='100%' height='100%' strokeWidth={0} fill='url(#rect-pattern)' />
      </svg>
      <div
        className='absolute left-[calc(50%-4rem)] top-10 -z-10 transform-gpu blur-3xl sm:left-[calc(50%-18rem)] lg:left-48 lg:top-[calc(50%-30rem)] xl:left-[calc(50%-24rem)]'
        aria-hidden='true'
      >
        <div
          className='aspect-[1108/632] w-[69.25rem] bg-gradient-to-r from-[#80caff] to-[#4f46e5] opacity-20'
          style={{
            clipPath:
              'polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)',
          }}
        />
      </div>
      <Header ssrTheme={ssrTheme} authenticated={authenticated} transparent />
      <div className='relative mx-auto min-h-[740px] pb-5 pt-10 sm:px-3 lg:px-6 lg:pt-24 xl:px-8'>
        <div className='relative z-20 flex flex-col content-between justify-center'>
          <div className='relative mx-auto flex flex-col px-4 text-left'>
            <h1 className='mx-auto max-w-4xl text-center text-4xl font-extrabold tracking-[-0.4px] text-slate-900 dark:text-white sm:text-5xl sm:leading-none lg:text-6xl xl:text-7xl'>
              <Trans
                t={t}
                i18nKey='main.slogan'
                components={{
                  // @ts-expect-error
                  span: <Highlighted />,
                }}
              />
            </h1>
            <p className='mx-auto mt-4 max-w-4xl text-center text-base leading-relaxed tracking-wide text-slate-900 dark:text-slate-300 sm:text-lg lg:text-xl'>
              {t('main.description')}
            </p>
            <div className='mt-10 flex flex-col items-center justify-center sm:flex-row'>
              <Link
                to={routesPath.signup}
                className='group flex h-12 w-full items-center justify-center rounded-md bg-slate-900 text-white shadow-sm ring-1 ring-slate-900 transition-all !duration-300 hover:bg-slate-700 dark:bg-indigo-700 dark:ring-indigo-700 dark:hover:bg-indigo-600 sm:mr-6 sm:max-w-[210px]'
                aria-label={t('titles.signup')}
              >
                <span className='mr-1 text-base font-semibold'>{t('main.startAFreeTrial')}</span>
                <ArrowRightIcon className='mt-[1px] h-4 w-5 transition-transform group-hover:scale-[1.15]' />
              </Link>
              <a
                href={LIVE_DEMO_URL}
                className='mt-2 flex h-12 w-full items-center justify-center rounded-md bg-transparent text-slate-900 shadow-sm ring-1 ring-slate-900 transition-all !duration-300 hover:bg-slate-200 dark:text-white dark:ring-white/20 dark:hover:bg-gray-800 sm:mt-0 sm:max-w-[210px]'
                target='_blank'
                rel='noopener noreferrer'
                aria-label={`${t('common.liveDemo')} (opens in a new tab)`}
              >
                <span className='text-base font-semibold'>{t('common.liveDemo')}</span>
              </a>
            </div>
            <Testimonials />
          </div>
          <div className='hidden max-w-md lg:block xl:max-w-lg'>
            <Lines />
          </div>
        </div>
        <div className='relative z-20 mx-auto mt-10 block max-w-7xl px-4 md:px-0'>
          <picture>
            <source
              srcSet={theme === 'dark' ? '/assets/screenshot_dark.webp' : '/assets/screenshot_light.webp'}
              type='image/webp'
            />
            <img
              src={theme === 'dark' ? '/assets/screenshot_dark.png' : '/assets/screenshot_light.png'}
              className='relative w-full rounded-xl shadow-2xl ring-1 ring-gray-900/10 dark:ring-white/10'
              width='100%'
              height='auto'
              alt='Swetrix Analytics dashboard'
            />
          </picture>
        </div>
      </div>
    </div>
  )
}

export default function Index() {
  const { theme: ssrTheme, isAuth } = useLoaderData<typeof loader>()

  const reduxTheme = useSelector((state: StateType) => state.ui.theme.theme)
  const { authenticated: reduxAuthenticated, loading } = useSelector((state: StateType) => state.auth)
  const theme = isBrowser ? reduxTheme : ssrTheme
  const accessToken = getAccessToken()
  const authenticated = isBrowser ? (loading ? !!accessToken : reduxAuthenticated) : isAuth

  return (
    <div className='overflow-hidden'>
      <main className='bg-white dark:bg-slate-900'>
        <Hero theme={theme} ssrTheme={ssrTheme} authenticated={authenticated} />

        <Problem />
        {/* <TrustedBy /> */}

        <FeatureBlocks theme={theme} />

        <Feedback
          name='Alex Bowles'
          title='Co-founder of Casterlabs'
          logoUrl={theme === 'dark' ? '/assets/users/casterlabs-dark.svg' : '/assets/users/casterlabs-light.svg'}
          photoUrl='/assets/users/alex-casterlabs.jpg'
          feedback="Swetrix has been a game changer for our analytics. They've always been on top of feature requests and bug reports and have been friendly every step of the way. I can't recommend them enough."
        />

        <CoreFeatures theme={theme} />

        {/* Hiding the Pricing for authenticated users on the main page as the Paddle script only loads on the Billing page */}
        {!authenticated && <Pricing authenticated={false} />}

        <Feedback
          name='Alper Alkan'
          title='Co-founder of Phalcode'
          logoUrl={theme === 'dark' ? '/assets/users/phalcode-dark.svg' : '/assets/users/phalcode-light.svg'}
          photoUrl='/assets/users/alper-phalcode.jpg'
          feedback="Analytics needs on all of our products are provided by Swetrix only. It's unfathomable how good this service is compared to Google Analytics. Swetrix gives me everything I need to know about my websites."
        />

        {/* <Comparison /> */}

        <OpensourceAdvantages theme={theme} />

        {/* <PeopleLoveSwetrix theme={theme} /> */}

        <DitchGoogle
          screenshot={{
            dark: '/assets/screenshot_dark.png',
            light: '/assets/screenshot_light.png',
          }}
          theme={theme}
        />
      </main>
    </div>
  )
}
