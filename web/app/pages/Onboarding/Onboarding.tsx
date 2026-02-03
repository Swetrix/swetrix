import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import _map from 'lodash/map'
import {
  ChartLineUpIcon,
  BugIcon,
  UsersThreeIcon,
  RocketIcon,
  CodeIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  SparkleIcon,
  GlobeIcon,
  ClockIcon,
} from '@phosphor-icons/react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useNavigate, useFetcher, useLoaderData } from 'react-router'
import { toast } from 'sonner'

import { useAuthProxy } from '~/hooks/useAuthProxy'
import {
  DOCS_URL,
  INTEGRATIONS_URL,
  isSelfhosted,
  whitelist,
  languages,
  languageFlag,
} from '~/lib/constants'
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
import { Text } from '~/ui/Text'
import Textarea from '~/ui/Textarea'
import { trackCustom } from '~/utils/analytics'
import { cn } from '~/utils/generic'
import routes from '~/utils/routes'

const MAX_PROJECT_NAME_LENGTH = 50
const ANIMATION_DURATION = 0.4
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
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 40 : -40,
    opacity: 0,
  }),
}

const reducedMotionVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
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
        className='h-full rounded-full bg-indigo-500'
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{
          duration: 0.3,
          ease: EASE_OUT_QUART,
        }}
      />
    </div>
  )
}

const FeatureVisualization = ({
  type,
}: {
  type: 'traffic' | 'errors' | 'sessions'
}) => {
  if (type === 'traffic') {
    return (
      <div className='relative mx-auto mt-8 w-full max-w-lg'>
        <div className='overflow-hidden rounded-xl bg-white p-6 shadow-xl ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10'>
          <div className='mb-4 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <div className='flex size-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30'>
                <ChartLineUpIcon className='size-4 text-indigo-600 dark:text-indigo-400' />
              </div>
              <Text as='span' size='sm' weight='medium'>
                Page Views
              </Text>
            </div>
            <Badge label='+24%' colour='green' />
          </div>
          <div className='flex items-end gap-1'>
            {[40, 55, 35, 65, 45, 80, 60, 90, 70, 95, 85, 100].map(
              (height, i) => (
                <motion.div
                  key={i}
                  className='flex-1 rounded-t bg-indigo-500'
                  initial={{ height: 0 }}
                  animate={{ height: `${height}px` }}
                  transition={{
                    delay: i * 0.04,
                    duration: 0.4,
                    ease: EASE_OUT_QUART,
                  }}
                />
              ),
            )}
          </div>
          <div className='mt-4 grid grid-cols-3 gap-4'>
            <div className='rounded-lg bg-gray-50 p-3 dark:bg-slate-700/50'>
              <Text as='span' size='xs' colour='muted' className='block'>
                Visitors
              </Text>
              <Text as='span' size='lg' weight='semibold'>
                12.4K
              </Text>
            </div>
            <div className='rounded-lg bg-gray-50 p-3 dark:bg-slate-700/50'>
              <Text as='span' size='xs' colour='muted' className='block'>
                Bounce Rate
              </Text>
              <Text as='span' size='lg' weight='semibold'>
                42%
              </Text>
            </div>
            <div className='rounded-lg bg-gray-50 p-3 dark:bg-slate-700/50'>
              <Text as='span' size='xs' colour='muted' className='block'>
                Avg. Time
              </Text>
              <Text as='span' size='lg' weight='semibold'>
                2:34
              </Text>
            </div>
          </div>
        </div>
        <div className='absolute -right-2 -bottom-2 -z-10 size-full rounded-xl bg-indigo-100 dark:bg-indigo-900/30' />
      </div>
    )
  }

  if (type === 'errors') {
    return (
      <div className='relative mx-auto mt-8 w-full max-w-lg'>
        <div className='overflow-hidden rounded-xl bg-white p-6 shadow-xl ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10'>
          <div className='mb-4 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <div className='flex size-8 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30'>
                <BugIcon className='size-4 text-rose-600 dark:text-rose-400' />
              </div>
              <Text as='span' size='sm' weight='medium'>
                Error Tracking
              </Text>
            </div>
            <Badge label='3 new' colour='red' />
          </div>
          <div className='space-y-3'>
            {[
              {
                type: 'TypeError',
                message: "Cannot read property 'map' of undefined",
                count: 23,
              },
              {
                type: 'ReferenceError',
                message: 'window is not defined',
                count: 12,
              },
              {
                type: 'NetworkError',
                message: 'Failed to fetch /api/data',
                count: 8,
              },
            ].map((error, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: i * 0.08,
                  duration: 0.3,
                  ease: EASE_OUT_QUART,
                }}
                className='flex items-start gap-3 rounded-lg bg-rose-50 p-3 dark:bg-rose-900/20'
              >
                <div className='mt-0.5 size-2 shrink-0 rounded-full bg-rose-500' />
                <div className='min-w-0 flex-1'>
                  <Text
                    as='span'
                    size='xs'
                    weight='semibold'
                    className='text-rose-700 dark:text-rose-300'
                  >
                    {error.type}
                  </Text>
                  <Text as='p' size='xs' colour='muted' className='truncate'>
                    {error.message}
                  </Text>
                </div>
                <Badge label={String(error.count)} colour='slate' />
              </motion.div>
            ))}
          </div>
        </div>
        <div className='absolute -right-2 -bottom-2 -z-10 size-full rounded-xl bg-rose-100 dark:bg-rose-900/30' />
      </div>
    )
  }

  return (
    <div className='relative mx-auto mt-8 w-full max-w-lg'>
      <div className='overflow-hidden rounded-xl bg-white p-6 shadow-xl ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10'>
        <div className='mb-4 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div className='flex size-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30'>
              <UsersThreeIcon className='size-4 text-emerald-600 dark:text-emerald-400' />
            </div>
            <Text as='span' size='sm' weight='medium'>
              User Sessions
            </Text>
          </div>
          <div className='flex items-center gap-1 text-emerald-600 dark:text-emerald-400'>
            <PulsatingCircle type='small' />
            <Text as='span' size='xs' weight='medium'>
              12 online
            </Text>
          </div>
        </div>
        <div className='space-y-3'>
          {[
            {
              country: 'US',
              pages: 5,
              duration: '4:23',
              device: 'Desktop',
            },
            {
              country: 'DE',
              pages: 3,
              duration: '2:15',
              device: 'Mobile',
            },
            {
              country: 'GB',
              pages: 8,
              duration: '6:42',
              device: 'Desktop',
            },
          ].map((session, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: i * 0.08,
                duration: 0.3,
                ease: EASE_OUT_QUART,
              }}
              className='flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-slate-700/50'
            >
              <Flag country={session.country} size={20} />
              <div className='flex-1'>
                <div className='flex items-center gap-2'>
                  <Text as='span' size='xs' weight='medium'>
                    {session.pages} pages
                  </Text>
                  <Text as='span' size='xs' colour='muted'>
                    •
                  </Text>
                  <Text as='span' size='xs' colour='muted'>
                    {session.device}
                  </Text>
                </div>
              </div>
              <div className='flex items-center gap-1 text-gray-500 dark:text-gray-400'>
                <ClockIcon className='size-3' />
                <Text as='span' size='xs'>
                  {session.duration}
                </Text>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <div className='absolute -right-2 -bottom-2 -z-10 size-full rounded-xl bg-emerald-100 dark:bg-emerald-900/30' />
    </div>
  )
}

const ProjectVisualization = () => {
  return (
    <div className='relative mx-auto mb-8 w-full max-w-md'>
      <div className='overflow-hidden rounded-xl bg-white p-6 shadow-lg ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10'>
        <div className='flex items-center gap-4'>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4, ease: EASE_OUT_QUART }}
            className='flex size-14 items-center justify-center rounded-xl bg-indigo-500'
          >
            <RocketIcon className='size-7 text-white' weight='fill' />
          </motion.div>
          <div className='flex-1 space-y-2'>
            <motion.div
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.25, duration: 0.4, ease: EASE_OUT_QUART }}
              className='h-4 w-3/4 rounded bg-gray-200 dark:bg-slate-600'
            />
            <motion.div
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.35, duration: 0.4, ease: EASE_OUT_QUART }}
              className='h-3 w-full rounded bg-gray-100 dark:bg-slate-700'
            />
            <motion.div
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.45, duration: 0.4, ease: EASE_OUT_QUART }}
              className='h-3 w-3/5 rounded bg-gray-100 dark:bg-slate-700'
            />
          </div>
        </div>
      </div>
    </div>
  )
}

const Onboarding = () => {
  const { t, i18n } = useTranslation('common')
  const { theme } = useTheme()
  const prefersReducedMotion = useReducedMotion()
  const loaderData = useLoaderData<OnboardingLoaderData>()
  const { user, loadUser, logout } = useAuth()
  const { authMe } = useAuthProxy()
  const navigate = useNavigate()
  const fetcher = useFetcher<OnboardingActionData>()
  const lastHandledFetcherDataRef = useRef<OnboardingActionData | null>(null)

  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [projectName, setProjectName] = useState('')
  const [project, setProject] = useState<Project | null>(loaderData.project)
  const [isWaitingForEvents, setIsWaitingForEvents] = useState(false)
  const [hasEvents, setHasEvents] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language)

  const [newProjectErrors, setNewProjectErrors] = useState<{
    name?: string
  }>({})
  const [isCheckingVerification, setIsCheckingVerification] = useState(false)

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
        goToStep('setup_tracking')
      } else if (intent === 'update-step') {
        loadUser()
      } else if (intent === 'complete-onboarding') {
        loadUser()
        navigate(routes.dashboard)
      } else if (intent === 'delete-account') {
        logout()
        navigate(routes.main)
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
    if (user?.hasCompletedOnboarding) {
      navigate(routes.dashboard)
      return
    }

    if (user?.onboardingStep === 'setup_tracking' && project) {
      goToStep('setup_tracking')
      return
    }

    if (user?.onboardingStep === 'waiting_for_events' && project) {
      goToStep('setup_tracking')
      setIsWaitingForEvents(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate, project])

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

  const goToStep = useCallback(
    (step: OnboardingStep) => {
      const newIndex = STEPS.indexOf(step)
      setDirection(newIndex > currentStepIndex ? 1 : -1)
      setCurrentStepIndex(newIndex)
    },
    [currentStepIndex],
  )

  const goNext = useCallback(() => {
    if (currentStepIndex < STEPS.length - 1) {
      setDirection(1)
      setCurrentStepIndex((prev) => prev + 1)
    }
  }, [currentStepIndex])

  const goBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setDirection(-1)
      setCurrentStepIndex((prev) => prev - 1)
    }
  }, [currentStepIndex])

  const handleLanguageSelect = (lng: string) => {
    setSelectedLanguage(lng)
  }

  const handleLanguageConfirm = () => {
    if (selectedLanguage !== i18n.language) {
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

  const handleSkipTracking = () => {
    if (isSelfhosted) {
      handleCompleteOnboarding(true)
    } else {
      goNext()
    }
  }

  if (!user) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900'>
        <Loader />
      </div>
    )
  }

  return (
    <div className='flex h-screen flex-col overflow-hidden bg-gray-200 p-2 sm:p-2.5 dark:bg-slate-950'>
      <div className='flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-gray-50 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10'>
        <div className='flex h-full max-h-[min(92%,50rem)] min-h-0 w-full max-w-3xl flex-col'>
          <div className='relative mx-auto min-h-0 w-full max-w-5xl flex-1 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10'>
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
                    transition={{
                      x: {
                        type: 'tween',
                        duration: prefersReducedMotion ? 0.1 : 0.3,
                        ease: EASE_OUT_QUART,
                      },
                      opacity: { duration: prefersReducedMotion ? 0.1 : 0.2 },
                    }}
                    className='px-6 py-6 md:px-10'
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
                                    ? 'bg-indigo-50 ring-2 ring-indigo-500 dark:bg-indigo-900/20 dark:ring-indigo-400'
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
                                      ? 'text-indigo-700 dark:text-indigo-300'
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

                        <div className='relative overflow-hidden rounded-xl'>
                          <img
                            src={
                              theme === 'dark'
                                ? '/assets/screenshot_dark.png'
                                : '/assets/screenshot_light.png'
                            }
                            alt='Swetrix Dashboard'
                            className='w-full'
                          />
                          <div className='pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-white to-transparent dark:from-slate-800' />
                        </div>

                        <div className='mt-6 rounded-xl bg-indigo-50 p-4 dark:bg-indigo-900/20'>
                          <div className='flex items-start gap-3'>
                            <SparkleIcon className='mt-0.5 size-5 shrink-0 text-indigo-600 dark:text-indigo-400' />
                            <div>
                              <Text as='h3' size='sm' weight='semibold'>
                                {t('onboarding.welcomeScreen.featureTitle')}
                              </Text>
                              <Text as='p' size='sm' colour='secondary'>
                                {t('onboarding.welcomeScreen.featureDesc')}
                              </Text>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentStep === 'feature_traffic' && (
                      <div>
                        <div className='mb-2 text-xs font-medium tracking-wider text-indigo-600 uppercase dark:text-indigo-400'>
                          {t('onboarding.features.feature')} 1
                        </div>
                        <Text
                          as='h1'
                          size='3xl'
                          weight='bold'
                          tracking='tight'
                          className='mb-2'
                        >
                          {t('onboarding.features.traffic.title')}
                        </Text>
                        <Text as='p' colour='secondary' className='max-w-md'>
                          {t('onboarding.features.traffic.desc')}
                        </Text>

                        <FeatureVisualization type='traffic' />

                        <div className='mt-6 rounded-xl bg-indigo-50 p-4 dark:bg-indigo-900/20'>
                          <div className='flex items-center gap-2'>
                            <GlobeIcon className='size-4 text-indigo-600 dark:text-indigo-400' />
                            <Text
                              as='span'
                              size='sm'
                              className='text-indigo-700 dark:text-indigo-300'
                            >
                              {t('onboarding.features.traffic.tip')}
                            </Text>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentStep === 'feature_errors' && (
                      <div className='py-6'>
                        <div className='mb-2 text-xs font-medium tracking-wider text-rose-600 uppercase dark:text-rose-400'>
                          {t('onboarding.features.feature')} 2
                        </div>
                        <Text
                          as='h1'
                          size='3xl'
                          weight='bold'
                          tracking='tight'
                          className='mb-2'
                        >
                          {t('onboarding.features.errors.title')}
                        </Text>
                        <Text as='p' colour='secondary' className='max-w-md'>
                          {t('onboarding.features.errors.desc')}
                        </Text>

                        <FeatureVisualization type='errors' />

                        <div className='mt-6 rounded-xl bg-rose-50 p-4 dark:bg-rose-900/20'>
                          <div className='flex items-center gap-2'>
                            <BugIcon className='size-4 text-rose-600 dark:text-rose-400' />
                            <Text
                              as='span'
                              size='sm'
                              className='text-rose-700 dark:text-rose-300'
                            >
                              {t('onboarding.features.errors.tip')}
                            </Text>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentStep === 'feature_sessions' && (
                      <div>
                        <div className='mb-2 text-xs font-medium tracking-wider text-emerald-600 uppercase dark:text-emerald-400'>
                          {t('onboarding.features.feature')} 3
                        </div>
                        <Text
                          as='h1'
                          size='3xl'
                          weight='bold'
                          tracking='tight'
                          className='mb-2'
                        >
                          {t('onboarding.features.sessions.title')}
                        </Text>
                        <Text as='p' colour='secondary' className='max-w-md'>
                          {t('onboarding.features.sessions.desc')}
                        </Text>

                        <FeatureVisualization type='sessions' />

                        <div className='mt-6 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-900/20'>
                          <div className='flex items-center gap-2'>
                            <UsersThreeIcon className='size-4 text-emerald-600 dark:text-emerald-400' />
                            <Text
                              as='span'
                              size='sm'
                              className='text-emerald-700 dark:text-emerald-300'
                            >
                              {t('onboarding.features.sessions.tip')}
                            </Text>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentStep === 'create_project' && (
                      <form onSubmit={handleCreateProject} className='py-6'>
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

                        <ProjectVisualization />

                        <div className='mx-auto max-w-sm'>
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

                        <div className='rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-slate-700 dark:bg-slate-800/50'>
                          <div className='mb-4 flex items-center gap-3'>
                            <div className='flex size-10 items-center justify-center rounded-lg bg-white dark:bg-slate-700'>
                              <CodeIcon className='size-5 text-gray-700 dark:text-gray-200' />
                            </div>
                            <div>
                              <Text as='h3' size='sm' weight='semibold'>
                                {t(
                                  'onboarding.installTracking.websiteInstallation',
                                )}
                              </Text>
                              <Text as='p' size='xs' colour='muted'>
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
                            colour='muted'
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
                        <div className='mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-100 to-purple-100 dark:from-indigo-500/20 dark:to-purple-500/20'>
                          <EnvelopeIcon className='size-8 text-indigo-600 dark:text-indigo-400' />
                        </div>
                        <Text
                          as='h1'
                          size='3xl'
                          weight='bold'
                          tracking='tight'
                          className='mb-2 text-center'
                        >
                          {t('onboarding.confirm.title')}
                        </Text>
                        <Text
                          as='p'
                          colour='secondary'
                          className='mx-auto max-w-md text-center'
                        >
                          {t('onboarding.confirm.linkSent', {
                            email: user?.email,
                          })}
                        </Text>

                        <div className='mx-auto mt-8 max-w-sm rounded-xl bg-indigo-50 p-4 dark:bg-indigo-900/20'>
                          <div className='flex items-start gap-3'>
                            <EnvelopeIcon className='mt-0.5 size-5 shrink-0 text-indigo-600 dark:text-indigo-400' />
                            <div>
                              <Text as='h3' size='sm' weight='semibold'>
                                {t('onboarding.confirm.verifyTitle')}
                              </Text>
                              <Text as='p' size='sm' colour='secondary'>
                                {t('onboarding.confirm.spam')}
                              </Text>
                            </div>
                          </div>
                        </div>

                        <Text
                          as='p'
                          size='sm'
                          colour='muted'
                          className='mt-6 text-center'
                        >
                          <Trans
                            t={t}
                            i18nKey='onboarding.confirm.wrongEmail'
                            components={{
                              url: (
                                <button
                                  type='button'
                                  className='cursor-pointer rounded font-medium text-indigo-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-400'
                                  onClick={handleDeleteAccount}
                                />
                              ),
                            }}
                          />
                        </Text>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className='shrink-0 border-t border-gray-200 px-6 py-4 dark:border-slate-700'>
                <div className='flex items-center justify-end gap-3'>
                  {currentStepIndex > 0 && currentStep !== 'verify_email' && (
                    <Button onClick={goBack} secondary large>
                      {t('common.back')}
                    </Button>
                  )}
                  {currentStep === 'setup_tracking' && (
                    <Button onClick={handleSkipTracking} secondary large>
                      {t('common.skip')}
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
                          await loadUser()
                          handleCompleteOnboarding(false)
                        } finally {
                          setIsCheckingVerification(false)
                        }
                      }}
                      loading={isCheckingVerification}
                      primary
                      large
                    >
                      {t('onboarding.finishOnboarding')}
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
