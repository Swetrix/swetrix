import { ArrowRightIcon } from '@heroicons/react/20/solid'
import { ChevronRightIcon } from '@heroicons/react/24/solid'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import { useEffect, useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { Link } from 'react-router'
import { ClientOnly } from 'remix-utils/client-only'

import { getGeneralStats, getLastPost } from '~/api'
import Header from '~/components/Header'
import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import { PERFORMANCE_LIVE_DEMO_URL } from '~/lib/constants'
import { Stats } from '~/lib/models/Stats'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
import BackgroundSvg from '~/ui/icons/BackgroundSvg'
import { nFormatterSeparated } from '~/utils/generic'
import routesPath from '~/utils/routes'

import Pricing from '../../components/marketing/Pricing'

const Lines = () => (
  <div className='pointer-events-none relative'>
    <div className='absolute top-[32rem] right-[-48rem] h-px w-[800%] rotate-6 bg-gradient-to-l from-slate-600 opacity-10 dark:from-slate-400' />
    <div className='absolute top-[22.26rem] -left-60 ml-[-0.5px] h-96 w-[2px] rotate-[96deg] rounded-full bg-gradient-to-t from-orange-600 opacity-50 xl:top-[23.5rem] dark:from-orange-700' />
  </div>
)

export const PeopleLoveSwetrix = () => {
  const { t } = useTranslation('common')
  const [stats, setStats] = useState<Stats>({} as Stats)

  useEffect(() => {
    getGeneralStats()
      .then((stats) => setStats(stats))
      .catch(console.error)
  }, [])

  const events = nFormatterSeparated(Number(stats.events))
  const users = nFormatterSeparated(Number(stats.users))
  const websites = nFormatterSeparated(Number(stats.projects))

  return (
    <div className='mx-auto w-full max-w-5xl px-3'>
      <div className='mx-auto w-full max-w-prose'>
        <h2 className='text-center text-3xl font-extrabold text-gray-900 md:text-4xl dark:text-white'>
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
                {users[1] ? <span className='text-gray-900 dark:text-indigo-200'>{users[1]}+</span> : null}
              </p>
            )}
          </ClientOnly>
          <p className='text-lg text-gray-600 dark:text-gray-200'>{t('main.users')}</p>
        </div>
        <div className='mx-5 mt-16 mb-14 h-2 w-2 rounded-full bg-gray-800 md:mt-0 md:mb-0 dark:bg-gray-200' />
        <div className='text-center'>
          <ClientOnly fallback={<p className='text-center text-5xl font-extrabold text-indigo-700'>0</p>}>
            {() => (
              <p className='text-center text-5xl font-extrabold text-indigo-700'>
                {websites[0]}
                {websites[1] ? <span className='text-gray-900 dark:text-indigo-200'>{websites[1]}+</span> : null}
              </p>
            )}
          </ClientOnly>
          <p className='text-lg text-gray-600 dark:text-gray-200'>{t('main.websites')}</p>
        </div>
        <div className='mx-5 mt-16 mb-14 h-2 w-2 rounded-full bg-gray-800 md:mt-0 md:mb-0 dark:bg-gray-200' />
        <div className='text-center'>
          <ClientOnly fallback={<p className='text-center text-5xl font-extrabold text-indigo-700'>0</p>}>
            {() => (
              <p className='text-center text-5xl font-extrabold text-indigo-700'>
                {events[0]}
                {events[1] ? <span className='text-gray-900 dark:text-indigo-200'>{events[1]}+</span> : null}
              </p>
            )}
          </ClientOnly>
          <p className='text-lg text-gray-600 dark:text-gray-200'>{t('main.pageviews')}</p>
        </div>
      </div>
    </div>
  )
}

const Performance = () => {
  const { t } = useTranslation('common')
  const { theme } = useTheme()
  const [lastBlogPost, setLastBlogPost] = useState<Awaited<ReturnType<typeof getLastPost>> | null>(null)
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    const abortController = new AbortController()

    getLastPost({ signal: abortController.signal })
      .then(setLastBlogPost)
      .catch(() => {})

    return () => abortController.abort()
  }, [])

  return (
    <div className='overflow-hidden'>
      <main className='bg-white dark:bg-slate-900'>
        {/* first block with live demo */}
        <div className='relative isolate overflow-x-clip'>
          <svg
            className='absolute inset-0 -z-10 h-full w-full [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)] stroke-gray-200 dark:stroke-white/10'
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
          <Header transparent />
          <div className='relative mx-auto min-h-[740px] pt-10 pb-5 sm:px-3 lg:px-6 lg:pt-24 xl:px-8'>
            <div className='relative z-20 flex flex-row content-between justify-center lg:justify-start 2xl:mr-[14vw] 2xl:justify-center'>
              <div className='relative px-4 text-left lg:mt-0 lg:mr-14'>
                <h1 className='max-w-2xl text-3xl font-extrabold text-slate-900 sm:text-5xl sm:leading-none md:text-5xl lg:text-5xl xl:text-6xl xl:leading-[110%] dark:text-white'>
                  <Trans
                    t={t}
                    i18nKey='performance.slogan'
                    components={{
                      span: (
                        <span className='bg-gradient-to-r from-orange-700 to-orange-700 bg-clip-text text-transparent dark:from-orange-600 dark:to-red-400' />
                      ),
                    }}
                  />
                </h1>
                <div className='mt-2 mb-2 flex items-center overflow-hidden sm:text-xl lg:text-lg xl:text-lg'>
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
                          to={`/blog/${lastBlogPost.handle}`}
                        >
                          <small className='text-sm'>{lastBlogPost.title}</small>
                          <ChevronRightIcon className='h-4 w-4 text-slate-500' aria-hidden='true' />
                        </Link>
                      )}
                    </ClientOnly>
                  )}
                </div>
                <p className='text-base leading-8 text-slate-900 sm:text-xl lg:text-lg xl:text-lg dark:text-slate-300'>
                  {t('performance.description')}
                </p>
                <div className='mt-10 flex flex-col items-center sm:flex-row'>
                  <Link
                    to={routesPath.signup}
                    className='group flex h-12 w-full items-center justify-center rounded-md bg-slate-900 text-white ring-1 ring-slate-900 transition-all !duration-300 hover:bg-slate-700 sm:mr-6 sm:max-w-[210px] dark:bg-indigo-700 dark:ring-indigo-700 dark:hover:bg-indigo-600'
                    aria-label={t('titles.signup')}
                  >
                    <span className='mr-1 text-center text-base font-semibold transition-transform group-hover:scale-[1.15]'>
                      {t('main.startAFreeTrial')}
                    </span>
                    <ArrowRightIcon className='mt-[1px] h-4 w-5' />
                  </Link>
                  <a
                    href={PERFORMANCE_LIVE_DEMO_URL}
                    className='mt-2 flex h-12 w-full items-center justify-center rounded-md bg-transparent text-slate-900 shadow-xs ring-1 ring-slate-900 transition-all !duration-300 hover:bg-slate-200/60 sm:mt-0 sm:max-w-[210px] dark:text-white dark:ring-white/20 dark:hover:bg-slate-800/60'
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
                      theme === 'dark' ? '/assets/screenshot_perf_dark.webp' : '/assets/screenshot_perf_light.webp'
                    }
                    type='image/webp'
                  />
                  <img
                    src={theme === 'dark' ? '/assets/screenshot_perf_dark.png' : '/assets/screenshot_perf_light.png'}
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
                  srcSet={theme === 'dark' ? '/assets/screenshot_perf_dark.webp' : '/assets/screenshot_perf_light.webp'}
                  type='image/webp'
                />
                <img
                  src={theme === 'dark' ? '/assets/screenshot_perf_dark.png' : '/assets/screenshot_perf_light.png'}
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
          <h2 className='text-4xl font-extrabold text-slate-900 dark:text-white'>{t('performance.fast.title')}</h2>
          <p className='mt-6 text-lg text-gray-900 dark:text-gray-50'>
            <Trans
              t={t}
              i18nKey='performance.fast.desc'
              components={{
                indexUrl: (
                  <Link
                    to={routesPath.main}
                    className='font-medium text-orange-600 hover:underline dark:text-orange-400'
                  />
                ),

                wpostatsUrl: (
                  <a
                    href='https://wpostats.com/?utm_source=swetrix.com'
                    className='font-medium text-orange-600 hover:underline dark:text-orange-400'
                    target='_blank'
                    rel='noopener noreferrer'
                  />
                ),
              }}
            />
          </p>
          <ul className='mt-2 list-inside list-disc text-lg text-gray-900 dark:text-gray-50'>
            {_map(t('performance.fast.list', { returnObjects: true }), (item) => (
              <li key={item} className='mb-2'>
                {item}
              </li>
            ))}
          </ul>

          <h2 className='mt-10 text-4xl font-extrabold text-slate-900 dark:text-white'>
            {t('performance.metrics.title')}
          </h2>
          <p className='mt-6 text-lg text-gray-900 dark:text-gray-50'>{t('performance.metrics.desc')}</p>

          <h2 className='mt-10 text-4xl font-extrabold text-slate-900 dark:text-white'>
            {t('performance.privacy.title')}
          </h2>
          <p className='mt-6 text-lg text-gray-900 dark:text-gray-50'>{t('performance.privacy.desc')}</p>
        </div>

        {/* For now let's hide Pricing for authenticated users on the main page as the Paddle script only loads on the Billing page */}
        {isAuthenticated ? null : <Pricing authenticated={false} />}

        <DitchGoogle
          screenshot={{
            dark: '/assets/screenshot_perf_dark.png',
            light: '/assets/screenshot_perf_light.png',
          }}
        />

        {/* Become a developer */}
        <section className='relative bg-white pt-20 pb-44 dark:bg-slate-900'>
          <div className='absolute top-16 right-0 z-0'>
            <BackgroundSvg type='threecircle' />
          </div>
          <div className='absolute top-52 -left-9 rotate-90'>
            <BackgroundSvg type='shapes' />
          </div>
          <PeopleLoveSwetrix />
        </section>
        {/* end Become a developer */}
      </main>
    </div>
  )
}

export default Performance
