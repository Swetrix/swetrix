import { ArrowRightIcon, CheckCircleIcon } from '@phosphor-icons/react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from '~/ui/Link'
import { Text } from '~/ui/Text'

import routes from '~/utils/routes'

const TRUST_KEYS = ['main.freeToTry', 'main.easyToUse', 'main.privacyFirst']

export const DitchGoogle = () => {
  const { t } = useTranslation('common')

  return (
    <div className='relative mx-auto max-w-7xl px-2 pt-10 pb-20 lg:px-8'>
      <section className='relative isolate overflow-hidden rounded-4xl bg-slate-950 px-5 py-10 ring-1 ring-black/5 sm:px-8 sm:py-14 lg:px-12 lg:py-18 dark:ring-white/10'>
        <div aria-hidden className='pointer-events-none absolute inset-0 -z-10'>
          <picture className='absolute inset-0 block'>
            <source srcSet='/assets/hero-background.avif' type='image/avif' />
            <img
              alt=''
              className='size-full object-cover object-center opacity-80 saturate-125'
              src='/assets/hero-background.webp'
              loading='lazy'
            />
          </picture>
          <div className='absolute inset-0 bg-slate-950/65' />
          <div className='absolute inset-0 bg-radial-[at_50%_38%] from-red-950/20 via-slate-950/20 to-slate-950/85' />
        </div>

        <div className='relative mx-auto flex max-w-5xl flex-col items-center text-center'>
          <Text
            as='h2'
            size='4xl'
            weight='bold'
            tracking='tight'
            colour='primary'
            className='dark max-w-5xl sm:text-5xl lg:text-6xl'
          >
            <Trans
              t={t}
              i18nKey='main.timeToDitchGoogleAnalytics'
              components={{
                colour: <span className='text-red-400' />,
              }}
            />
          </Text>
          <Text
            as='p'
            size='lg'
            colour='secondary'
            className='dark mt-6 max-w-3xl leading-8'
          >
            {t('main.whyDitch')}
          </Text>
          <div className='mt-9 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row sm:items-center'>
            <Link
              to={routes.signup}
              className='inline-flex h-12 items-center justify-center rounded-md bg-white px-5 text-slate-950 ring-1 ring-white/30 transition-[transform,background-color] duration-150 ease-out-quint hover:bg-gray-100 active:scale-[0.97]'
              aria-label={t('titles.signup')}
            >
              <span className='text-center text-base font-semibold'>
                {t('main.startAXDayFreeTrial', { amount: 14 })}
              </span>
              <ArrowRightIcon className='mt-[1px] ml-1 h-4 w-5' />
            </Link>
          </div>

          <div className='mt-7 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-gray-200'>
            {TRUST_KEYS.map((key) => (
              <div key={key} className='flex items-center gap-2'>
                <CheckCircleIcon className='size-4 text-gray-50' />
                {t(key)}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
