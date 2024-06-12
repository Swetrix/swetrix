import { Link } from '@remix-run/react'
import React, { memo } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { useSelector } from 'react-redux'
import { ClientOnly } from 'remix-utils/client-only'
import { ArrowTopRightOnSquareIcon, ArrowSmallRightIcon, ChevronRightIcon } from '@heroicons/react/24/solid'
import _map from 'lodash/map'
import _isEmpty from 'lodash/isEmpty'

import routesPath from 'routesPath'
import { getAccessToken } from 'utils/accessToken'
import { nFormatterSeparated } from 'utils/generic'
import { ERROR_TRACKING_LIVE_DEMO_URL, isBrowser } from 'redux/constants'
import { StateType } from 'redux/store/index'
import BackgroundSvg from 'ui/icons/BackgroundSvg'

import Header from 'components/Header'
import Pricing from '../MainPage/Pricing'

const Lines = (): JSX.Element => (
  <div className='pointer-events-none relative'>
    <div className='absolute right-[-48rem] top-[32rem] h-px w-[800%] rotate-6 bg-gradient-to-l from-slate-600 opacity-10 dark:from-slate-400' />
    <div className='absolute -left-60 top-[22.26rem] ml-[-0.5px] h-96 w-[2px] rotate-[96deg] rounded-full bg-gradient-to-t from-red-600 opacity-50 dark:from-red-700 xl:top-[23.5rem]' />
  </div>
)

interface IErrorTracking {
  ssrTheme: 'dark' | 'light'
  ssrAuthenticated: boolean
}

const ErrorTracking: React.FC<IErrorTracking> = ({ ssrTheme, ssrAuthenticated }): JSX.Element => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const reduxTheme = useSelector((state: StateType) => state.ui.theme.theme)
  const { authenticated: reduxAuthenticated, loading } = useSelector((state: StateType) => state.auth)
  const { stats, lastBlogPost } = useSelector((state: StateType) => state.ui.misc)
  const theme = isBrowser ? reduxTheme : ssrTheme
  const accessToken = getAccessToken()
  const authenticated = isBrowser ? (loading ? !!accessToken : reduxAuthenticated) : ssrAuthenticated

  const events = nFormatterSeparated(Number(stats.events))
  const users = nFormatterSeparated(Number(stats.users))
  const websites = nFormatterSeparated(Number(stats.projects))

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
          <div className='flex items-center justify-center px-2 py-2'>
            <a
              href='https://u24.gov.ua/'
              target='_blank'
              rel='noreferrer noopener'
              className='border-b-2 border-transparent text-center text-slate-900 hover:border-slate-900 dark:text-white dark:hover:border-white'
            >
              {t('main.ukrSupport')}
            </a>
            <ArrowTopRightOnSquareIcon className='ml-1 hidden h-4 w-4 text-slate-800 dark:text-white md:block' />
          </div>
          <div className='relative mx-auto min-h-[740px] pb-5 pt-10 sm:px-3 lg:px-6 lg:pt-24 xl:px-8'>
            <div className='relative z-20 flex flex-row content-between justify-center lg:justify-start 2xl:mr-[14vw] 2xl:justify-center'>
              <div className='relative px-4 text-left lg:mr-14 lg:mt-0'>
                <h1 className='max-w-2xl text-3xl font-extrabold text-slate-900 dark:text-white sm:text-5xl sm:leading-none md:text-5xl lg:text-5xl xl:text-6xl xl:leading-[110%]'>
                  <Trans
                    // @ts-ignore
                    t={t}
                    i18nKey='errors.slogan'
                    components={{
                      span: (
                        <span className='bg-gradient-to-r from-red-700 to-red-700 bg-clip-text text-transparent dark:from-red-600 dark:to-red-400' />
                      ),
                    }}
                  />
                </h1>
                <div className='mb-2 mt-2 flex items-center overflow-hidden sm:text-xl lg:text-lg xl:text-lg'>
                  <p className='rounded-full bg-indigo-500/10 px-3 py-1 text-center text-sm font-semibold leading-6 text-indigo-600 ring-1 ring-inset ring-indigo-500/20 dark:text-indigo-400'>
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
                          className='ml-1 inline-flex items-center space-x-1 text-sm font-semibold leading-6 text-slate-700 hover:underline dark:text-slate-300'
                          to={`blog/${lastBlogPost.handle}`}
                        >
                          <small className='text-sm'>{lastBlogPost.title}</small>
                          <ChevronRightIcon className='h-4 w-4 text-slate-500' aria-hidden='true' />
                        </Link>
                      )}
                    </ClientOnly>
                  )}
                </div>
                <p className='text-base leading-8 text-slate-900 dark:text-slate-300 sm:text-xl lg:text-lg xl:text-lg'>
                  {t('errors.description')}
                  <br />
                  {t('main.trackEveryMetric')}
                </p>
                <div className='mt-10 flex flex-col items-center sm:flex-row'>
                  <Link
                    to={routesPath.signup}
                    className='flex h-12 w-full items-center justify-center rounded-md bg-slate-900 text-white shadow-sm ring-1 ring-slate-900 transition-all !duration-300 hover:bg-slate-700 dark:bg-indigo-700 dark:ring-indigo-700 dark:hover:bg-indigo-600 sm:mr-6 sm:max-w-[210px]'
                    aria-label={t('titles.signup')}
                  >
                    <span className='mr-1 text-base font-semibold'>{t('common.getStarted')}</span>
                    <ArrowSmallRightIcon className='mt-[1px] h-4 w-5' />
                  </Link>
                  <a
                    href={ERROR_TRACKING_LIVE_DEMO_URL}
                    className='mt-2 flex h-12 w-full items-center justify-center rounded-md bg-transparent text-slate-900 shadow-sm ring-1 ring-slate-900 transition-all !duration-300 hover:bg-slate-200 dark:text-white dark:ring-white/20 dark:hover:bg-gray-800 sm:mt-0 sm:max-w-[210px]'
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
                    className='relative h-full min-w-[880px] rounded-xl shadow-2xl ring-1 ring-gray-900/10 dark:ring-white/10'
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
                  className='relative w-full rounded-xl shadow-2xl ring-1 ring-gray-900/10 dark:ring-white/10'
                  width='100%'
                  height='auto'
                  alt='Swetrix Analytics dashboard'
                />
              </picture>
            </div>
          </div>
        </div>
        {/* end first block with live demo */}

        <div className='mx-auto mt-12 max-w-7xl whitespace-pre-line bg-white px-4 pb-16 dark:bg-slate-900'>
          <h2 className='text-4xl font-extrabold text-slate-900 dark:text-white'>{t('errors.fast.title')}</h2>
          <p className='mt-6 text-lg text-gray-900 dark:text-gray-50'>
            <Trans
              // @ts-ignore
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
          <ul className='mt-2 list-inside list-disc text-lg text-gray-900 dark:text-gray-50'>
            {_map(t('errors.fast.list', { returnObjects: true }), (item) => (
              <li key={item} className='mb-2'>
                {item}
              </li>
            ))}
          </ul>

          <h2 className='mt-10 text-4xl font-extrabold text-slate-900 dark:text-white'>{t('errors.track.title')}</h2>
          <p className='mt-6 text-lg text-gray-900 dark:text-gray-50'>{t('errors.track.desc')}</p>

          <h2 className='mt-10 text-4xl font-extrabold text-slate-900 dark:text-white'>
            {t('performance.privacy.title')}
          </h2>
          <p className='mt-6 text-lg text-gray-900 dark:text-gray-50'>{t('performance.privacy.desc')}</p>
        </div>

        {/* For now let's hide Pricing for authenticated users on the main page as the Paddle script only loads on the Billing page */}
        {!authenticated && <Pricing authenticated={false} t={t} language={language} />}

        <div className='bg-white px-4 pb-12 dark:bg-slate-900 md:px-8'>
          <section
            className='relative isolate mx-auto w-full max-w-7xl overflow-hidden bg-slate-800 lg:h-[450px]'
            style={{ borderRadius: '100px 30px 30px 30px' }}
          >
            <div className='absolute inset-0 -z-10 overflow-hidden' aria-hidden='true'>
              <div className='absolute left-[calc(20%-19rem)] top-[calc(50%-36rem)] transform-gpu blur-3xl'>
                <div
                  className='aspect-[1097/1023] w-[68.5625rem] bg-gradient-to-r from-[#ff4694] to-[#776fff] opacity-25 dark:opacity-10'
                  style={{
                    clipPath:
                      'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                  }}
                />
              </div>
            </div>
            <div className='flex flex-col items-start justify-between pl-8 pt-8 sm:pl-14 md:flex-row lg:pl-28'>
              <div className='mb-16 w-full max-w-[520px] pr-3 pt-14 md:mb-0'>
                <h2 className='mb-3 text-2xl font-bold leading-9 text-white sm:text-4xl sm:leading-[48px] md:text-[28px] md:leading-10 lg:text-[33px] lg:leading-[48px]'>
                  <Trans
                    // @ts-ignore
                    t={t}
                    i18nKey='main.timeToDitchGoogleAnalytics'
                    components={{
                      colour: <span className='text-red-600' />,
                    }}
                  />
                </h2>
                <p className='mb-9 text-base font-medium text-gray-300 sm:text-lg'>{t('main.whyDitch')}</p>
                <Link
                  to={routesPath.signup}
                  className='flex h-[50px] w-full max-w-[210px] items-center justify-center rounded-md border border-transparent bg-indigo-600 text-white shadow-sm transition-all !duration-300 hover:bg-indigo-700 sm:mr-6'
                  aria-label={t('titles.signup')}
                >
                  <span className='mr-1 text-base font-semibold'>{t('main.start')}</span>
                  <ArrowSmallRightIcon className='mt-[1px] h-4 w-5' />
                </Link>
              </div>
              <div className='block h-[450px] max-w-md md:rounded-md md:shadow-[8px_8px_10px_3px] xl:max-w-lg '>
                <img
                  className='min-h-[600px] min-w-[880px] rounded-xl ring-1 ring-gray-900/10'
                  width='1760'
                  height='880'
                  src={theme === 'dark' ? '/assets/screenshot_errors_dark.png' : '/assets/screenshot_errors_light.png'}
                  alt='Swetrix Analytics dashboard'
                />
              </div>
            </div>
          </section>
        </div>

        {/* Become a developer */}
        <section className='relative bg-white pb-44 pt-20 dark:bg-slate-900'>
          <div className='absolute right-0 top-16 z-0'>
            <BackgroundSvg theme={theme} type='threecircle' />
          </div>
          <div className='absolute -left-9 top-52 rotate-90'>
            <BackgroundSvg theme={theme} type='shapes' />
          </div>
          <div className='mx-auto w-full max-w-5xl px-3'>
            <div className='mx-auto w-full max-w-prose'>
              <h2 className='text-center text-3xl font-extrabold text-gray-900 dark:text-white md:text-4xl'>
                {t('main.peopleLoveSwetrix')}
              </h2>
              <p className='mx-auto mt-5 max-w-prose text-center text-xl text-gray-600 dark:text-gray-200'>
                {t('main.whyPeopleLoveSwetrix')}
              </p>
            </div>
            <div className='mt-20 flex flex-col items-center justify-between md:mt-32 md:flex-row'>
              <div className='text-center'>
                <ClientOnly fallback={<p className='text-center text-5xl font-extrabold text-indigo-700'>0</p>}>
                  {() => (
                    <p className='text-center text-5xl font-extrabold text-indigo-700'>
                      {users[0]}
                      {users[1] && <span className='text-gray-900 dark:text-indigo-200'>{users[1]}+</span>}
                    </p>
                  )}
                </ClientOnly>
                <p className='text-lg text-gray-600 dark:text-gray-200'>{t('main.users')}</p>
              </div>
              <div className='mx-5 mb-14 mt-16 h-2 w-2 rounded-full bg-gray-800 dark:bg-gray-200 md:mb-0 md:mt-0' />
              <div className='text-center'>
                <ClientOnly fallback={<p className='text-center text-5xl font-extrabold text-indigo-700'>0</p>}>
                  {() => (
                    <p className='text-center text-5xl font-extrabold text-indigo-700'>
                      {websites[0]}
                      {websites[1] && <span className='text-gray-900 dark:text-indigo-200'>{websites[1]}+</span>}
                    </p>
                  )}
                </ClientOnly>
                <p className='text-lg text-gray-600 dark:text-gray-200'>{t('main.websites')}</p>
              </div>
              <div className='mx-5 mb-14 mt-16 h-2 w-2 rounded-full bg-gray-800 dark:bg-gray-200 md:mb-0 md:mt-0' />
              <div className='text-center'>
                <ClientOnly fallback={<p className='text-center text-5xl font-extrabold text-indigo-700'>0</p>}>
                  {() => (
                    <p className='text-center text-5xl font-extrabold text-indigo-700'>
                      {events[0]}
                      {events[1] && <span className='text-gray-900 dark:text-indigo-200'>{events[1]}+</span>}
                    </p>
                  )}
                </ClientOnly>
                <p className='text-lg text-gray-600 dark:text-gray-200'>{t('main.pageviews')}</p>
              </div>
            </div>
          </div>
        </section>
        {/* end Become a developer */}
      </main>
    </div>
  )
}

export default memo(ErrorTracking)
