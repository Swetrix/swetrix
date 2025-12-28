import { ArrowRightIcon } from '@heroicons/react/20/solid'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import useScript from '~/hooks/useScript'
import { API_URL, DOCS_URL } from '~/lib/constants'
import Button from '~/ui/Button'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'

declare global {
  interface Window {
    swetrixCaptchaForceLoad?: () => void
  }
}

interface CaptchaConfig {
  theme: 'auto' | 'light' | 'dark'
  projectId: string
  dummySecret: string
}

const PROJECT_OPTIONS = [
  { value: 'PmahJ6HRJNLQ', label: 'captchaPage.demoPage.modeReal' },
  { value: 'AP00000000000', label: 'captchaPage.demoPage.modeAlwaysPass' },
  { value: 'FAIL000000000', label: 'captchaPage.demoPage.modeAlwaysFail' },
]

const TOKEN_OPTIONS = [
  { value: 'PASS000000000000000000', label: 'captchaPage.demoPage.tokenAlwaysPass' },
  { value: 'FAIL000000000000000000', label: 'captchaPage.demoPage.tokenAlwaysFail' },
  { value: 'USED000000000000000000', label: 'captchaPage.demoPage.tokenAlreadyUsed' },
]

const THEME_OPTIONS = [
  { value: 'auto', label: 'captchaPage.demoPage.themeAuto' },
  { value: 'light', label: 'captchaPage.demoPage.themeLight' },
  { value: 'dark', label: 'captchaPage.demoPage.themeDark' },
]

const CaptchaDemo = () => {
  const { t } = useTranslation('common')
  const [config, setConfig] = useState<CaptchaConfig>({
    theme: 'auto',
    projectId: 'PmahJ6HRJNLQ',
    dummySecret: 'PASS000000000000000000',
  })
  const [validationResult, setValidationResult] = useState<string | null>(null)
  const [captchaInitialised, setCaptchaInitialised] = useState(false)
  const captchaScriptStatus = useScript('https://cdn.swetrixcaptcha.com/captcha-loader.js')

  // Initialise captcha when script is loaded
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

  // Regenerate captcha when config changes (except dummySecret)
  useEffect(() => {
    if (!captchaInitialised) {
      return
    }

    if (window.swetrixCaptchaForceLoad) {
      // Small delay to ensure DOM is updated
      const timer = setTimeout(() => {
        window.swetrixCaptchaForceLoad?.()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [config.theme, config.projectId, captchaInitialised])

  const updateConfig = useCallback((key: keyof CaptchaConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleValidateToken = async () => {
    try {
      const response = await fetch(`${API_URL}v1/captcha/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: 'NOT_A_REAL_TOKEN',
          secret: config.dummySecret,
        }),
      })

      const data = await response.json()
      setValidationResult(JSON.stringify(data, null, 2))
    } catch {
      setValidationResult(JSON.stringify({ error: 'Failed to validate token' }, null, 2))
    }
  }

  const findSelectedOption = <T extends { value: string }>(options: T[], value: string) => {
    return options.find((opt) => opt.value === value) || options[0]
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-slate-900'>
      <main className='mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8'>
        {/* Header Section */}
        <div className='mb-8 md:mb-12'>
          <Text as='h1' size='3xl' weight='bold' tracking='tight' className='md:text-4xl lg:text-5xl'>
            {t('captchaPage.demoPage.title')}
          </Text>
          <Text as='p' size='lg' colour='muted' className='mt-2'>
            {t('captchaPage.demoPage.subtitle')}
          </Text>
        </div>

        {/* CAPTCHA Widget Section */}
        <section className='mb-12'>
          <Text as='h2' size='2xl' weight='bold' className='mb-4 md:text-3xl'>
            {t('captchaPage.demoPage.captchaWidget')}
          </Text>
          <div
            className='rounded-lg border border-gray-200 bg-white p-6 dark:border-slate-800/60 dark:bg-slate-800/25'
            key={`${config.theme}-${config.projectId}`}
          >
            <div className='swecaptcha' data-project-id={config.projectId} data-theme={config.theme} />
            {captchaScriptStatus === 'error' ? (
              <Text as='div' size='sm' colour='error'>
                Failed to load CAPTCHA. Please refresh the page.
              </Text>
            ) : null}
          </div>
        </section>

        {/* Configuration Section */}
        <section className='mb-12'>
          <Text as='h2' size='2xl' weight='bold' className='mb-4 md:text-3xl'>
            {t('captchaPage.demoPage.configuration')}
          </Text>
          <div className='grid gap-6 rounded-lg border border-gray-200 bg-white p-6 sm:grid-cols-2 dark:border-slate-800/60 dark:bg-slate-800/25'>
            <div>
              <Select
                label={t('captchaPage.demoPage.theme')}
                items={THEME_OPTIONS.map((opt) => ({ ...opt, label: t(opt.label) }))}
                labelExtractor={(item) => item.label}
                keyExtractor={(item) => item.value}
                onSelect={(item) => updateConfig('theme', item.value)}
                title={t(findSelectedOption(THEME_OPTIONS, config.theme).label)}
                selectedItem={THEME_OPTIONS.map((opt) => ({ ...opt, label: t(opt.label) })).find(
                  (opt) => opt.value === config.theme,
                )}
              />
            </div>
            <div>
              <Select
                label={t('captchaPage.demoPage.mode')}
                items={PROJECT_OPTIONS.map((opt) => ({ ...opt, label: t(opt.label) }))}
                labelExtractor={(item) => item.label}
                keyExtractor={(item) => item.value}
                onSelect={(item) => updateConfig('projectId', item.value)}
                title={t(findSelectedOption(PROJECT_OPTIONS, config.projectId).label)}
                selectedItem={PROJECT_OPTIONS.map((opt) => ({ ...opt, label: t(opt.label) })).find(
                  (opt) => opt.value === config.projectId,
                )}
              />
            </div>
          </div>
        </section>

        {/* Server-side Validation Section */}
        <section className='mb-12'>
          <Text as='h2' size='2xl' weight='bold' className='mb-4 md:text-3xl'>
            {t('captchaPage.demoPage.serverValidation')}
          </Text>
          <div className='rounded-lg border border-gray-200 bg-white p-6 dark:border-slate-800/60 dark:bg-slate-800/25'>
            <div className='flex flex-col gap-4 sm:flex-row sm:items-end'>
              <div className='flex-1'>
                <Select
                  label={t('captchaPage.demoPage.tokenType')}
                  items={TOKEN_OPTIONS.map((opt) => ({ ...opt, label: t(opt.label) }))}
                  labelExtractor={(item) => item.label}
                  keyExtractor={(item) => item.value}
                  onSelect={(item) => updateConfig('dummySecret', item.value)}
                  title={t(findSelectedOption(TOKEN_OPTIONS, config.dummySecret).label)}
                  selectedItem={TOKEN_OPTIONS.map((opt) => ({ ...opt, label: t(opt.label) })).find(
                    (opt) => opt.value === config.dummySecret,
                  )}
                />
              </div>
              <Button type='button' primary regular onClick={handleValidateToken}>
                {t('captchaPage.demoPage.validateButton')}
              </Button>
            </div>

            {validationResult ? (
              <div className='mt-4'>
                <pre className='overflow-x-auto rounded-md bg-gray-100 p-4 text-sm text-gray-800 dark:bg-slate-900 dark:text-gray-200'>
                  {validationResult}
                </pre>
              </div>
            ) : null}
          </div>
        </section>

        {/* Documentation Link */}
        <div className='text-center'>
          <a
            href={`${DOCS_URL}/captcha/introduction`}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center text-base font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300'
          >
            {t('captchaPage.demoPage.learnMore')}
            <ArrowRightIcon className='ml-2 h-4 w-4' />
          </a>
        </div>
      </main>
    </div>
  )
}

export default CaptchaDemo
