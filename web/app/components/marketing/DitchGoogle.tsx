import { ArrowRightIcon, CheckCircleIcon } from '@heroicons/react/20/solid'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import routes from '~/utils/routes'

export const DitchGoogle = () => {
  const { t } = useTranslation('common')

  return (
    <div className='relative mx-auto max-w-7xl px-6 py-24 sm:py-28 lg:px-8'>
      <div className='mx-auto max-w-4xl text-center'>
        <div className='rounded-xl border border-gray-200 bg-white p-8 backdrop-blur-xl sm:p-12 lg:p-16 dark:border-gray-700 dark:bg-slate-800/40'>
          <h2 className='mb-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white'>
            <Trans
              t={t}
              i18nKey='main.timeToDitchGoogleAnalytics'
              components={{
                colour: <span className='bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent' />,
              }}
            />
          </h2>
          <p className='mx-auto mb-10 max-w-2xl text-xl leading-relaxed text-slate-700 dark:text-slate-300'>
            {t('main.whyDitch')}
          </p>
          <div className='mb-8 flex flex-col items-center justify-center gap-4 sm:flex-row'>
            <Link
              to={routes.signup}
              className='group relative inline-flex items-center justify-center rounded-xl border border-gray-200 bg-gradient-to-r from-indigo-500 to-purple-500 bg-[length:200%] bg-[position:0%_0%] px-10 py-5 text-xl font-semibold text-white shadow-sm transition-all duration-300 hover:bg-[position:100%_100%] hover:shadow-md dark:border-gray-700 dark:from-indigo-600 dark:to-purple-600'
              aria-label={t('titles.signup')}
            >
              <span className='relative flex items-center'>
                {t('main.startAXDayFreeTrial', { amount: 14 })}
                <ArrowRightIcon className='ml-3 h-6 w-6 transition-transform group-hover:translate-x-1' />
              </span>
            </Link>
          </div>
          <div className='flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-slate-700 dark:text-slate-300'>
            <div className='flex items-center'>
              <CheckCircleIcon className='mr-2 h-5 w-5 text-green-500' />
              {t('main.freeToTry')}
            </div>
            <div className='flex items-center'>
              <CheckCircleIcon className='mr-2 h-5 w-5 text-green-500' />
              {t('main.easyToUse')}
            </div>
            <div className='flex items-center'>
              <CheckCircleIcon className='mr-2 h-5 w-5 text-green-500' />
              {t('main.privacyFirst')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
