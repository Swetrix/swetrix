import {
  ArrowRightIcon,
  BracketsCurlyIcon,
  PuzzlePieceIcon,
  CursorClickIcon,
  EyeSlashIcon,
} from '@phosphor-icons/react'
import _map from 'lodash/map'
import { useEffect, useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { Link } from 'react-router'

import Header from '~/components/Header'
import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import MarketingPricing from '~/components/pricing/MarketingPricing'
import useScript from '~/hooks/useScript'
import { DOCS_URL } from '~/lib/constants'
import { useTheme } from '~/providers/ThemeProvider'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import { Text } from '~/ui/Text'
import Textarea from '~/ui/Textarea'
import { SWETRIX_PID } from '~/utils/analytics'
import routesPath from '~/utils/routes'

declare global {
  interface Window {
    swetrixCaptchaForceLoad?: () => void
  }
}

const features = [
  {
    titleKey: 'captchaPage.features.privacy.title',
    descKey: 'captchaPage.features.privacy.desc',
    icon: EyeSlashIcon,
  },
  {
    titleKey: 'captchaPage.features.opensource.title',
    descKey: 'captchaPage.features.opensource.desc',
    icon: BracketsCurlyIcon,
  },
  {
    titleKey: 'captchaPage.features.customisable.title',
    descKey: 'captchaPage.features.customisable.desc',
    icon: PuzzlePieceIcon,
  },
  {
    titleKey: 'captchaPage.features.easy.title',
    descKey: 'captchaPage.features.easy.desc',
    icon: CursorClickIcon,
  },
]

const Captcha = () => {
  const { t } = useTranslation('common')
  const [demoName, setDemoName] = useState('')
  const [demoMessage, setDemoMessage] = useState('')
  const [demoStatus, setDemoStatus] = useState<'idle' | 'success' | 'error'>(
    'idle',
  )
  const [demoError, setDemoError] = useState('')
  const captchaScriptStatus = useScript(
    'https://cdn.swetrixcaptcha.com/captcha-loader.js',
  )
  const [captchaInitialised, setCaptchaInitialised] = useState(false)
  const { theme } = useTheme()

  useEffect(() => {
    if (captchaScriptStatus !== 'ready' || captchaInitialised) {
      return
    }

    const interval = setInterval(() => {
      if (typeof window === 'undefined' || !window.swetrixCaptchaForceLoad) {
        return
      }

      window.swetrixCaptchaForceLoad()
      setCaptchaInitialised(true)
      clearInterval(interval)
    }, 1000)

    return () => clearInterval(interval)
  }, [captchaScriptStatus, captchaInitialised])

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const captchaInput = document.querySelector(
      'input[name="swetrix-captcha-response"]',
    ) as HTMLInputElement | null
    const token = captchaInput?.value

    if (!token) {
      setDemoStatus('error')
      setDemoError(t('captchaPage.demo.errors.notCompleted'))
      return
    }

    setDemoStatus('success')
    setDemoError('')
    setDemoName('')
    setDemoMessage('')

    if (window.swetrixCaptchaForceLoad) {
      window.swetrixCaptchaForceLoad()
    }

    setTimeout(() => {
      setDemoStatus('idle')
    }, 5000)
  }

  return (
    <div className='overflow-hidden'>
      <main className='bg-gray-50 dark:bg-slate-900'>
        <div className='relative isolate bg-gray-100/80 pt-2 dark:bg-slate-800/50'>
          <div className='relative mx-2 overflow-hidden rounded-4xl'>
            <div
              aria-hidden
              className='pointer-events-none absolute inset-0 -z-10'
            >
              <div className='absolute inset-0 rounded-4xl bg-linear-115 from-indigo-200 from-15% via-purple-400 via-70% to-indigo-700 opacity-50 ring-1 ring-black/5 ring-inset sm:bg-linear-145 dark:from-slate-600 dark:opacity-60' />
            </div>
            <Header transparent />
            <section className='mx-auto max-w-7xl px-4 pt-10 pb-20 sm:px-3 lg:px-6 lg:pt-20 xl:px-8'>
              <div className='z-20 mx-auto flex max-w-4xl flex-col items-center text-center'>
                <Text
                  as='h1'
                  size='4xl'
                  weight='semibold'
                  tracking='tight'
                  className='text-pretty sm:leading-none lg:mt-6 lg:text-6xl xl:text-7xl'
                >
                  <Trans
                    t={t}
                    i18nKey='captchaPage.slogan'
                    components={{
                      span: (
                        <span className='bg-linear-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent dark:from-indigo-400 dark:to-purple-400' />
                      ),
                    }}
                  />
                </Text>
                <Text as='p' size='lg' className='mt-6 max-w-2xl'>
                  {t('captchaPage.description')}
                </Text>
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
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className='mx-auto mt-20 max-w-7xl bg-gray-50 px-4 pb-16 dark:bg-slate-900'>
          <div className='text-center'>
            <Text as='h2' size='3xl' weight='bold' className='sm:text-4xl'>
              {t('captchaPage.whySwetrix')}
            </Text>
            <Text
              as='p'
              size='lg'
              colour='muted'
              className='mx-auto mt-4 max-w-2xl'
            >
              {t('captchaPage.whySwetrixDesc')}
            </Text>
          </div>

          <div className='mt-16 grid gap-8 sm:grid-cols-2 lg:gap-12'>
            {_map(features, (feature) => (
              <div key={feature.titleKey} className='relative flex gap-4'>
                <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/30'>
                  <feature.icon
                    className='h-7 w-7 text-indigo-600 dark:text-indigo-400'
                    aria-hidden='true'
                  />
                </div>
                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    {t(feature.titleKey)}
                  </Text>
                  <Text as='p' size='base' colour='muted' className='mt-2'>
                    {t(feature.descKey)}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className='mx-auto max-w-7xl px-4 py-20'>
          <Text
            as='h2'
            size='3xl'
            weight='bold'
            className='text-center sm:text-4xl'
          >
            {t('captchaPage.howItWorks.title')}
          </Text>
          <Text
            as='p'
            size='lg'
            colour='muted'
            className='mx-auto mt-4 max-w-2xl text-center'
          >
            {t('captchaPage.howItWorks.desc')}
          </Text>

          <div className='mt-16 grid gap-8 md:grid-cols-3'>
            <div className='relative text-center'>
              <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'>
                1
              </div>
              <Text as='h3' size='lg' weight='semibold' className='mt-6'>
                {t('captchaPage.howItWorks.step1.title')}
              </Text>
              <Text as='p' size='base' colour='muted' className='mt-2'>
                {t('captchaPage.howItWorks.step1.desc')}
              </Text>
            </div>
            <div className='relative text-center'>
              <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'>
                2
              </div>
              <Text as='h3' size='lg' weight='semibold' className='mt-6'>
                {t('captchaPage.howItWorks.step2.title')}
              </Text>
              <Text as='p' size='base' colour='muted' className='mt-2'>
                {t('captchaPage.howItWorks.step2.desc')}
              </Text>
            </div>
            <div className='relative text-center'>
              <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'>
                3
              </div>
              <Text as='h3' size='lg' weight='semibold' className='mt-6'>
                {t('captchaPage.howItWorks.step3.title')}
              </Text>
              <Text as='p' size='base' colour='muted' className='mt-2'>
                {t('captchaPage.howItWorks.step3.desc')}
              </Text>
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

        <div className='bg-gray-100 py-20 dark:bg-slate-800/50'>
          <div className='mx-auto max-w-7xl px-4'>
            <div className='grid gap-12 lg:grid-cols-2 lg:gap-16'>
              <div className='flex flex-col justify-center'>
                <Text
                  as='p'
                  size='sm'
                  weight='semibold'
                  tracking='wide'
                  className='text-indigo-600 uppercase dark:text-indigo-400'
                >
                  {t('captchaPage.demo.tagline')}
                </Text>
                <Text
                  as='h2'
                  size='3xl'
                  weight='bold'
                  className='mt-2 sm:text-4xl'
                >
                  {t('captchaPage.demo.title')}
                </Text>
                <Text as='p' size='lg' colour='muted' className='mt-4'>
                  {t('captchaPage.demo.description')}
                </Text>
                <Text as='p' size='lg' colour='muted' className='mt-4'>
                  {t('captchaPage.demo.description2')}
                </Text>
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
                  <Link
                    to='/captcha/demo'
                    className='flex h-12 items-center justify-center rounded-md border-2 border-slate-900 bg-transparent px-6 text-slate-900 transition-all hover:bg-slate-900 hover:text-white dark:border-slate-50 dark:text-slate-50 dark:hover:bg-gray-50 dark:hover:text-slate-900'
                  >
                    <span className='text-center text-base font-semibold'>
                      {t('captchaPage.demo.seeDevDemo')}
                    </span>
                  </Link>
                </div>
              </div>

              <div className='overflow-hidden rounded-lg border border-gray-200 bg-white px-4 pt-5 pb-4 dark:border-slate-800/60 dark:bg-slate-800/25'>
                <Text as='h3' size='2xl' weight='bold'>
                  {t('captchaPage.demo.formTitle')}
                </Text>
                <Text as='p' colour='muted' className='mt-2'>
                  {t('captchaPage.demo.formSubtitle')}
                </Text>

                {demoStatus === 'success' ? (
                  <div className='mt-4 rounded-md bg-emerald-50 p-3 dark:bg-emerald-900/20'>
                    <Text as='p' size='sm' weight='medium' colour='success'>
                      {t('captchaPage.demo.success')}
                    </Text>
                  </div>
                ) : null}

                {demoStatus === 'error' && demoError ? (
                  <div className='mt-4 rounded-md bg-red-50 p-3 dark:bg-red-900/20'>
                    <Text as='p' size='sm' weight='medium' colour='error'>
                      {demoError}
                    </Text>
                  </div>
                ) : null}

                <form onSubmit={handleDemoSubmit} className='mt-6 space-y-5'>
                  <Input
                    label={
                      <>
                        {t('captchaPage.demo.nameLabel')}{' '}
                        <span className='text-red-500'>*</span>
                      </>
                    }
                    value={demoName}
                    onChange={(e) => setDemoName(e.target.value)}
                    placeholder={t('captchaPage.demo.namePlaceholder')}
                    required
                  />

                  <Textarea
                    label={t('captchaPage.demo.messageLabel')}
                    value={demoMessage}
                    onChange={(e) => setDemoMessage(e.target.value)}
                    placeholder={t('captchaPage.demo.messagePlaceholder')}
                    rows={3}
                  />

                  <div
                    className='swecaptcha'
                    data-project-id={SWETRIX_PID}
                    data-theme={theme}
                  />
                  {captchaScriptStatus === 'error' ? (
                    <Text as='div' size='sm' colour='error'>
                      Failed to load CAPTCHA. Please refresh the page.
                    </Text>
                  ) : null}

                  <Button
                    type='submit'
                    primary
                    giant
                    className='w-full justify-center'
                  >
                    {t('captchaPage.demo.submit')}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <MarketingPricing />

        <DitchGoogle />
      </main>
    </div>
  )
}

export default Captcha
