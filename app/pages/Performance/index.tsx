import { Link } from '@remix-run/react'
import React, { memo } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { useSelector } from 'react-redux'
import { ClientOnly } from 'remix-utils'
import { ArrowTopRightOnSquareIcon, ArrowSmallRightIcon, ChevronRightIcon } from '@heroicons/react/24/solid'
import _map from 'lodash/map'
import _isEmpty from 'lodash/isEmpty'

import routesPath from 'routesPath'
import { getAccessToken } from 'utils/accessToken'
import { nFormatterSeparated } from 'utils/generic'
import { PERFORMANCE_LIVE_DEMO_URL, isBrowser } from 'redux/constants'
import { StateType } from 'redux/store/index'
import BackgroundSvg from 'ui/icons/BackgroundSvg'

import Header from 'components/Header'
import Pricing from '../MainPage/Pricing'

export const Lines = (): JSX.Element => (
  <div className='relative pointer-events-none'>
    <div className='absolute rotate-6 right-[-48rem] top-[32rem] h-px w-[800%] bg-gradient-to-l from-slate-600 dark:from-slate-400 opacity-10' />
    <div className='absolute rotate-[96deg] top-[22.26rem] xl:top-[23.5rem] -left-60 ml-[-0.5px] h-96 w-[2px] rounded-full bg-gradient-to-t from-orange-600 dark:from-orange-700 opacity-50' />
  </div>
)

interface IMain {
  ssrTheme: 'dark' | 'light'
  ssrAuthenticated: boolean
}

const Main: React.FC<IMain> = ({ ssrTheme, ssrAuthenticated }): JSX.Element => {
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
        <div className='relative overflow-x-clip isolate'>
          <svg
            className='absolute inset-0 -z-10 h-full w-full stroke-gray-200 dark:stroke-white/10 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]'
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
          <div className='flex justify-center items-center py-2 px-2'>
            <a
              href='https://u24.gov.ua/'
              target='_blank'
              rel='noreferrer noopener'
              className='text-slate-900 dark:text-white border-transparent border-b-2 hover:border-slate-900 dark:hover:border-white text-center'
            >
              {t('main.ukrSupport')}
            </a>
            <ArrowTopRightOnSquareIcon className='h-4 w-4 text-slate-800 dark:text-white ml-1 hidden md:block' />
          </div>
          <div className='relative pt-10 lg:pt-24 pb-5 xl:px-8 lg:px-6 sm:px-3 mx-auto min-h-[740px]'>
            <div className='relative z-20 flex flex-row content-between 2xl:mr-[14vw] 2xl:justify-center justify-center lg:justify-start'>
              <div className='lg:mt-0 text-left relative lg:mr-14 px-4'>
                <h1 className='max-w-2xl text-3xl sm:text-5xl md:text-5xl font-extrabold text-slate-900 dark:text-white sm:leading-none lg:text-5xl xl:text-6xl xl:leading-[110%]'>
                  <Trans
                    // @ts-ignore
                    t={t}
                    i18nKey='performance.slogan'
                    components={{
                      span: (
                        <span className='from-orange-700 to-orange-700 dark:from-orange-600 dark:to-red-400 text-transparent bg-clip-text bg-gradient-to-r' />
                      ),
                    }}
                  />
                </h1>
                <div className='flex items-center overflow-hidden mt-2 mb-2 sm:text-xl lg:text-lg xl:text-lg'>
                  <p className='rounded-full bg-indigo-500/10 px-3 py-1 text-sm text-center font-semibold leading-6 text-indigo-600 dark:text-indigo-400 ring-1 ring-inset ring-indigo-500/20'>
                    Latest news
                  </p>
                  {_isEmpty(lastBlogPost) ? (
                    <div className='h-6 ml-1 bg-slate-300 dark:bg-slate-700 w-full max-w-xs rounded-md animate-pulse' />
                  ) : (
                    <ClientOnly
                      fallback={
                        <div className='h-6 ml-1 bg-slate-300 dark:bg-slate-700 w-full max-w-xs rounded-md animate-pulse' />
                      }
                    >
                      {() => (
                        <Link
                          className='inline-flex ml-1 items-center space-x-1 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-300 hover:underline'
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
                  {t('performance.description')}
                  <br />
                  {t('main.trackEveryMetric')}
                </p>
                <div className='mt-10 flex flex-col items-center sm:flex-row'>
                  <Link
                    to={routesPath.signup}
                    className='rounded-md !duration-300 transition-all w-full sm:max-w-[210px] h-12 flex items-center justify-center sm:mr-6 shadow-sm ring-1 text-white bg-slate-900 ring-slate-900 hover:bg-slate-700 dark:bg-indigo-700 dark:ring-indigo-700 dark:hover:bg-indigo-600'
                    aria-label={t('titles.signup')}
                  >
                    <span className='text-base font-semibold mr-1'>{t('common.getStarted')}</span>
                    <ArrowSmallRightIcon className='h-4 w-5 mt-[1px]' />
                  </Link>
                  <a
                    href={PERFORMANCE_LIVE_DEMO_URL}
                    className='rounded-md !duration-300 transition-all sm:mt-0 mt-2 ring-1 ring-slate-900 dark:ring-white/20 w-full sm:max-w-[210px] h-12 flex items-center justify-center shadow-sm text-slate-900 dark:text-white bg-transparent hover:bg-slate-200 dark:hover:bg-gray-800'
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label={`${t('common.liveDemo')} (opens in a new tab)`}
                  >
                    <span className='text-base font-semibold'>{t('common.liveDemo')}</span>
                  </a>
                </div>
              </div>
              <div className='max-w-md xl:max-w-lg hidden lg:block'>
                <Lines />
                <picture>
                  <source
                    srcSet={
                      theme === 'dark' ? '/assets/screenshot_perf_dark.webp' : '/assets/screenshot_perf_light.webp'
                    }
                    type='image/webp'
                  />
                  <img
                    src={theme === 'dark' ? '/assets/screenshot_perf_dark.png' : '/assets/screenshot_perf_light.png'}
                    className='h-full min-w-[880px] rounded-xl relative shadow-2xl ring-1 ring-gray-900/10 dark:ring-white/10'
                    width='100%'
                    height='auto'
                    alt='Swetrix Analytics dashboard'
                  />
                </picture>
              </div>
            </div>
            <div className='my-10 block lg:hidden relative z-20 px-4 md:px-0'>
              <picture>
                <source
                  srcSet={theme === 'dark' ? '/assets/screenshot_perf_dark.webp' : '/assets/screenshot_perf_light.webp'}
                  type='image/webp'
                />
                <img
                  src={theme === 'dark' ? '/assets/screenshot_perf_dark.png' : '/assets/screenshot_perf_light.png'}
                  className='rounded-xl relative shadow-2xl w-full ring-1 ring-gray-900/10 dark:ring-white/10'
                  width='100%'
                  height='auto'
                  alt='Swetrix Analytics dashboard'
                />
              </picture>
            </div>
          </div>
        </div>
        {/* end first block with live demo */}

        <div className='dark:bg-slate-900 bg-white px-4 pb-16 mx-auto max-w-7xl whitespace-pre-line mt-12'>
          <h2 className='font-extrabold text-4xl dark:text-white text-slate-900'>{t('performance.fast.title')}</h2>
          <p className='mt-6 dark:text-gray-50 text-gray-900 text-lg'>
            <Trans
              // @ts-ignore
              t={t}
              i18nKey='performance.fast.desc'
              components={{
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                indexUrl: (
                  <Link
                    to={routesPath.main}
                    className='font-medium text-orange-600 dark:text-orange-400 hover:underline'
                  />
                ),
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                wpostatsUrl: (
                  <a
                    href='https://wpostats.com/?utm_source=swetrix.com'
                    className='font-medium text-orange-600 dark:text-orange-400 hover:underline'
                    target='_blank'
                    rel='noopener noreferrer'
                  />
                ),
              }}
            />
          </p>
          <ul className='mt-2 list-disc list-inside dark:text-gray-50 text-gray-900 text-lg'>
            {_map(t('performance.fast.list', { returnObjects: true }), (item) => (
              <li key={item} className='mb-2'>
                {item}
              </li>
            ))}
          </ul>

          <h2 className='mt-10 font-extrabold text-4xl dark:text-white text-slate-900'>
            {t('performance.metrics.title')}
          </h2>
          <p className='mt-6 dark:text-gray-50 text-gray-900 text-lg'>{t('performance.metrics.desc')}</p>

          <h2 className='mt-10 font-extrabold text-4xl dark:text-white text-slate-900'>
            {t('performance.privacy.title')}
          </h2>
          <p className='mt-6 dark:text-gray-50 text-gray-900 text-lg'>{t('performance.privacy.desc')}</p>
        </div>

        {/* For now let's hide Pricing for authenticated users on the main page as the Paddle script only loads on the Billing page */}
        {!authenticated && <Pricing authenticated={false} t={t} language={language} />}

        <div className='bg-white dark:bg-slate-900 px-4 md:px-8 pb-12'>
          <section
            className='relative isolate max-w-7xl w-full mx-auto bg-slate-800 overflow-hidden lg:h-[450px]'
            style={{ borderRadius: '100px 30px 30px 30px' }}
          >
            <div className='absolute -z-10 inset-0 overflow-hidden' aria-hidden='true'>
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
            <div className='flex items-start justify-between pt-8 pl-8 sm:pl-14 lg:pl-28 md:flex-row flex-col'>
              <div className='max-w-[520px] w-full pt-14 pr-3 mb-16 md:mb-0'>
                <h2 className='font-bold text-2xl leading-9 sm:text-4xl sm:leading-[48px] md:text-[28px] md:leading-10 lg:text-[33px] lg:leading-[48px] text-white mb-3'>
                  <Trans
                    // @ts-ignore
                    t={t}
                    i18nKey='main.timeToDitchGoogleAnalytics'
                    components={{
                      colour: <span className='text-red-600' />,
                    }}
                  />
                </h2>
                <p className='text-gray-300 mb-9 font-medium text-base sm:text-lg'>{t('main.whyDitch')}</p>
                <Link
                  to={routesPath.signup}
                  className='rounded-md border !duration-300 transition-all w-full max-w-[210px] h-[50px] flex items-center justify-center sm:mr-6 shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 border-transparent'
                  aria-label={t('titles.signup')}
                >
                  <span className='text-base font-semibold mr-1'>{t('main.start')}</span>
                  <ArrowSmallRightIcon className='w-5 h-4 mt-[1px]' />
                </Link>
              </div>
              <div className='max-w-md xl:max-w-lg block h-[450px] md:shadow-[8px_8px_10px_3px] md:rounded-md '>
                <img
                  className='rounded-xl ring-1 ring-gray-900/10 min-h-[600px] min-w-[880px]'
                  width='1760'
                  height='880'
                  src={theme === 'dark' ? '/assets/screenshot_perf_dark.png' : '/assets/screenshot_perf_light.png'}
                  alt='Swetrix Analytics dashboard'
                />
              </div>
            </div>
          </section>
        </div>

        {/* Become a developer */}
        <section className='bg-white dark:bg-slate-900 pt-20 pb-44 relative'>
          <div className='absolute right-0 top-16 z-0'>
            <BackgroundSvg theme={theme} type='threecircle' />
          </div>
          <div className='absolute -left-9 top-52 rotate-90'>
            <BackgroundSvg theme={theme} type='shapes' />
          </div>
          <div className='max-w-5xl w-full mx-auto px-3'>
            <div className='max-w-prose w-full mx-auto'>
              <h2 className='text-gray-900 dark:text-white text-3xl md:text-4xl font-extrabold text-center'>
                {t('main.peopleLoveSwetrix')}
              </h2>
              <p className='mt-5 text-xl max-w-prose text-gray-600 dark:text-gray-200 text-center mx-auto'>
                {t('main.whyPeopleLoveSwetrix')}
              </p>
            </div>
            <div className='flex items-center justify-between mt-20 md:mt-32 md:flex-row flex-col'>
              <div className='text-center'>
                <ClientOnly fallback={<p className='text-indigo-700 text-5xl font-extrabold text-center'>0</p>}>
                  {() => (
                    <p className='text-indigo-700 text-5xl font-extrabold text-center'>
                      {users[0]}
                      {users[1] && <span className='text-gray-900 dark:text-indigo-200'>{users[1]}+</span>}
                    </p>
                  )}
                </ClientOnly>
                <p className='text-gray-600 text-lg dark:text-gray-200'>{t('main.users')}</p>
              </div>
              <div className='bg-gray-800 dark:bg-gray-200 w-2 h-2 rounded-full mx-5 mb-14 mt-16 md:mb-0 md:mt-0' />
              <div className='text-center'>
                <ClientOnly fallback={<p className='text-indigo-700 text-5xl font-extrabold text-center'>0</p>}>
                  {() => (
                    <p className='text-indigo-700 text-5xl font-extrabold text-center'>
                      {websites[0]}
                      {websites[1] && <span className='text-gray-900 dark:text-indigo-200'>{websites[1]}+</span>}
                    </p>
                  )}
                </ClientOnly>
                <p className='text-gray-600 text-lg dark:text-gray-200'>{t('main.websites')}</p>
              </div>
              <div className='bg-gray-800 dark:bg-gray-200 w-2 h-2 rounded-full mx-5 mb-14 mt-16 md:mb-0 md:mt-0' />
              <div className='text-center'>
                <ClientOnly fallback={<p className='text-indigo-700 text-5xl font-extrabold text-center'>0</p>}>
                  {() => (
                    <p className='text-indigo-700 text-5xl font-extrabold text-center'>
                      {events[0]}
                      {events[1] && <span className='text-gray-900 dark:text-indigo-200'>{events[1]}+</span>}
                    </p>
                  )}
                </ClientOnly>
                <p className='text-gray-600 text-lg dark:text-gray-200'>{t('main.pageviews')}</p>
              </div>
            </div>
          </div>
        </section>
        {/* end Become a developer */}
      </main>
    </div>
  )
}

export default memo(Main)
