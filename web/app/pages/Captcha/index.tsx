import { ArrowRightIcon } from '@heroicons/react/20/solid'
import { CodeBracketIcon, PuzzlePieceIcon, CursorArrowRaysIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import _map from 'lodash/map'
import { useTranslation, Trans } from 'react-i18next'
import { Link } from 'react-router'

import Header from '~/components/Header'
import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import MarketingPricing from '~/components/pricing/MarketingPricing'
import { DOCS_URL } from '~/lib/constants'
import routesPath from '~/utils/routes'

const features = [
  {
    titleKey: 'captchaPage.features.privacy.title',
    descKey: 'captchaPage.features.privacy.desc',
    icon: EyeSlashIcon,
  },
  {
    titleKey: 'captchaPage.features.opensource.title',
    descKey: 'captchaPage.features.opensource.desc',
    icon: CodeBracketIcon,
  },
  {
    titleKey: 'captchaPage.features.customisable.title',
    descKey: 'captchaPage.features.customisable.desc',
    icon: PuzzlePieceIcon,
  },
  {
    titleKey: 'captchaPage.features.easy.title',
    descKey: 'captchaPage.features.easy.desc',
    icon: CursorArrowRaysIcon,
  },
]

const Captcha = () => {
  const { t } = useTranslation('common')

  return (
    <div className='overflow-hidden'>
      <main className='bg-gray-50 dark:bg-slate-900'>
        {/* Hero Section */}
        <div className='relative isolate bg-gray-100/80 pt-2 dark:bg-slate-800/50'>
          <div className='relative mx-2 overflow-hidden rounded-4xl'>
            <div aria-hidden className='pointer-events-none absolute inset-0 -z-10'>
              <div className='absolute inset-0 rounded-4xl bg-linear-115 from-indigo-200 from-15% via-purple-400 via-70% to-indigo-700 opacity-50 ring-1 ring-black/5 ring-inset sm:bg-linear-145 dark:from-slate-600 dark:opacity-60' />
            </div>
            <Header transparent />
            <section className='mx-auto max-w-7xl px-4 pt-10 pb-20 sm:px-3 lg:px-6 lg:pt-20 xl:px-8'>
              <div className='z-20 mx-auto flex max-w-4xl flex-col items-center text-center'>
                <h1 className='text-5xl font-semibold tracking-tight text-pretty text-slate-900 sm:leading-none lg:mt-6 lg:text-6xl xl:text-7xl dark:text-white'>
                  <Trans
                    t={t}
                    i18nKey='captchaPage.slogan'
                    components={{
                      span: (
                        <span className='bg-linear-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent dark:from-indigo-400 dark:to-purple-400' />
                      ),
                    }}
                  />
                </h1>
                <p className='mt-6 max-w-2xl text-lg text-slate-900 dark:text-gray-50'>
                  {t('captchaPage.description')}
                </p>
                <div className='mt-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center'>
                  <Link
                    to={routesPath.signup}
                    className='flex h-12 items-center justify-center rounded-md border-2 border-slate-900 bg-slate-900 px-6 text-white transition-all hover:bg-transparent hover:text-slate-900 dark:border-slate-50 dark:bg-gray-50 dark:text-slate-900 dark:hover:text-gray-50'
                    aria-label={t('titles.signup')}
                  >
                    <span className='mr-1 text-center text-base font-semibold'>
                      {t('main.startAXDayFreeTrial', { amount: 14 })}
                    </span>
                    <ArrowRightIcon className='mt-px h-4 w-5' />
                  </Link>
                  <a
                    href={`${DOCS_URL}/captcha/introduction`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex h-12 items-center justify-center rounded-md border-2 border-slate-900 bg-transparent px-6 text-slate-900 transition-all hover:bg-slate-900 hover:text-white dark:border-slate-50 dark:text-slate-50 dark:hover:bg-gray-50 dark:hover:text-slate-900'
                  >
                    <span className='text-center text-base font-semibold'>{t('common.docs')}</span>
                  </a>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Features Section */}
        <div className='mx-auto mt-20 max-w-7xl bg-gray-50 px-4 pb-16 dark:bg-slate-900'>
          <div className='text-center'>
            <h2 className='text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-white'>
              {t('captchaPage.whySwetrix')}
            </h2>
            <p className='mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-300'>
              {t('captchaPage.whySwetrixDesc')}
            </p>
          </div>

          <div className='mt-16 grid gap-8 sm:grid-cols-2 lg:gap-12'>
            {_map(features, (feature) => (
              <div key={feature.titleKey} className='relative flex gap-4'>
                <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/30'>
                  <feature.icon className='h-7 w-7 text-indigo-600 dark:text-indigo-400' aria-hidden='true' />
                </div>
                <div>
                  <h3 className='text-xl font-semibold text-gray-900 dark:text-white'>{t(feature.titleKey)}</h3>
                  <p className='mt-2 text-base text-gray-600 dark:text-gray-300'>{t(feature.descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className='mx-auto max-w-7xl px-4 py-20'>
          <h2 className='text-center text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-white'>
            {t('captchaPage.howItWorks.title')}
          </h2>
          <p className='mx-auto mt-4 max-w-2xl text-center text-lg text-gray-600 dark:text-gray-300'>
            {t('captchaPage.howItWorks.desc')}
          </p>

          <div className='mt-16 grid gap-8 md:grid-cols-3'>
            <div className='relative text-center'>
              <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'>
                1
              </div>
              <h3 className='mt-6 text-lg font-semibold text-gray-900 dark:text-white'>
                {t('captchaPage.howItWorks.step1.title')}
              </h3>
              <p className='mt-2 text-base text-gray-600 dark:text-gray-300'>
                {t('captchaPage.howItWorks.step1.desc')}
              </p>
            </div>
            <div className='relative text-center'>
              <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'>
                2
              </div>
              <h3 className='mt-6 text-lg font-semibold text-gray-900 dark:text-white'>
                {t('captchaPage.howItWorks.step2.title')}
              </h3>
              <p className='mt-2 text-base text-gray-600 dark:text-gray-300'>
                {t('captchaPage.howItWorks.step2.desc')}
              </p>
            </div>
            <div className='relative text-center'>
              <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'>
                3
              </div>
              <h3 className='mt-6 text-lg font-semibold text-gray-900 dark:text-white'>
                {t('captchaPage.howItWorks.step3.title')}
              </h3>
              <p className='mt-2 text-base text-gray-600 dark:text-gray-300'>
                {t('captchaPage.howItWorks.step3.desc')}
              </p>
            </div>
          </div>

          <div className='mt-12 text-center'>
            <a
              href={`${DOCS_URL}/captcha/introduction`}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center text-base font-medium text-gray-900 underline decoration-dashed hover:decoration-solid dark:text-gray-300'
            >
              {t('captchaPage.howItWorks.readDocs')}
              <ArrowRightIcon className='ml-2 h-4 w-4' />
            </a>
          </div>
        </div>

        <MarketingPricing />

        <DitchGoogle />
      </main>
    </div>
  )
}

export default Captcha
