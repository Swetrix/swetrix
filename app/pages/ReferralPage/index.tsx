import React from 'react'
import { Link, useParams } from '@remix-run/react'
import { useSelector } from 'react-redux'
import { useTranslation, Trans } from 'react-i18next'
import { ArrowSmallRightIcon } from '@heroicons/react/24/outline'

import { StateType } from 'redux/store/index'
import Header from 'components/Header'
import routes from 'routesPath'
import { Lines } from 'pages/MainPage'

import { isBrowser, REFERRAL_COOKIE_DAYS, REFERRAL_DISCOUNT } from 'redux/constants'

interface IReferralPage {
  ssrTheme: 'dark' | 'light'
}

const ReferralPage = ({ ssrTheme }: IReferralPage): JSX.Element => {
  const {
    t,
  }: {
    t: (
      key: string,
      options?: {
        [key: string]: string | number
      },
    ) => string
  } = useTranslation('common')
  const reduxTheme = useSelector((state: StateType) => state.ui.theme.theme)
  const theme = isBrowser ? reduxTheme : ssrTheme

  // Referral code
  const { id } = useParams()

  return (
    <div className='overflow-hidden'>
      <main className='bg-white dark:bg-slate-900 min-h-[100vh]'>
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
          <Header ssrTheme={ssrTheme} authenticated={false} refPage transparent />
          <div className='relative pt-10 lg:pt-24 pb-5 xl:px-8 lg:px-6 sm:px-3 mx-auto min-h-[740px]'>
            <div className='relative z-20 flex flex-row content-between 2xl:mr-[14vw] 2xl:justify-center justify-center lg:justify-start'>
              <div className='lg:mt-0 text-left relative lg:mr-14 px-4'>
                <h1 className='max-w-2xl text-2xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white sm:leading-none xl:leading-[110%]'>
                  <Trans
                    // @ts-ignore
                    t={t}
                    i18nKey='main.slogan'
                    components={{
                      span: (
                        <span className='from-indigo-700 to-indigo-700 dark:from-indigo-600 dark:to-indigo-400 text-transparent bg-clip-text bg-gradient-to-r' />
                      ),
                    }}
                  />
                </h1>
                <p className='text-base text-slate-700 dark:text-slate-300 sm:text-xl lg:text-lg xl:text-lg mt-5'>
                  {t('referral.desc')}
                </p>
                <h2 className='text-xl sm:text-xl md:text-xl font-medium text-slate-900 dark:text-white sm:leading-none xl:leading-[110%] mt-10'>
                  {t('referral.buttons', {
                    discount: REFERRAL_DISCOUNT,
                  })}
                </h2>
                <div className='mt-4 flex flex-col items-center sm:flex-row'>
                  <Link
                    to={`/ref/${id}${routes.signup}`}
                    className='rounded-md !duration-300 transition-all w-full sm:max-w-[210px] h-12 flex items-center justify-center sm:mr-6 shadow-sm ring-1 text-white bg-slate-900 ring-slate-900 hover:bg-slate-700 dark:bg-indigo-700 dark:ring-indigo-700 dark:hover:bg-indigo-600'
                    aria-label={t('titles.signup')}
                  >
                    <span className='text-base font-semibold mr-1'>{t('common.getStarted')}</span>
                    <ArrowSmallRightIcon className='h-4 w-5 mt-[1px]' />
                  </Link>
                  <Link
                    to={`/ref/${id}/index#core-analytics`}
                    className='rounded-md !duration-300 transition-all sm:mt-0 mt-2 ring-1 ring-slate-900 dark:ring-white/20 w-full sm:max-w-[210px] h-12 flex items-center justify-center shadow-sm text-slate-900 dark:text-white bg-transparent hover:bg-slate-200 dark:hover:bg-gray-800'
                    aria-label={t('titles.signup')}
                  >
                    <span className='text-base font-semibold'>{t('common.learnMore')}</span>
                  </Link>
                </div>
                <p className='text-base tracking-tighter font-medium text-slate-500 dark:text-slate-500 mt-5'>
                  {t('referral.cookieDetails', {
                    days: REFERRAL_COOKIE_DAYS,
                    discount: REFERRAL_DISCOUNT,
                  })}
                </p>
              </div>
              <div className='max-w-md xl:max-w-lg hidden lg:block'>
                <Lines />
                <picture>
                  <source
                    srcSet={theme === 'dark' ? '/assets/screenshot_dark.webp' : '/assets/screenshot_light.webp'}
                    type='image/webp'
                  />
                  <img
                    src={theme === 'dark' ? '/assets/screenshot_dark.png' : '/assets/screenshot_light.png'}
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
                  srcSet={theme === 'dark' ? '/assets/screenshot_dark.webp' : '/assets/screenshot_light.webp'}
                  type='image/webp'
                />
                <img
                  src={theme === 'dark' ? '/assets/screenshot_dark.png' : '/assets/screenshot_light.png'}
                  className='rounded-xl relative shadow-2xl w-full ring-1 ring-gray-900/10 dark:ring-white/10'
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
