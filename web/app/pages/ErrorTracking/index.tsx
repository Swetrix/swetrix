import { ArrowRightIcon } from '@phosphor-icons/react'
import _map from 'lodash/map'
import { useTranslation, Trans } from 'react-i18next'
import { Link } from '~/ui/Link'

import Header from '~/components/Header'
import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import MarketingPricing from '~/components/pricing/MarketingPricing'
import { ERROR_TRACKING_LIVE_DEMO_URL } from '~/lib/constants'
import { useTheme } from '~/providers/ThemeProvider'
import { Text } from '~/ui/Text'
import routesPath from '~/utils/routes'
import { LogoCloud } from '~/components/marketing/LogoCloud'
import { FeedbackDual } from '~/routes/_index'

const ErrorTracking = () => {
  const { t } = useTranslation('common')
  const { theme } = useTheme()

  return (
    <div className='overflow-hidden'>
      <main className='bg-gray-50 dark:bg-slate-950'>
        <div className='relative isolate bg-gray-100/80 pt-2 dark:bg-slate-900/50'>
          <div className='relative mx-2 overflow-hidden rounded-4xl'>
            <div
              aria-hidden
              className='pointer-events-none absolute inset-0 -z-10'
            >
              <div className='absolute inset-0 rounded-4xl bg-linear-115 from-slate-100 from-28% via-red-400 via-75% to-red-700 opacity-50 ring-1 ring-black/5 ring-inset sm:bg-linear-145 dark:from-slate-950 dark:opacity-45 dark:ring-white/10' />
            </div>
            <Header transparent />
            <section className='mx-auto max-w-7xl px-4 pt-10 pb-5 sm:px-3 lg:grid lg:grid-cols-12 lg:gap-8 lg:px-6 lg:pt-20 xl:px-8'>
              <div className='z-20 col-span-6 flex flex-col items-start'>
                <Text
                  as='h1'
                  size='4xl'
                  weight='semibold'
                  tracking='tight'
                  className='max-w-5xl text-left text-pretty sm:text-5xl sm:leading-none lg:mt-6 lg:text-6xl xl:text-7xl'
                >
                  <Trans
                    t={t}
                    i18nKey='errors.slogan'
                    components={{
                      span: <span className='text-red-700 dark:text-red-400' />,
                    }}
                  />
                </Text>
                <Text as='p' size='lg' className='mt-4 max-w-2xl text-left'>
                  {t('errors.description')}
                </Text>
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
                        ? '/assets/screenshot_errors_dark.png'
                        : '/assets/screenshot_errors_light.png'
                    }
                    className='relative w-full'
                    width='100%'
                    height='auto'
                    alt='Swetrix Analytics dashboard'
                  />
                  <div className='absolute inset-0 flex items-center justify-center bg-slate-900/20 opacity-100 backdrop-blur-[1px] transition-opacity duration-200'>
                    <a
                      href={ERROR_TRACKING_LIVE_DEMO_URL}
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
                <div className='group relative -mr-6 hidden w-[140%] overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5 transition-shadow ease-out hover:ring-gray-300/80 sm:-mr-12 sm:w-[160%] lg:-mr-16 lg:block lg:w-[180%] xl:-mr-24 2xl:-mr-32 dark:bg-slate-800 dark:ring-white/10 dark:hover:ring-white/20'>
                  <div className='relative h-[580px] lg:h-[640px] xl:h-[700px]'>
                    <img
                      src={
                        theme === 'dark'
                          ? '/assets/screenshot_errors_dark.png'
                          : '/assets/screenshot_errors_light.png'
                      }
                      className='size-full object-cover object-left'
                      alt='Swetrix Error Tracking'
                    />
                    <div className='pointer-events-auto absolute inset-0 flex items-center justify-center bg-slate-900/20 opacity-100 backdrop-blur-[1px] transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 lg:pointer-events-none lg:bg-slate-900/40 lg:opacity-0 lg:backdrop-blur-[2px]'>
                      <a
                        href={ERROR_TRACKING_LIVE_DEMO_URL}
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

        <LogoCloud />

        <div className='mx-auto mt-12 max-w-7xl bg-white px-4 pb-16 whitespace-pre-line dark:bg-slate-950'>
          <Text as='h2' size='4xl' weight='bold' tracking='tight'>
            {t('errors.fast.title')}
          </Text>
          <Text as='p' size='lg' className='mt-6'>
            <Trans
              t={t}
              i18nKey='errors.fast.desc'
              components={{
                indexUrl: (
                  <Link
                    to={routesPath.main}
                    className='font-medium text-red-600 hover:underline dark:text-red-400'
                  />
                ),

                perfUrl: (
                  <Link
                    to={routesPath.performance}
                    className='font-medium text-red-600 hover:underline dark:text-red-400'
                  />
                ),
                oneLC: (
                  <a
                    href='https://swetrix.com/docs/swetrix-js-reference#trackerrors'
                    className='font-medium text-red-600 hover:underline dark:text-red-400'
                    target='_blank'
                    rel='noopener noreferrer'
                  />
                ),
              }}
            />
          </Text>
          <ul className='mt-2 list-inside list-disc'>
            {_map(t('errors.fast.list', { returnObjects: true }), (item) => (
              <Text as='li' size='lg' key={item} className='mb-2'>
                {item}
              </Text>
            ))}
          </ul>

          <Text
            as='h2'
            size='4xl'
            weight='bold'
            tracking='tight'
            className='mt-10'
          >
            {t('errors.track.title')}
          </Text>
          <Text as='p' size='lg' className='mt-6'>
            {t('errors.track.desc')}
          </Text>

          <Text
            as='h2'
            size='4xl'
            weight='bold'
            tracking='tight'
            className='mt-10'
          >
            {t('performance.privacy.title')}
          </Text>
          <Text as='p' size='lg' className='mt-6'>
            {t('performance.privacy.desc')}
          </Text>
        </div>

        <MarketingPricing />

        <FeedbackDual />

        <DitchGoogle />
      </main>
    </div>
  )
}

export default ErrorTracking
