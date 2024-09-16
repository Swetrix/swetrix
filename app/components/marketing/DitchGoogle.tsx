import { Link } from '@remix-run/react'
import { ArrowRightIcon } from '@heroicons/react/20/solid'
import { Trans, useTranslation } from 'react-i18next'

import routes from 'utils/routes'
import React from 'react'

interface IDitchGoogle {
  screenshot: {
    light: string
    dark: string
  }
  theme: 'dark' | 'light'
}

export const DitchGoogle = ({ screenshot: { light, dark }, theme }: IDitchGoogle) => {
  const { t } = useTranslation('common')

  return (
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
                t={t}
                i18nKey='main.timeToDitchGoogleAnalytics'
                components={{
                  colour: <span className='text-red-600' />,
                }}
              />
            </h2>
            <p className='mb-9 text-base font-medium text-gray-300 sm:text-lg'>{t('main.whyDitch')}</p>
            <Link
              to={routes.signup}
              className='group flex h-[50px] w-full max-w-[210px] items-center justify-center rounded-md border border-transparent bg-indigo-600 text-white shadow-sm transition-all !duration-300 hover:bg-indigo-700 sm:mr-6'
              aria-label={t('titles.signup')}
            >
              <span className='mr-1 text-base font-semibold'>{t('main.start')}</span>
              <ArrowRightIcon className='mt-[1px] h-4 w-5 transition-transform group-hover:scale-[1.15]' />
            </Link>
          </div>
          <div className='block h-[450px] max-w-md md:rounded-md md:shadow-[8px_8px_10px_3px] xl:max-w-lg'>
            <img
              className='min-h-[600px] min-w-[880px] rounded-xl ring-1 ring-gray-900/10'
              width='1760'
              height='880'
              src={theme === 'dark' ? dark : light}
              alt='Swetrix Analytics dashboard'
            />
          </div>
        </div>
      </section>
    </div>
  )
}
