import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import _map from 'lodash/map'
import {
  BugIcon,
  CodeIcon,
  CheckCircleIcon,
  UserIcon,
  CursorClickIcon,
  FileTextIcon,
  ClockIcon,
  FolderPlusIcon,
} from '@phosphor-icons/react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useNavigate, useFetcher, useLoaderData } from 'react-router'
import { toast } from 'sonner'

import { useAuthProxy } from '~/hooks/useAuthProxy'
import {
  BROWSER_LOGO_MAP,
  CONFIRMATION_TIMEOUT,
  DOCS_URL,
  INTEGRATIONS_URL,
  isSelfhosted,
  whitelist,
  languages,
  languageFlag,
  OS_LOGO_MAP,
  OS_LOGO_MAP_DARK,
} from '~/lib/constants'
import { getCookie, setCookie } from '~/utils/cookie'
import { changeLanguage } from '~/i18n'
import { getSnippet } from '~/modals/TrackingSnippet'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
import type {
  OnboardingActionData,
  OnboardingLoaderData,
} from '~/routes/onboarding'
import { Badge } from '~/ui/Badge'
import Button from '~/ui/Button'
import Flag from '~/ui/Flag'
import PulsatingCircle from '~/ui/icons/PulsatingCircle'
import Input from '~/ui/Input'
import Loader from '~/ui/Loader'
import Alert from '~/ui/Alert'
import { Text } from '~/ui/Text'
import Textarea from '~/ui/Textarea'
import { trackCustom } from '~/utils/analytics'
import { cn } from '~/utils/generic'
import routes from '~/utils/routes'

const MAX_PROJECT_NAME_LENGTH = 50
const ANIMATION_DURATION = 0.4
const EXIT_DURATION = 0.15
const EASE_OUT_QUART = [0.25, 1, 0.5, 1] as const

interface Project {
  id: string
  name: string
}

type OnboardingStep =
  | 'language'
  | 'welcome'
  | 'feature_traffic'
  | 'feature_errors'
  | 'feature_sessions'
  | 'create_project'
  | 'setup_tracking'
  | 'verify_email'

const getSteps = (): OnboardingStep[] => {
  const baseSteps: OnboardingStep[] = [
    'language',
    'welcome',
    'feature_traffic',
    'feature_errors',
    'feature_sessions',
    'create_project',
    'setup_tracking',
  ]

  if (!isSelfhosted) {
    baseSteps.push('verify_email')
  }

  return baseSteps
}

const STEPS = getSteps()

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
    z: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    z: 0,
    transition: {
      duration: ANIMATION_DURATION,
      ease: EASE_OUT_QUART,
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 40 : -40,
    opacity: 0,
    z: 0,
    transition: {
      duration: EXIT_DURATION,
      ease: EASE_OUT_QUART,
    },
  }),
}

const reducedMotionVariants = {
  enter: { opacity: 0 },
  center: {
    opacity: 1,
    transition: { duration: 0.1 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.05 },
  },
}

const ProgressBar = ({
  currentStep,
  totalSteps,
}: {
  currentStep: number
  totalSteps: number
}) => {
  const progress = ((currentStep + 1) / totalSteps) * 100

  return (
    <div className='h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700/50'>
      <motion.div
        className='h-full rounded-full bg-blue-400 dark:bg-blue-600/60'
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{
          duration: ANIMATION_DURATION,
          ease: EASE_OUT_QUART,
        }}
      />
    </div>
  )
}

const IconNode = ({
  children,
  label,
  className,
}: {
  children: React.ReactNode
  label: string
  className?: string
}) => (
  <div className={cn('flex flex-col items-center gap-2', className)}>
    <div className='flex size-14 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-slate-800 dark:ring-slate-700'>
      {children}
    </div>
    <Text as='span' size='sm' weight='medium' colour='secondary'>
      {label}
    </Text>
  </div>
)

const FeatureVisualization = ({
  type,
  deviceInfo,
  country,
}: {
  type: 'traffic' | 'errors' | 'sessions'
  deviceInfo?: { browser: string | null; os: string | null }
  country?: string | null
}) => {
  const { theme } = useTheme()

  const browserLogo =
    BROWSER_LOGO_MAP[
      (deviceInfo?.browser as keyof typeof BROWSER_LOGO_MAP) || 'Chrome'
    ] || BROWSER_LOGO_MAP.Chrome

  const osKey = (deviceInfo?.os || 'Windows') as keyof typeof OS_LOGO_MAP
  const osLogoLight = OS_LOGO_MAP[osKey] || OS_LOGO_MAP.Windows
  const osLogoDark =
    OS_LOGO_MAP_DARK[osKey as keyof typeof OS_LOGO_MAP_DARK] || osLogoLight
  const osLogo = theme === 'dark' ? osLogoDark : osLogoLight

  if (type === 'traffic') {
    return (
      <div className='relative mt-12 w-full max-w-md'>
        <svg
          className='absolute inset-0 size-full'
          viewBox='0 0 400 260'
          fill='none'
          preserveAspectRatio='xMidYMid meet'
        >
          <line
            x1='200'
            y1='115'
            x2='70'
            y2='28'
            className='stroke-gray-200 dark:stroke-slate-700'
            strokeWidth='1.5'
          />
          <line
            x1='200'
            y1='115'
            x2='330'
            y2='28'
            className='stroke-gray-200 dark:stroke-slate-700'
            strokeWidth='1.5'
          />
          <line
            x1='200'
            y1='115'
            x2='70'
            y2='205'
            className='stroke-gray-200 dark:stroke-slate-700'
            strokeWidth='1.5'
          />
        </svg>

        <div className='relative grid grid-cols-3 gap-4'>
          <div className='flex justify-center pt-0'>
            <IconNode label={country || 'US'}>
              <Flag country={country || 'US'} size={28} />
            </IconNode>
          </div>
          <div />
          <div className='flex justify-center pt-0'>
            <IconNode label={deviceInfo?.browser || 'Chrome'}>
              <img src={browserLogo} alt='Browser' className='size-7' />
            </IconNode>
          </div>
        </div>

        <div className='relative mt-4 flex justify-center'>
          <IconNode label='Visitor'>
            <UserIcon
              className='size-8 text-indigo-600 dark:text-indigo-200'
              weight='duotone'
            />
          </IconNode>
        </div>

        <div className='relative mt-4 grid grid-cols-3 gap-4'>
          <div className='flex justify-center'>
            <IconNode label={deviceInfo?.os || 'Windows'}>
              <img src={osLogo} alt='OS' className='size-7' />
            </IconNode>
          </div>
          <div />
          <div />
        </div>
      </div>
    )
  }

  if (type === 'errors') {
    return (
      <div className='mt-12 ml-8 w-full max-w-sm'>
        <div className='flex flex-col gap-6'>
          <div className='flex size-20 items-center justify-center rounded-2xl bg-rose-50 ring-1 ring-rose-200 ring-inset dark:bg-rose-900/20 dark:ring-rose-800'>
            <BugIcon
              className='size-10 text-rose-500 dark:text-rose-400'
              weight='duotone'
            />
          </div>

          <div className='w-full space-y-2'>
            <div className='flex items-center gap-3 rounded-lg bg-gray-50 p-4 ring-1 ring-gray-100 dark:bg-slate-900 dark:ring-slate-800'>
              <div className='size-2 shrink-0 rounded-full bg-rose-500' />
              <div className='flex-1'>
                <div className='h-2.5 w-24 rounded bg-gray-200 dark:bg-slate-800' />
              </div>
              <div className='h-2 w-8 rounded bg-gray-200 dark:bg-slate-800' />
            </div>

            <div className='flex items-center gap-3 rounded-lg bg-gray-50 p-4 ring-1 ring-gray-100 dark:bg-slate-900 dark:ring-slate-800'>
              <div className='size-2 shrink-0 rounded-full bg-amber-500' />
              <div className='flex-1'>
                <div className='h-2.5 w-32 rounded bg-gray-200 dark:bg-slate-800' />
              </div>
              <div className='h-2 w-6 rounded bg-gray-200 dark:bg-slate-800' />
            </div>

            <div className='flex items-center gap-3 rounded-lg bg-gray-50 p-4 ring-1 ring-gray-100 dark:bg-slate-900 dark:ring-slate-800'>
              <div className='size-2 shrink-0 rounded-full bg-rose-500' />
              <div className='flex-1'>
                <div className='h-2.5 w-20 rounded bg-gray-200 dark:bg-slate-800' />
              </div>
              <div className='h-2 w-10 rounded bg-gray-200 dark:bg-slate-800' />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='mt-12 ml-8 w-full max-w-md'>
      <div className='relative'>
        <div className='absolute top-2.5 bottom-2.5 left-2.5 w-px bg-gray-200 dark:bg-slate-700' />

        <div className='space-y-4'>
          <div className='flex items-center gap-4'>
            <CursorClickIcon
              className='relative z-10 size-5 shrink-0 bg-white text-amber-500 dark:bg-slate-900'
              weight='duotone'
            />
            <div className='min-w-0 flex-1'>
              <div className='flex items-baseline gap-2'>
                <Text as='span' size='sm' weight='medium' colour='muted'>
                  Event
                </Text>
                <Text as='span' size='sm' weight='semibold'>
                  SIGNUP_CLICK
                </Text>
              </div>
              <div className='mt-0.5 flex items-center gap-1.5'>
                <ClockIcon className='size-3.5 text-gray-400 dark:text-slate-500' />
                <Text as='span' size='xs' colour='muted'>
                  1s
                </Text>
              </div>
            </div>
          </div>

          <div className='flex items-center gap-4'>
            <FileTextIcon
              className='relative z-10 size-5 shrink-0 bg-white text-sky-500 dark:bg-slate-900'
              weight='duotone'
            />
            <div className='min-w-0 flex-1'>
              <div className='flex items-baseline gap-2'>
                <Text as='span' size='sm' weight='medium' colour='muted'>
                  Pageview
                </Text>
                <Text as='span' size='sm' weight='semibold'>
                  /pricing
                </Text>
              </div>
              <div className='mt-0.5 flex items-center gap-1.5'>
                <ClockIcon className='size-3.5 text-gray-400 dark:text-slate-500' />
                <Text as='span' size='xs' colour='muted'>
                  12s
                </Text>
              </div>
            </div>
          </div>

          <div className='flex items-center gap-4'>
            <FileTextIcon
              className='relative z-10 size-5 shrink-0 bg-white text-emerald-500 dark:bg-slate-900'
              weight='duotone'
            />
            <div className='min-w-0 flex-1'>
              <div className='flex items-baseline gap-2'>
                <Text as='span' size='sm' weight='medium' colour='muted'>
                  Pageview
                </Text>
                <Text as='span' size='sm' weight='semibold'>
                  /checkout
                </Text>
              </div>
              <div className='mt-0.5 flex items-center gap-1.5'>
                <ClockIcon className='size-3.5 text-gray-400 dark:text-slate-500' />
                <Text as='span' size='xs' colour='muted'>
                  5s
                </Text>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const ProjectVisualisation = () => {
  return (
    <div className='mb-8 w-full rounded-xl p-6 ring-1 ring-gray-200 dark:ring-slate-800'>
      <div className='flex items-start gap-5'>
        <div className='flex size-20 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800'>
          <FolderPlusIcon
            className='size-10 text-indigo-500'
            weight='duotone'
          />
        </div>
        <div className='min-w-0 flex-1 space-y-2 pt-1'>
          <div className='h-5 w-48 rounded bg-gray-200 dark:bg-slate-800' />
          <div className='h-3 w-full rounded bg-gray-100 dark:bg-slate-800/50' />
          <div className='h-3 w-3/4 rounded bg-gray-100 dark:bg-slate-800/50' />
        </div>
      </div>
    </div>
  )
}

const Onboarding = () => {
  const { t, i18n } = useTranslation('common')
  const { theme } = useTheme()
  const prefersReducedMotion = useReducedMotion()
  const {
    project: loaderProject,
    deviceInfo,
    metainfo,
    onboardingStep: loaderStep,
  } = useLoaderData<OnboardingLoaderData>()
  const { user, loadUser, logout } = useAuth()
  const { authMe } = useAuthProxy()
  const navigate = useNavigate()
  const fetcher = useFetcher<OnboardingActionData>()
  const stepFetcher = useFetcher()
  const lastHandledFetcherDataRef = useRef<OnboardingActionData | null>(null)

  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    if (!loaderStep) return 0
    if (loaderStep === 'waiting_for_events') {
      return STEPS.indexOf('setup_tracking')
    }
    const index = STEPS.indexOf(loaderStep as OnboardingStep)
    return index !== -1 ? index : 0
  })
  const [direction, setDirection] = useState(0)
  const [projectName, setProjectName] = useState('')
  const [project, setProject] = useState<Project | null>(loaderProject)
  const [isWaitingForEvents, setIsWaitingForEvents] = useState(
    () => loaderStep === 'waiting_for_events',
  )
  const [hasEvents, setHasEvents] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language)

  const [newProjectErrors, setNewProjectErrors] = useState<{
    name?: string
  }>({})
  const [isCheckingVerification, setIsCheckingVerification] = useState(false)
  const [hasResentEmail, setHasResentEmail] = useState(
    () => !!getCookie(CONFIRMATION_TIMEOUT),
  )

  const currentStep = STEPS[currentStepIndex]
  const isLoading =
    fetcher.state === 'submitting' || fetcher.state === 'loading'

  const stepsForProgress = STEPS

  const totalSteps = stepsForProgress.length
  const progressStepIndex = stepsForProgress.indexOf(currentStep)

  useEffect(() => {
    if (!fetcher.data) return
    if (lastHandledFetcherDataRef.current === fetcher.data) return
    lastHandledFetcherDataRef.current = fetcher.data

    if (fetcher.data?.success) {
      const { intent, project: newProject } = fetcher.data

      if (intent === 'create-project' && newProject) {
        setTimeout(() => setProject(newProject), 0)
        goToStep('setup_tracking', { persist: true })
      } else if (intent === 'update-step') {
        loadUser()
      } else if (intent === 'complete-onboarding') {
        loadUser()
        navigate(routes.dashboard)
      } else if (intent === 'delete-account') {
        logout()
        navigate(routes.main)
      } else if (intent === 'confirm-email') {
        setCookie(CONFIRMATION_TIMEOUT, true, 600)
        setHasResentEmail(true)
        toast.success(t('profileSettings.confSent'))
      }
    } else if (fetcher.data?.error) {
      toast.error(fetcher.data.error)
    } else if (fetcher.data?.fieldErrors?.name) {
      setTimeout(
        () => setNewProjectErrors({ name: fetcher.data!.fieldErrors!.name }),
        0,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.data, fetcher.submit, loadUser, logout, navigate])

  useEffect(() => {
    if (!isWaitingForEvents || !project) return

    const checkForEvents = async () => {
      try {
        const { totalMonthlyEvents } = await authMe()
        if (totalMonthlyEvents > 0) {
          setHasEvents(true)
          setIsWaitingForEvents(false)
        }
      } catch {
        // Silently handle error - will retry on next interval
      }
    }

    const interval = setInterval(checkForEvents, 3000)
    return () => clearInterval(interval)
  }, [isWaitingForEvents, project, authMe])

  const persistStep = useCallback(
    (step: OnboardingStep) => {
      const formData = new FormData()
      formData.set('intent', 'update-step')
      formData.set('step', step)
      stepFetcher.submit(formData, { method: 'post' })
    },
    [stepFetcher],
  )

  const goToStep = useCallback(
    (step: OnboardingStep, { persist = false } = {}) => {
      const newIndex = STEPS.indexOf(step)
      setDirection(newIndex > currentStepIndex ? 1 : -1)
      setCurrentStepIndex(newIndex)
      if (persist) {
        persistStep(step)
      }
    },
    [currentStepIndex, persistStep],
  )

  const goNext = useCallback(() => {
    if (currentStepIndex < STEPS.length - 1) {
      const nextStep = STEPS[currentStepIndex + 1]
      setDirection(1)
      setCurrentStepIndex((prev) => prev + 1)
      persistStep(nextStep)
    }
  }, [currentStepIndex, persistStep])

  const goBack = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevStep = STEPS[currentStepIndex - 1]
      setDirection(-1)
      setCurrentStepIndex((prev) => prev - 1)
      persistStep(prevStep)
    }
  }, [currentStepIndex, persistStep])

  const handleLanguageSelect = (lng: string) => {
    setSelectedLanguage(lng)
  }

  const handleLanguageConfirm = async () => {
    if (selectedLanguage !== i18n.language) {
      const nextStep = STEPS[currentStepIndex + 1]
      if (nextStep) {
        const formData = new FormData()
        formData.set('intent', 'update-step')
        formData.set('step', nextStep)
        try {
          await fetch(routes.onboarding, {
            method: 'post',
            body: formData,
            credentials: 'same-origin',
          })
        } catch {
          // Best effort: continue with language change even if this fails.
        }
      }
      changeLanguage(selectedLanguage)
    } else {
      goNext()
    }
  }

  const handleCreateProject = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault()
    e?.stopPropagation()

    if (fetcher.state !== 'idle') return

    const trimmedName = projectName.trim()

    if (!trimmedName) {
      setNewProjectErrors({ name: t('project.settings.noNameError') })
      return
    }

    if (trimmedName.length > MAX_PROJECT_NAME_LENGTH) {
      setNewProjectErrors({
        name: t('project.settings.pxCharsError', {
          amount: MAX_PROJECT_NAME_LENGTH,
        }),
      })
      return
    }

    setNewProjectErrors({})
    const formData = new FormData()
    formData.set('intent', 'create-project')
    formData.set('name', trimmedName)
    fetcher.submit(formData, { method: 'post' })
  }

  const handleCompleteOnboarding = (skipped: boolean) => {
    if (fetcher.state !== 'idle') return

    trackCustom('ONBOARDING_COMPLETED', { skipped })

    const formData = new FormData()
    formData.set('intent', 'complete-onboarding')
    fetcher.submit(formData, { method: 'post' })
  }

  const handleDeleteAccount = () => {
    if (fetcher.state !== 'idle') return

    const formData = new FormData()
    formData.set('intent', 'delete-account')
    fetcher.submit(formData, { method: 'post' })
  }

  const handleResendEmail = () => {
    if (getCookie(CONFIRMATION_TIMEOUT)) {
      toast.error(t('profileSettings.confTimeout'))
      return
    }

    const formData = new FormData()
    formData.set('intent', 'confirm-email')
    fetcher.submit(formData, { method: 'post' })
  }

  if (!user) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-950'>
        <Loader />
      </div>
    )
  }

  return (
    <div className='flex h-screen flex-col overflow-hidden bg-gray-50 p-2 sm:p-2.5 dark:bg-slate-950'>
      <div className='flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-gray-50 ring-1 ring-black/5 dark:bg-slate-950 dark:ring-white/10'>
        <div className='flex h-full max-h-[min(92%,50rem)] min-h-0 w-full max-w-3xl flex-col'>
          <div className='relative mx-auto min-h-0 w-full max-w-5xl flex-1 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 dark:bg-slate-800/25 dark:ring-white/10'>
            <div className='flex h-full min-h-0 flex-col'>
              <div className='shrink-0 px-6 pt-5 md:px-10'>
                <ProgressBar
                  currentStep={progressStepIndex}
                  totalSteps={totalSteps}
                />
              </div>
              <div className='relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto scroll-smooth'>
                <AnimatePresence mode='wait' custom={direction} initial={false}>
                  <motion.div
                    key={currentStep}
                    custom={direction}
                    variants={
                      prefersReducedMotion
                        ? reducedMotionVariants
                        : slideVariants
                    }
                    initial='enter'
                    animate='center'
                    exit='exit'
                    className='px-6 py-6 md:px-10'
                    style={{
                      backfaceVisibility: 'hidden',
                      willChange: 'transform, opacity',
                    }}
                  >
                    {currentStep === 'language' && (
                      <div>
                        <Text
                          as='h1'
                          size='3xl'
                          weight='bold'
                          tracking='tight'
                          className='mb-2'
                        >
                          {t('onboarding.selectLanguage.title')}
                        </Text>
                        <Text as='p' colour='secondary' className='mb-8'>
                          {t('onboarding.selectLanguage.subtitle')}
                        </Text>

                        <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                          {_map(whitelist, (lng) => {
                            const isSelected = selectedLanguage === lng

                            return (
                              <button
                                key={lng}
                                type='button'
                                onClick={() => handleLanguageSelect(lng)}
                                className={cn(
                                  'flex flex-col items-center justify-center rounded-xl px-4 py-5 ring-1 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800',
                                  isSelected
                                    ? 'bg-indigo-50 ring-2 ring-indigo-500 dark:bg-slate-800 dark:ring-slate-200'
                                    : 'ring-gray-200 hover:bg-gray-50 hover:ring-gray-300 dark:ring-slate-700 dark:hover:bg-slate-700/50 dark:hover:ring-slate-600',
                                )}
                              >
                                <Flag
                                  country={languageFlag[lng]}
                                  size={32}
                                  alt={languages[lng]}
                                  className='mb-3'
                                />
                                <Text
                                  as='span'
                                  size='sm'
                                  weight={isSelected ? 'semibold' : 'medium'}
                                  colour='inherit'
                                  className={cn(
                                    isSelected
                                      ? 'text-indigo-700 dark:text-gray-50'
                                      : 'text-gray-900 dark:text-gray-100',
                                  )}
                                >
                                  {languages[lng]}
                                </Text>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {currentStep === 'welcome' && (
                      <div>
                        <Text
                          as='h1'
                          size='3xl'
                          weight='bold'
                          tracking='tight'
                          className='mb-2'
                        >
                          {t('onboarding.welcomeScreen.title')}
                        </Text>
                        <Text as='p' colour='secondary' className='mb-8'>
                          {t('onboarding.welcomeScreen.subtitle')}
                        </Text>

                        <div className='rounded-2xl border border-gray-200 bg-slate-50 shadow-xs dark:border-slate-700/70 dark:bg-slate-900/80'>
                          <div className='relative overflow-hidden rounded-2xl'>
                            <div className='p-3'>
                              <div className='rounded-2xl bg-white shadow-[0_24px_60px_rgba(15,23,42,0.12)] dark:bg-slate-800 dark:shadow-[0_24px_60px_rgba(0,0,0,0.45)] dark:ring-white/10'>
                                <div className='overflow-hidden rounded-xl'>
                                  <img
                                    src={
                                      theme === 'dark'
                                        ? '/assets/screenshot_dark.png'
                                        : '/assets/screenshot_light.png'
                                    }
                                    alt='Swetrix Dashboard'
                                    className='w-full'
                                  />
                                </div>
                              </div>
                            </div>
                            <div className='pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-white via-white/95 to-transparent dark:from-slate-900 dark:via-slate-900/95' />
                            <div className='absolute inset-x-0 bottom-0 px-6 pt-4 pb-8 text-center'>
                              <Text
                                as='h3'
                                size='2xl'
                                weight='bold'
                                tracking='tight'
                              >
                                {t('onboarding.welcomeScreen.featureTitle')}
                              </Text>
                              <Text
                                as='p'
                                size='sm'
                                colour='secondary'
                                className='mx-auto mt-2 max-w-md'
                              >
                                {t('onboarding.welcomeScreen.featureDesc')}
                              </Text>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentStep === 'feature_traffic' && (
                      <div>
                        <Text
                          as='h1'
                          size='3xl'
                          weight='bold'
                          tracking='tight'
                          className='mb-2'
                        >
                          {t('onboarding.features.traffic.title')}
                        </Text>
                        <Text as='p' colour='secondary'>
                          {t('onboarding.features.traffic.desc')}
                        </Text>

                        <Alert variant='info' className='mt-4'>
                          {t('onboarding.features.traffic.tip')}
                        </Alert>

                        <FeatureVisualization
                          type='traffic'
                          deviceInfo={deviceInfo}
                          country={metainfo.country}
                        />
                      </div>
                    )}

                    {currentStep === 'feature_errors' && (
                      <div>
                        <Text
                          as='h1'
                          size='3xl'
                          weight='bold'
                          tracking='tight'
                          className='mb-2'
                        >
                          {t('onboarding.features.errors.title')}
                        </Text>
                        <Text as='p' colour='secondary'>
                          {t('onboarding.features.errors.desc')}
                        </Text>

                        <Alert variant='info' className='mt-4'>
                          {t('onboarding.features.errors.tip')}
                        </Alert>

                        <FeatureVisualization type='errors' />
                      </div>
                    )}

                    {currentStep === 'feature_sessions' && (
                      <div>
                        <Text
                          as='h1'
                          size='3xl'
                          weight='bold'
                          tracking='tight'
                          className='mb-2'
                        >
                          {t('onboarding.features.sessions.title')}
                        </Text>
                        <Text as='p' colour='secondary'>
                          {t('onboarding.features.sessions.desc')}
                        </Text>

                        <Alert variant='info' className='mt-4'>
                          {t('onboarding.features.sessions.tip')}
                        </Alert>

                        <FeatureVisualization type='sessions' />
                      </div>
                    )}

                    {currentStep === 'create_project' && (
                      <form onSubmit={handleCreateProject}>
                        <Text
                          as='h1'
                          size='3xl'
                          weight='bold'
                          tracking='tight'
                          className='mb-2'
                        >
                          {t('onboarding.createProject.title')}
                        </Text>
                        <Text as='p' colour='secondary' className='mb-8'>
                          {t('onboarding.createProject.desc')}
                        </Text>

                        <ProjectVisualisation />

                        <div className='w-full sm:max-w-1/2'>
                          <Input
                            label={t('project.settings.name')}
                            placeholder={t(
                              'onboarding.createProject.placeholder',
                            )}
                            maxLength={MAX_PROJECT_NAME_LENGTH}
                            value={projectName}
                            onChange={(e) => {
                              setProjectName(e.target.value)
                              setNewProjectErrors({})
                            }}
                            error={newProjectErrors.name}
                          />
                        </div>
                      </form>
                    )}

                    {currentStep === 'setup_tracking' && project && (
                      <div>
                        <Text
                          as='h1'
                          size='3xl'
                          weight='bold'
                          tracking='tight'
                          className='mb-2'
                        >
                          {t('onboarding.installTracking.title')}
                        </Text>
                        <Text as='p' colour='secondary' className='mb-6'>
                          <Trans
                            t={t}
                            i18nKey='onboarding.installTracking.desc'
                            components={{
                              url: (
                                <a
                                  href={INTEGRATIONS_URL}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                                />
                              ),
                            }}
                          />
                        </Text>

                        <div className='rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-slate-700 dark:bg-slate-900'>
                          <div className='mb-4 flex items-center gap-3'>
                            <div className='flex size-10 items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700'>
                              <CodeIcon className='size-5 text-gray-700 dark:text-gray-200' />
                            </div>
                            <div>
                              <Text as='h3' size='sm' weight='semibold'>
                                {t(
                                  'onboarding.installTracking.websiteInstallation',
                                )}
                              </Text>
                              <Text as='p' size='xs' colour='secondary'>
                                <Trans
                                  t={t}
                                  i18nKey='modals.trackingSnippet.add'
                                  components={{
                                    bsect: (
                                      <Badge label='<body>' colour='slate' />
                                    ),
                                  }}
                                />
                              </Text>
                            </div>
                          </div>

                          <Textarea
                            classes={{
                              container: 'font-mono text-xs',
                              textarea:
                                'bg-white dark:bg-slate-900 ring-1 ring-gray-200 dark:ring-slate-700',
                            }}
                            value={getSnippet(project.id)}
                            rows={12}
                            readOnly
                          />

                          <Text
                            as='p'
                            size='xs'
                            colour='secondary'
                            className='mt-4'
                          >
                            <Trans
                              t={t}
                              i18nKey='onboarding.installTracking.weAlsoSupport'
                              components={{
                                url: (
                                  <a
                                    href={DOCS_URL}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                                  />
                                ),
                              }}
                            />
                          </Text>
                        </div>

                        {isWaitingForEvents && (
                          <div className='mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-900/20'>
                            <div className='flex items-center gap-3'>
                              <PulsatingCircle type='big' />
                              <div>
                                <Text as='h3' size='sm' weight='semibold'>
                                  {t(
                                    'onboarding.verifyInstallation.waitingForEvents',
                                  )}
                                </Text>
                                <Text as='p' size='xs' colour='muted'>
                                  {t(
                                    'onboarding.verifyInstallation.waitingForAnEvent',
                                  )}
                                </Text>
                              </div>
                            </div>
                          </div>
                        )}

                        {hasEvents && (
                          <div className='mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20'>
                            <div className='flex items-center gap-3'>
                              <CheckCircleIcon className='size-6 text-emerald-600 dark:text-emerald-400' />
                              <div>
                                <Text
                                  as='h3'
                                  size='sm'
                                  weight='semibold'
                                  className='text-emerald-700 dark:text-emerald-300'
                                >
                                  {t('onboarding.verifyInstallation.perfect')}
                                </Text>
                                <Text
                                  as='p'
                                  size='xs'
                                  className='text-emerald-600 dark:text-emerald-400'
                                >
                                  {t(
                                    'onboarding.verifyInstallation.eventReceived',
                                  )}
                                </Text>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {currentStep === 'verify_email' && (
                      <div>
                        <Text
                          as='h1'
                          size='3xl'
                          weight='bold'
                          tracking='tight'
                          className='mb-2'
                        >
                          {t('onboarding.confirm.title')}
                        </Text>

                        {user?.isActive ? (
                          <Alert variant='success' className='mt-8'>
                            {t('onboarding.confirm.emailVerified')}
                          </Alert>
                        ) : (
                          <>
                            <Text
                              as='h2'
                              size='lg'
                              weight='semibold'
                              className='mt-8 mb-4'
                            >
                              {t('onboarding.confirm.emailVerification')}
                            </Text>

                            <Alert
                              variant='info'
                              title={t('onboarding.confirm.verifyTitle')}
                            >
                              <Trans
                                t={t}
                                i18nKey='onboarding.confirm.linkSent'
                                values={{ email: user?.email }}
                                components={{
                                  email: <span className='font-semibold' />,
                                }}
                              />
                            </Alert>

                            <div className='mt-6'>
                              <Text
                                as='p'
                                size='sm'
                                colour='secondary'
                                className='mb-2'
                              >
                                {t('onboarding.confirm.didNotReceive')}
                              </Text>
                              <Button
                                onClick={handleResendEmail}
                                disabled={hasResentEmail}
                                secondary
                                small
                              >
                                {hasResentEmail && (
                                  <CheckCircleIcon className='mr-2 size-4' />
                                )}
                                {hasResentEmail
                                  ? t('onboarding.confirm.emailResent')
                                  : t('onboarding.confirm.resend')}
                              </Button>
                            </div>

                            <div className='mt-6'>
                              <Text
                                as='p'
                                size='sm'
                                colour='secondary'
                                className='mb-2'
                              >
                                {t('onboarding.confirm.troubleOrChange')}
                              </Text>
                              <Button
                                onClick={handleDeleteAccount}
                                secondary
                                small
                              >
                                {t('onboarding.confirm.logoutAndRegister')}
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className='shrink-0 border-t border-gray-200 px-6 py-4 dark:border-white/10'>
                <div className='flex items-center justify-end gap-3'>
                  {currentStepIndex > 0 &&
                    STEPS.indexOf(currentStep) <
                      STEPS.indexOf('setup_tracking') && (
                      <Button onClick={goBack} secondary large>
                        {t('common.back')}
                      </Button>
                    )}
                  {currentStep === 'language' && (
                    <Button onClick={handleLanguageConfirm} primary large>
                      {t('common.next')}
                    </Button>
                  )}
                  {(currentStep === 'welcome' ||
                    currentStep === 'feature_traffic' ||
                    currentStep === 'feature_errors' ||
                    currentStep === 'feature_sessions') && (
                    <Button onClick={goNext} primary large>
                      {t('common.next')}
                    </Button>
                  )}
                  {currentStep === 'create_project' && (
                    <Button
                      onClick={() => handleCreateProject()}
                      loading={isLoading}
                      primary
                      large
                    >
                      {t('common.continue')}
                    </Button>
                  )}
                  {currentStep === 'setup_tracking' && (
                    <Button
                      onClick={() => {
                        setIsWaitingForEvents(true)
                        if (isSelfhosted) {
                          handleCompleteOnboarding(false)
                        } else {
                          goNext()
                        }
                      }}
                      primary
                      large
                    >
                      {t('common.continue')}
                    </Button>
                  )}
                  {currentStep === 'verify_email' && (
                    <Button
                      onClick={async () => {
                        setIsCheckingVerification(true)
                        try {
                          const loadedUser = await loadUser()
                          if (!loadedUser?.isActive) {
                            toast.error(
                              'Please, verify your email address first',
                            )
                            return
                          }
                          handleCompleteOnboarding(false)
                        } finally {
                          setIsCheckingVerification(false)
                        }
                      }}
                      loading={isCheckingVerification}
                      primary
                      large
                    >
                      {t('onboarding.confirm.letsGo')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Onboarding
