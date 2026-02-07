import { ArrowRightIcon } from '@phosphor-icons/react'
import _map from 'lodash/map'
import { useTranslation, Trans } from 'react-i18next'
import { Link } from 'react-router'

import Header from '~/components/Header'
import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import MarketingPricing from '~/components/pricing/MarketingPricing'
import { PERFORMANCE_LIVE_DEMO_URL } from '~/lib/constants'
import { useTheme } from '~/providers/ThemeProvider'
import routesPath from '~/utils/routes'

const Performance = () => {
  const { t } = useTranslation('common')
  const { theme } = useTheme()

  return (
    <div className='overflow-hidden'>
      <main className='bg-gray-50 dark:bg-slate-950'>
        <div className='relative isolate bg-gray-100/80 pt-2 dark:bg-slate-800/50'>
          <div className='relative mx-2 overflow-hidden rounded-4xl'>
            <div
              aria-hidden
              className='pointer-events-none absolute inset-0 -z-10'
            >
              <div className='absolute inset-0 rounded-4xl bg-linear-115 from-amber-200 from-15% via-orange-400 via-70% to-orange-700 opacity-50 ring-1 ring-black/5 ring-inset sm:bg-linear-145 dark:from-slate-600 dark:opacity-60' />
            </div>
            <Header transparent />
            <section className='mx-auto max-w-7xl px-4 pt-10 pb-5 sm:px-3 lg:grid lg:grid-cols-12 lg:gap-8 lg:px-6 lg:pt-20 xl:px-8'>
              <div className='z-20 col-span-6 flex flex-col items-start'>
                <h1 className='max-w-5xl text-left text-5xl font-semibold tracking-tight text-pretty text-slate-900 sm:leading-none lg:mt-6 lg:text-6xl xl:text-7xl dark:text-white'>
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
                <p className='mt-4 max-w-2xl text-left text-lg text-slate-900 dark:text-gray-50'>
                  {t('performance.description')}
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
              </div>
              <div className='col-span-6 mt-10 overflow-visible lg:mt-0 lg:mr-0 lg:ml-4'>
                <div className='relative z-20 mx-auto mt-10 overflow-hidden rounded-xl ring-2 ring-gray-900/10 lg:hidden dark:ring-white/10'>
                  <img
                    src={
                      theme === 'dark'
                        ? '/assets/screenshot_perf_dark.png'
                        : '/assets/screenshot_perf_light.png'
                    }
                    className='relative w-full'
                    width='100%'
                    height='auto'
                    alt='Swetrix Analytics dashboard'
                  />
                  <div className='absolute inset-0 flex items-center justify-center bg-slate-900/20 opacity-100 backdrop-blur-[1px] transition-opacity duration-200'>
                    <a
                      href={PERFORMANCE_LIVE_DEMO_URL}
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
                <div className='group relative -mr-6 hidden w-[140%] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition-shadow ease-out hover:ring-indigo-300/50 sm:-mr-12 sm:w-[160%] lg:-mr-16 lg:block lg:w-[180%] xl:-mr-24 2xl:-mr-32 dark:bg-slate-800 dark:ring-white/10 dark:hover:ring-indigo-400/40'>
                  <div className='relative h-[580px] lg:h-[640px] xl:h-[700px]'>
                    <img
                      src={
                        theme === 'dark'
                          ? '/assets/screenshot_perf_dark.png'
                          : '/assets/screenshot_perf_light.png'
                      }
                      className='size-full object-cover object-left'
                      alt='Swetrix Analytics dashboard'
                    />
                    <div className='pointer-events-auto absolute inset-0 flex items-center justify-center bg-slate-900/20 opacity-100 backdrop-blur-[1px] transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 lg:pointer-events-none lg:bg-slate-900/40 lg:opacity-0 lg:backdrop-blur-[2px]'>
                      <a
                        href={PERFORMANCE_LIVE_DEMO_URL}
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
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className='mx-auto mt-12 max-w-7xl bg-white px-4 pb-16 whitespace-pre-line dark:bg-slate-950'>
          <h2 className='text-4xl font-extrabold text-slate-900 dark:text-white'>
            {t('performance.fast.title')}
          </h2>
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
            {_map(
              t('performance.fast.list', { returnObjects: true }),
              (item) => (
                <li key={item} className='mb-2'>
                  {item}
                </li>
              ),
            )}
          </ul>

          <h2 className='mt-10 text-4xl font-extrabold text-slate-900 dark:text-white'>
            {t('performance.metrics.title')}
          </h2>
          <p className='mt-6 text-lg text-gray-900 dark:text-gray-50'>
            {t('performance.metrics.desc')}
          </p>

          <h2 className='mt-10 text-4xl font-extrabold text-slate-900 dark:text-white'>
            {t('performance.privacy.title')}
          </h2>
          <p className='mt-6 text-lg text-gray-900 dark:text-gray-50'>
            {t('performance.privacy.desc')}
          </p>
        </div>

        <MarketingPricing />

        <DitchGoogle />
      </main>
    </div>
  )
}

export default Performance
