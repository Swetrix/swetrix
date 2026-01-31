import { ArrowRightIcon } from '@heroicons/react/20/solid'
import { CheckIcon } from '@phosphor-icons/react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import routes from '~/utils/routes'

export const DitchGoogle = () => {
  const { t } = useTranslation('common')

  return (
    <div className='relative mx-auto max-w-7xl px-2 pt-10 pb-20 lg:px-8'>
      <div className='relative mx-auto max-w-7xl overflow-hidden rounded-4xl p-1 text-center sm:p-2 lg:p-3'>
        <div aria-hidden className='pointer-events-none absolute inset-0'>
          <div className='absolute inset-0 rounded-4xl bg-linear-115 from-red-500/50 to-orange-300/30 sm:bg-linear-145 dark:from-red-500/40 dark:to-orange-300/20' />
        </div>
        <div className='rounded-xl p-8 backdrop-blur-xl sm:p-12 lg:p-16'>
          <div className='mx-auto max-w-4xl'>
            <h2 className='mb-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white'>
              <Trans
                t={t}
                i18nKey='main.timeToDitchGoogleAnalytics'
                components={{
                  colour: (
                    <span className='bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent' />
                  ),
                }}
              />
            </h2>
            <p className='mx-auto mb-10 max-w-2xl text-xl leading-relaxed text-slate-900 dark:text-slate-200'>
              {t('main.whyDitch')}
            </p>
            <div className='mb-8 flex flex-col items-center justify-center gap-4 sm:flex-row'>
              <Link
                to={routes.signup}
                className='flex items-center justify-center rounded-md border-2 border-slate-900 bg-slate-900 px-6 py-4 text-white transition-all hover:bg-transparent hover:text-slate-900 dark:border-slate-50 dark:bg-gray-50 dark:text-slate-900 dark:hover:text-gray-50'
                aria-label={t('titles.signup')}
              >
                <span className='mr-1 text-center text-base font-semibold'>
                  {t('main.startAXDayFreeTrial', { amount: 14 })}
                </span>
                <ArrowRightIcon className='mt-[1px] h-4 w-5' />
              </Link>
            </div>
            <div className='flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-slate-900 dark:text-slate-200'>
              <div className='flex items-center'>
                <CheckIcon className='mr-1 size-4' />
                {t('main.freeToTry')}
              </div>
              <div className='flex items-center'>
                <CheckIcon className='mr-1 size-4' />
                {t('main.easyToUse')}
              </div>
              <div className='flex items-center'>
                <CheckIcon className='mr-1 size-4' />
                {t('main.privacyFirst')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
