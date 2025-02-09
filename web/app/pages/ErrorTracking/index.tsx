import { Link } from 'react-router'
import React, { memo } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { useSelector } from 'react-redux'
import { ClientOnly } from 'remix-utils/client-only'
import { ChevronRightIcon } from '@heroicons/react/24/solid'
import { ArrowRightIcon } from '@heroicons/react/20/solid'
import _map from 'lodash/map'
import _isEmpty from 'lodash/isEmpty'

import routesPath from '~/utils/routes'
import { getAccessToken } from '~/utils/accessToken'
import { ERROR_TRACKING_LIVE_DEMO_URL, isBrowser } from '~/lib/constants'
import { StateType } from '~/lib/store/index'
import BackgroundSvg from '~/ui/icons/BackgroundSvg'

import Header from '~/components/Header'
import Pricing from '../../components/marketing/Pricing'
import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import { PeopleLoveSwetrix } from '../Performance'

const Lines = () => (
  <div className='pointer-events-none relative'>
    <div className='absolute top-[32rem] right-[-48rem] h-px w-[800%] rotate-6 bg-gradient-to-l from-slate-600 opacity-10 dark:from-slate-400' />
    <div className='absolute top-[22.26rem] -left-60 ml-[-0.5px] h-96 w-[2px] rotate-[96deg] rounded-full bg-gradient-to-t from-red-600 opacity-50 xl:top-[23.5rem] dark:from-red-700' />
  </div>
)

interface ErrorTrackingProps {
  ssrTheme: 'dark' | 'light'
  ssrAuthenticated: boolean
}

const ErrorTracking = ({ ssrTheme, ssrAuthenticated }: ErrorTrackingProps) => {
  const { t } = useTranslation('common')
  const reduxTheme = useSelector((state: StateType) => state.ui.theme.theme)
  const { authenticated: reduxAuthenticated, loading } = useSelector((state: StateType) => state.auth)
  const { lastBlogPost } = useSelector((state: StateType) => state.ui.misc)
  const theme = isBrowser ? reduxTheme : ssrTheme
  const accessToken = getAccessToken()
  const authenticated = isBrowser ? (loading ? !!accessToken : reduxAuthenticated) : ssrAuthenticated

  return (
    <div className='overflow-hidden'>
      <main className='bg-white dark:bg-slate-900'>
        {/* first block with live demo */}
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
            className='absolute top-10 left-[calc(50%-4rem)] -z-10 transform-gpu blur-3xl sm:left-[calc(50%-18rem)] lg:top-[calc(50%-30rem)] lg:left-48 xl:left-[calc(50%-24rem)]'
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
          <div className='relative mx-auto min-h-[740px] pt-10 pb-5 sm:px-3 lg:px-6 lg:pt-24 xl:px-8'>
            <div className='relative z-20 flex flex-row content-between justify-center lg:justify-start 2xl:mr-[14vw] 2xl:justify-center'>
              <div className='relative px-4 text-left lg:mt-0 lg:mr-14'>
                <h1 className='max-w-2xl text-3xl font-extrabold text-slate-900 sm:text-5xl sm:leading-none md:text-5xl lg:text-5xl xl:text-6xl xl:leading-[110%] dark:text-white'>
                  <Trans
                    t={t}
                    i18nKey='errors.slogan'
                    components={{
                      span: (
                        <span className='bg-gradient-to-r from-red-700 to-red-700 bg-clip-text text-transparent dark:from-red-600 dark:to-red-400' />
                      ),
                    }}
                  />
                </h1>
                <div className='mt-2 mb-2 flex items-center overflow-hidden font-mono sm:text-xl lg:text-lg xl:text-lg'>
                  <p className='rounded-full bg-indigo-500/10 px-3 py-1 text-center text-sm leading-6 font-semibold text-indigo-600 ring-1 ring-indigo-500/20 ring-inset dark:text-indigo-400'>
                    Latest news
                  </p>
                  {_isEmpty(lastBlogPost) ? (
                    <div className='ml-1 h-6 w-full max-w-xs animate-pulse rounded-md bg-slate-300 dark:bg-slate-700' />
                  ) : (
                    <ClientOnly
                      fallback={
                        <div className='ml-1 h-6 w-full max-w-xs animate-pulse rounded-md bg-slate-300 dark:bg-slate-700' />
                      }
                    >
                      {() => (
                        <Link
                          className='ml-1 inline-flex items-center space-x-1 text-sm leading-6 font-semibold text-slate-700 hover:underline dark:text-slate-300'
                          to={`blog/${lastBlogPost.handle}`}
                        >
                          <small className='text-sm'>{lastBlogPost.title}</small>
                          <ChevronRightIcon className='h-4 w-4 text-slate-500' aria-hidden='true' />
                        </Link>
                      )}
                    </ClientOnly>
                  )}
                </div>
                <p className='font-mono text-base leading-8 text-slate-900 sm:text-xl lg:text-lg xl:text-lg dark:text-slate-300'>
                  {t('errors.description')}
                </p>
                <div className='mt-10 flex flex-col items-center font-mono sm:flex-row'>
                  <Link
                    to={routesPath.signup}
                    className='group flex h-12 w-full items-center justify-center rounded-md bg-slate-900 text-white ring-1 ring-slate-900 transition-all !duration-300 hover:bg-slate-700 sm:mr-6 sm:max-w-[210px] dark:bg-indigo-700 dark:ring-indigo-700 dark:hover:bg-indigo-600'
                    aria-label={t('titles.signup')}
                  >
                    <span className='mr-1 text-base font-semibold'>{t('main.startAFreeTrial')}</span>
                    <ArrowRightIcon className='mt-[1px] h-4 w-5 transition-transform group-hover:scale-[1.15]' />
                  </Link>
                  <a
                    href={ERROR_TRACKING_LIVE_DEMO_URL}
                    className='mt-2 flex h-12 w-full items-center justify-center rounded-md bg-transparent text-slate-900 ring-1 shadow-xs ring-slate-900 transition-all !duration-300 hover:bg-slate-200 sm:mt-0 sm:max-w-[210px] dark:text-white dark:ring-white/20 dark:hover:bg-gray-800'
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label={`${t('common.liveDemo')} (opens in a new tab)`}
                  >
                    <span className='text-base font-semibold'>{t('common.liveDemo')}</span>
                  </a>
                </div>
              </div>
              <div className='hidden max-w-md lg:block xl:max-w-lg'>
                <Lines />
                <picture>
                  <source
                    srcSet={
                      theme === 'dark' ? '/assets/screenshot_errors_dark.webp' : '/assets/screenshot_errors_light.webp'
                    }
                    type='image/webp'
                  />
                  <img
                    src={
                      theme === 'dark' ? '/assets/screenshot_errors_dark.png' : '/assets/screenshot_errors_light.png'
                    }
                    className='relative h-full min-w-[880px] rounded-xl ring-2 ring-gray-900/10 dark:ring-white/10'
                    width='100%'
                    height='auto'
                    alt='Swetrix Analytics dashboard'
                  />
                </picture>
              </div>
            </div>
            <div className='relative z-20 my-10 block px-4 md:px-0 lg:hidden'>
              <picture>
                <source
                  srcSet={
                    theme === 'dark' ? '/assets/screenshot_errors_dark.webp' : '/assets/screenshot_errors_light.webp'
                  }
                  type='image/webp'
                />
                <img
                  src={theme === 'dark' ? '/assets/screenshot_errors_dark.png' : '/assets/screenshot_errors_light.png'}
                  className='relative w-full rounded-xl ring-2 ring-gray-900/10 dark:ring-white/10'
                  width='100%'
                  height='auto'
                  alt='Swetrix Analytics dashboard'
                />
              </picture>
            </div>
          </div>
        </div>
        {/* end first block with live demo */}

        <div className='mx-auto mt-12 max-w-7xl bg-white px-4 pb-16 whitespace-pre-line dark:bg-slate-900'>
          <h2 className='text-4xl font-extrabold text-slate-900 dark:text-white'>{t('errors.fast.title')}</h2>
          <p className='mt-6 font-mono text-lg text-gray-900 dark:text-gray-50'>
            <Trans
              t={t}
              i18nKey='errors.fast.desc'
              components={{
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                indexUrl: (
                  <Link to={routesPath.main} className='font-medium text-red-600 hover:underline dark:text-red-400' />
                ),
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                perfUrl: (
                  <Link
                    to={routesPath.performance}
                    className='font-medium text-red-600 hover:underline dark:text-red-400'
                  />
                ),
                oneLC: (
                  <a
                    href='https://docs.swetrix.com/swetrix-js-reference#trackerrors'
                    className='font-medium text-red-600 hover:underline dark:text-red-400'
                    target='_blank'
                    rel='noopener noreferrer'
                  />
                ),
              }}
            />
          </p>
          <ul className='mt-2 list-inside list-disc font-mono text-lg text-gray-900 dark:text-gray-50'>
            {_map(t('errors.fast.list', { returnObjects: true }), (item) => (
              <li key={item} className='mb-2'>
                {item}
              </li>
            ))}
          </ul>

          <h2 className='mt-10 text-4xl font-extrabold text-slate-900 dark:text-white'>{t('errors.track.title')}</h2>
          <p className='mt-6 font-mono text-lg text-gray-900 dark:text-gray-50'>{t('errors.track.desc')}</p>

          <h2 className='mt-10 text-4xl font-extrabold text-slate-900 dark:text-white'>
            {t('performance.privacy.title')}
          </h2>
          <p className='mt-6 font-mono text-lg text-gray-900 dark:text-gray-50'>{t('performance.privacy.desc')}</p>
        </div>

        {/* For now let's hide Pricing for authenticated users on the main page as the Paddle script only loads on the Billing page */}
        {!authenticated && <Pricing authenticated={false} />}

        <DitchGoogle
          screenshot={{
            dark: '/assets/screenshot_errors_dark.png',
            light: '/assets/screenshot_errors_light.png',
          }}
          theme={theme}
        />

        {/* Become a developer */}
        <section className='relative bg-white pt-20 pb-44 dark:bg-slate-900'>
          <div className='absolute top-16 right-0 z-0'>
            <BackgroundSvg theme={theme} type='threecircle' />
          </div>
          <div className='absolute top-52 -left-9 rotate-90'>
            <BackgroundSvg theme={theme} type='shapes' />
          </div>
          <PeopleLoveSwetrix />
        </section>
        {/* end Become a developer */}
      </main>
    </div>
  )
}

export default memo(ErrorTracking)
