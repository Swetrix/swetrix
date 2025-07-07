import { ArrowRightIcon } from '@heroicons/react/20/solid'
import { useTranslation, Trans } from 'react-i18next'
import { Link, useParams } from 'react-router'

import Header from '~/components/Header'
import { Lines } from '~/components/marketing/Lines'
import { REFERRAL_COOKIE_DAYS, REFERRAL_DISCOUNT } from '~/lib/constants'
import { useTheme } from '~/providers/ThemeProvider'
import routes from '~/utils/routes'

const ReferralPage = () => {
  const { t } = useTranslation('common')
  const { theme } = useTheme()

  // Referral code
  const { id } = useParams()

  return (
    <div className='overflow-hidden'>
      <main className='min-h-[100vh] bg-white dark:bg-slate-900'>
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
          <Header refPage transparent />
          <div className='relative mx-auto min-h-[740px] pt-10 pb-5 sm:px-3 lg:px-6 lg:pt-24 xl:px-8'>
            <div className='relative z-20 flex flex-row content-between justify-center lg:justify-start 2xl:mr-[14vw] 2xl:justify-center'>
              <div className='relative px-4 text-left lg:mt-0 lg:mr-14'>
                <h1 className='max-w-2xl text-2xl font-extrabold text-slate-900 sm:text-4xl sm:leading-none md:text-5xl xl:leading-[110%] dark:text-white'>
                  <Trans
                    t={t}
                    i18nKey='main.slogan'
                    components={{
                      span: (
                        <span className='bg-gradient-to-r from-indigo-700 to-indigo-700 bg-clip-text text-transparent dark:from-indigo-600 dark:to-indigo-400' />
                      ),
                    }}
                  />
                </h1>
                <p className='mt-5 text-base text-slate-700 sm:text-xl lg:text-lg xl:text-lg dark:text-slate-300'>
                  {t('referral.desc')}
                </p>
                <h2 className='mt-10 text-xl font-medium text-slate-900 sm:text-xl sm:leading-none md:text-xl xl:leading-[110%] dark:text-white'>
                  {t('referral.buttons', {
                    discount: REFERRAL_DISCOUNT,
                  })}
                </h2>
                <div className='mt-4 flex flex-col items-center sm:flex-row'>
                  <Link
                    to={`/ref/${id}${routes.signup}`}
                    className='group flex h-12 w-full items-center justify-center rounded-md bg-slate-900 text-white ring-1 ring-slate-900 transition-all !duration-300 hover:bg-slate-700 sm:mr-6 sm:max-w-[210px] dark:bg-indigo-700 dark:ring-indigo-700 dark:hover:bg-indigo-600'
                    aria-label={t('titles.signup')}
                  >
                    <span className='mr-1 text-center text-base font-semibold transition-transform group-hover:scale-[1.15]'>
                      {t('main.startAXDayFreeTrial', { amount: 14 })}
                    </span>
                    <ArrowRightIcon className='mt-[1px] h-4 w-5' />
                  </Link>
                  <Link
                    to={`/ref/${id}/index#core-analytics`}
                    className='mt-2 flex h-12 w-full items-center justify-center rounded-md bg-transparent text-slate-900 ring-1 ring-slate-900 transition-all !duration-300 hover:bg-slate-200/60 sm:mt-0 sm:max-w-[210px] dark:text-white dark:ring-white/20 dark:hover:bg-slate-800/60'
                    aria-label={t('titles.signup')}
                  >
                    <span className='text-base font-semibold'>{t('common.learnMore')}</span>
                  </Link>
                </div>
                <p className='mt-5 text-base font-medium text-slate-500 dark:text-slate-500'>
                  {t('referral.cookieDetails', {
                    days: REFERRAL_COOKIE_DAYS,
                    discount: REFERRAL_DISCOUNT,
                  })}
                </p>
              </div>
              <div className='hidden max-w-md lg:block xl:max-w-lg'>
                <Lines />
                <picture>
                  <source
                    srcSet={theme === 'dark' ? '/assets/screenshot_dark.webp' : '/assets/screenshot_light.webp'}
                    type='image/webp'
                  />
                  <img
                    src={theme === 'dark' ? '/assets/screenshot_dark.png' : '/assets/screenshot_light.png'}
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
                  srcSet={theme === 'dark' ? '/assets/screenshot_dark.webp' : '/assets/screenshot_light.webp'}
                  type='image/webp'
                />
                <img
                  src={theme === 'dark' ? '/assets/screenshot_dark.png' : '/assets/screenshot_light.png'}
                  className='relative w-full rounded-xl ring-2 ring-gray-900/10 dark:ring-white/10'
                  width='100%'
                  height='auto'
                  alt='Swetrix Analytics dashboard'
                />
              </picture>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ReferralPage
