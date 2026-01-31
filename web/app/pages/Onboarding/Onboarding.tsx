import type { TFunction } from 'i18next'
import {
  CaretRightIcon,
  LaptopIcon,
  RocketIcon,
  CodeIcon,
  EnvelopeOpenIcon,
  SparkleIcon,
  EnvelopeIcon,
  CheckCircleIcon,
} from '@phosphor-icons/react'
import { useState, useEffect, useMemo, useRef } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useNavigate, useFetcher, useLoaderData } from 'react-router'
import { toast } from 'sonner'

import { CONTACT_US_URL } from '~/components/Footer'
import { useAuthProxy } from '~/hooks/useAuthProxy'
import { DOCS_URL, INTEGRATIONS_URL, isSelfhosted } from '~/lib/constants'
import { getSnippet } from '~/modals/TrackingSnippet'
import { useAuth } from '~/providers/AuthProvider'
import type {
  OnboardingActionData,
  OnboardingLoaderData,
} from '~/routes/onboarding'
import { Badge } from '~/ui/Badge'
import Button from '~/ui/Button'
import PulsatingCircle from '~/ui/icons/PulsatingCircle'
import Input from '~/ui/Input'
import Loader from '~/ui/Loader'
import { Text } from '~/ui/Text'
import Textarea from '~/ui/Textarea'
import { trackCustom } from '~/utils/analytics'
import { cn } from '~/utils/generic'
import routes from '~/utils/routes'

const MAX_PROJECT_NAME_LENGTH = 50

const STEP_ICONS = {
  confirm_email: EnvelopeOpenIcon,
  create_project: RocketIcon,
  setup_tracking: CodeIcon,
  waiting_for_events: SparkleIcon,
}

const getOnboardingSteps = (t: TFunction) => [
  {
    id: 'confirm_email',
    title: t('onboarding.confirm.navTitle'),
    description: t('onboarding.confirm.navDesc'),
    completed: false,
    uiHidden: isSelfhosted,
  },
  {
    id: 'create_project',
    title: t('onboarding.createProject.navTitle'),
    description: t('onboarding.createProject.navDesc'),
    completed: false,
  },
  {
    id: 'setup_tracking',
    title: t('onboarding.installTracking.navTitle'),
    description: t('onboarding.installTracking.navDesc'),
    completed: false,
  },
  {
    id: 'waiting_for_events',
    title: t('onboarding.verifyInstallation.navTitle'),
    description: t('onboarding.verifyInstallation.navDesc'),
    completed: false,
  },
]

interface Project {
  id: string
  name: string
}

const Onboarding = () => {
  const { t } = useTranslation('common')
  const loaderData = useLoaderData<OnboardingLoaderData>()
  const { user, loadUser, logout } = useAuth()
  const { authMe } = useAuthProxy()
  const navigate = useNavigate()
  const fetcher = useFetcher<OnboardingActionData>()
  const lastHandledFetcherDataRef = useRef<OnboardingActionData | null>(null)

  const [currentStep, setCurrentStep] = useState(0)
  const [projectName, setProjectName] = useState('')
  const [project, setProject] = useState<Project | null>(loaderData.project)
  const [isWaitingForEvents, setIsWaitingForEvents] = useState(false)
  const [hasEvents, setHasEvents] = useState(false)

  const [newProjectErrors, setNewProjectErrors] = useState<{
    name?: string
  }>({})

  const isLoading =
    fetcher.state === 'submitting' || fetcher.state === 'loading'

  useEffect(() => {
    if (!fetcher.data) return
    if (lastHandledFetcherDataRef.current === fetcher.data) return
    lastHandledFetcherDataRef.current = fetcher.data

    if (fetcher.data?.success) {
      const { intent, project: newProject } = fetcher.data

      if (intent === 'create-project' && newProject) {
        setTimeout(() => setProject(newProject), 0)
        // Update the step after project creation
        const stepFormData = new FormData()
        stepFormData.set('intent', 'update-step')
        stepFormData.set('step', 'setup_tracking')
        fetcher.submit(stepFormData, { method: 'post' })
        setTimeout(() => setCurrentStep(2), 0)
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

    if (!user?.isActive && !isSelfhosted) {
      setTimeout(() => setCurrentStep(0), 0)
      return
    }

    if (!user?.onboardingStep) {
      setTimeout(() => setCurrentStep(1), 0)
      return
    }

    switch (user.onboardingStep) {
      case 'create_project':
        setTimeout(() => setCurrentStep(1), 0)
        break
      case 'setup_tracking':
        setTimeout(() => setCurrentStep(2), 0)
        break
      case 'waiting_for_events':
        setTimeout(() => {
          setCurrentStep(3)
          setIsWaitingForEvents(true)
        }, 0)
        break
      default:
        setTimeout(() => setCurrentStep(1), 0)
    }
  }, [user, navigate])

  useEffect(() => {
    if (!isWaitingForEvents || !project) return

    const checkForEvents = async () => {
      try {
        const { totalMonthlyEvents } = await authMe()
        if (totalMonthlyEvents > 0) {
          setHasEvents(true)
          setIsWaitingForEvents(false)
        }
      } catch (reason) {
        console.error('Failed to check for events:', reason)
      }
    }

    const interval = setInterval(checkForEvents, 3000)
    return () => clearInterval(interval)
  }, [isWaitingForEvents, project, authMe])

  const updateUserStep = (step: string) => {
    if (fetcher.state !== 'idle') return

    const formData = new FormData()
    formData.set('intent', 'update-step')
    formData.set('step', step)
    fetcher.submit(formData, { method: 'post' })
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

  const steps = useMemo(() => {
    return getOnboardingSteps(t).map((step, index) => ({
      ...step,
      completed:
        index < currentStep ||
        (index === currentStep &&
          ((index === 0 && user?.isActive) || // Email step is completed when user is active
            (index === 3 && hasEvents))), // Events step is completed when we have events
      current: index === currentStep,
    }))
  }, [t, currentStep, hasEvents, user?.isActive])

  if (!user) {
    return (
      <div className='flex min-h-min-footer items-center justify-center bg-gray-50 dark:bg-slate-900'>
        <Loader />
      </div>
    )
  }

  const progressPercentage = (currentStep / (steps.length - 1)) * 100
  const visibleSteps = steps.filter((step) => !step.uiHidden)

  return (
    <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
      <div className='mx-auto flex max-w-6xl gap-6 px-4 py-6 md:px-6 lg:px-8'>
        {/* Sidebar - Desktop */}
        <aside className='sticky top-6 hidden h-fit w-72 shrink-0 self-start overflow-hidden rounded-lg border border-gray-200 bg-white md:block dark:border-slate-800/60 dark:bg-slate-800/25'>
          <div className='border-b border-gray-200 p-5 dark:border-slate-800/60'>
            <Text
              as='span'
              size='xs'
              weight='medium'
              colour='muted'
              className='tracking-wide uppercase'
            >
              {t('onboarding.welcome')}
            </Text>
            <Text
              as='h1'
              size='xl'
              weight='semibold'
              tracking='tight'
              className='mt-1'
            >
              {t('onboarding.title')}
            </Text>
          </div>

          <nav aria-label='Progress' className='p-4'>
            <ol className='space-y-1'>
              {steps.map((step) => {
                if (step.uiHidden) return null

                const status = step.completed
                  ? 'complete'
                  : step.current
                    ? 'current'
                    : 'upcoming'
                const StepIcon = STEP_ICONS[step.id as keyof typeof STEP_ICONS]

                return (
                  <li key={step.id}>
                    <div
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                        status === 'current' &&
                          'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20',
                        status === 'complete' &&
                          'bg-green-50/50 dark:bg-green-500/10',
                        status === 'upcoming' && 'opacity-60',
                      )}
                    >
                      <div
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                          status === 'complete' &&
                            'bg-green-100 dark:bg-green-500/20',
                          status === 'current' &&
                            'bg-indigo-100 dark:bg-indigo-500/20',
                          status === 'upcoming' &&
                            'bg-gray-100 dark:bg-slate-700',
                        )}
                      >
                        {status === 'complete' ? (
                          <CheckCircleIcon className='size-5 text-green-600 dark:text-green-400' />
                        ) : StepIcon ? (
                          <StepIcon
                            className={cn(
                              'size-4',
                              status === 'current' &&
                                'text-indigo-600 dark:text-indigo-400',
                              status === 'upcoming' &&
                                'text-gray-400 dark:text-gray-500',
                            )}
                            strokeWidth={1.5}
                          />
                        ) : null}
                      </div>
                      <div className='min-w-0 flex-1'>
                        <Text
                          as='span'
                          size='sm'
                          weight='medium'
                          className={cn(
                            'block',
                            status === 'current' &&
                              'text-indigo-700 dark:text-indigo-300',
                            status === 'complete' &&
                              'text-green-700 dark:text-green-300',
                          )}
                        >
                          {step.title}
                        </Text>
                        <Text
                          as='span'
                          size='xs'
                          colour='muted'
                          className='block'
                        >
                          {step.description}
                        </Text>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </nav>

          {/* Skip onboarding - only shown after email confirmation */}
          {currentStep > 0 ? (
            <div className='border-t border-gray-200 p-4 dark:border-slate-800/60'>
              <button
                type='button'
                onClick={() => handleCompleteOnboarding(true)}
                className='flex w-full items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-200'
              >
                {t('onboarding.skipOnboarding')}
                <CaretRightIcon className='size-3.5' strokeWidth={2} />
              </button>
            </div>
          ) : null}
        </aside>

        {/* Main content */}
        <div className='min-w-0 flex-1'>
          {/* Mobile progress bar */}
          <div className='mb-6 block md:hidden'>
            <div className='flex items-center justify-between'>
              <Text as='span' size='sm' weight='medium'>
                {steps[currentStep]?.title}
              </Text>
              <Text as='span' size='xs' colour='muted'>
                {visibleSteps.findIndex(
                  (s) => s.id === steps[currentStep]?.id,
                ) + 1}{' '}
                / {visibleSteps.length}
              </Text>
            </div>
            <div className='mt-3 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700'>
              <div
                style={{ width: `${progressPercentage}%` }}
                className='h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300'
              />
            </div>
            {currentStep > 0 ? (
              <button
                type='button'
                onClick={() => handleCompleteOnboarding(true)}
                className='mt-3 flex w-full items-center justify-center gap-1 text-sm text-gray-500 dark:text-gray-400'
              >
                {t('onboarding.skipOnboarding')}
                <CaretRightIcon className='size-3.5' strokeWidth={2} />
              </button>
            ) : null}
          </div>

          {/* Content card */}
          <div className='overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-800/60 dark:bg-slate-800/25'>
            {/* "Confirm your email" step */}
            {currentStep === 0 ? (
              <div className='p-6 md:p-8'>
                <div className='mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-500/20 dark:to-purple-500/20'>
                  <EnvelopeIcon className='size-8 text-indigo-600 dark:text-indigo-400' />
                </div>
                <Text
                  as='h1'
                  size='3xl'
                  weight='semibold'
                  tracking='tight'
                  className='text-center'
                >
                  {t('onboarding.confirm.title')}
                </Text>
                <Text
                  as='p'
                  colour='secondary'
                  className='mx-auto mt-4 max-w-md text-center whitespace-pre-line'
                >
                  {t('onboarding.confirm.linkSent', { email: user?.email })}
                </Text>

                <Text
                  as='p'
                  size='sm'
                  colour='muted'
                  className='mx-auto mt-8 max-w-md text-center'
                >
                  {t('onboarding.confirm.spam')}
                </Text>
                <Text
                  as='p'
                  size='sm'
                  colour='muted'
                  className='mt-2 text-center'
                >
                  <Trans
                    t={t}
                    i18nKey='onboarding.confirm.wrongEmail'
                    components={{
                      url: (
                        <button
                          type='button'
                          className='cursor-pointer font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                          onClick={handleDeleteAccount}
                        />
                      ),
                    }}
                  />
                </Text>
              </div>
            ) : null}

            {/* "Create a project" step */}
            {currentStep === 1 ? (
              <form onSubmit={handleCreateProject} className='p-6 md:p-8'>
                <div className='mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-500/20 dark:to-purple-500/20'>
                  <RocketIcon
                    className='size-8 text-indigo-600 dark:text-indigo-400'
                    strokeWidth={1.5}
                  />
                </div>
                <Text
                  as='h1'
                  size='3xl'
                  weight='semibold'
                  tracking='tight'
                  className='text-center'
                >
                  {t('onboarding.createProject.title')}
                </Text>
                <Text
                  as='p'
                  colour='secondary'
                  className='mx-auto mt-4 max-w-md text-center whitespace-pre-line'
                >
                  {t('onboarding.createProject.desc')}
                </Text>

                <div className='mx-auto mt-8 max-w-sm'>
                  <Input
                    label={t('project.settings.name')}
                    placeholder='My awesome website'
                    maxLength={MAX_PROJECT_NAME_LENGTH}
                    value={projectName}
                    onChange={(e) => {
                      setProjectName(e.target.value)
                      setNewProjectErrors({})
                    }}
                    error={newProjectErrors.name}
                  />
                </div>

                <div className='mt-8 flex justify-center'>
                  <Button type='submit' loading={isLoading} primary large>
                    {t('common.continue')}
                  </Button>
                </div>
              </form>
            ) : null}

            {/* "Install tracking script" step */}
            {currentStep === 2 && project ? (
              <div className='p-6 md:p-8'>
                <div className='mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-500/20 dark:to-purple-500/20'>
                  <CodeIcon
                    className='size-8 text-indigo-600 dark:text-indigo-400'
                    strokeWidth={1.5}
                  />
                </div>
                <Text
                  as='h1'
                  size='3xl'
                  weight='semibold'
                  tracking='tight'
                  className='text-center'
                >
                  {t('onboarding.installTracking.title')}
                </Text>
                <Text
                  as='p'
                  colour='secondary'
                  className='mx-auto mt-4 max-w-lg text-center whitespace-pre-line'
                >
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

                <div className='mt-8 rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-slate-700/60 dark:bg-slate-800/50'>
                  <div className='flex items-center gap-3'>
                    <div className='flex size-11 items-center justify-center rounded-lg bg-white dark:bg-slate-700'>
                      <LaptopIcon
                        className='size-5 text-gray-700 dark:text-gray-200'
                        strokeWidth={1.5}
                      />
                    </div>
                    <div>
                      <Text as='h3' size='sm' weight='semibold'>
                        {t('onboarding.installTracking.websiteInstallation')}
                      </Text>
                      <Text as='p' size='xs' colour='muted'>
                        {t('onboarding.installTracking.pasteScript')}
                      </Text>
                    </div>
                  </div>

                  <Text as='p' size='sm' colour='secondary' className='mt-4'>
                    <Trans
                      t={t}
                      i18nKey='modals.trackingSnippet.add'
                      components={{
                        bsect: <Badge label='<body>' colour='slate' />,
                      }}
                    />
                  </Text>

                  <Textarea
                    classes={{
                      container: 'mt-3 font-mono text-sm',
                      textarea:
                        'bg-white dark:bg-slate-900 ring-1 ring-gray-200 dark:ring-slate-700',
                    }}
                    value={getSnippet(project.id)}
                    rows={15}
                    readOnly
                  />

                  <Text as='p' size='xs' colour='muted' className='mt-4'>
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

                <div className='mt-8 flex justify-center'>
                  <Button
                    onClick={async () => {
                      await updateUserStep('waiting_for_events')
                      setCurrentStep(3)
                      setIsWaitingForEvents(true)
                    }}
                    primary
                    large
                  >
                    {t('common.continue')}
                  </Button>
                </div>
              </div>
            ) : null}

            {/* "Verify installation" step */}
            {currentStep === 3 ? (
              <div className='p-6 md:p-8'>
                <div
                  className={cn(
                    'mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl',
                    hasEvents
                      ? 'bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-500/20 dark:to-emerald-500/20'
                      : 'bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-500/20 dark:to-purple-500/20',
                  )}
                >
                  {hasEvents ? (
                    <CheckCircleIcon className='size-8 text-green-600 dark:text-green-400' />
                  ) : (
                    <PulsatingCircle type='giant' />
                  )}
                </div>
                <Text
                  as='h1'
                  size='3xl'
                  weight='semibold'
                  tracking='tight'
                  className='text-center'
                >
                  {hasEvents
                    ? t('onboarding.verifyInstallation.perfect')
                    : t('onboarding.verifyInstallation.navTitle')}
                </Text>
                <Text
                  as='p'
                  colour='secondary'
                  className='mx-auto mt-4 max-w-md text-center whitespace-pre-line'
                >
                  {hasEvents
                    ? t('onboarding.verifyInstallation.eventReceived')
                    : t('onboarding.verifyInstallation.desc')}
                </Text>

                {hasEvents ? (
                  <div className='mx-auto mt-8 max-w-sm rounded-lg bg-green-50 p-4 dark:bg-green-500/10'>
                    <Text
                      as='p'
                      size='sm'
                      className='text-center text-green-700 dark:text-green-300'
                    >
                      {t('onboarding.verifyInstallation.perfectDesc')}
                    </Text>
                  </div>
                ) : (
                  <div className='mx-auto mt-8 max-w-md rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-slate-700/60 dark:bg-slate-800/50'>
                    <div className='flex items-center gap-3'>
                      <div className='flex size-11 items-center justify-center rounded-lg bg-white dark:bg-slate-700'>
                        <PulsatingCircle type='big' />
                      </div>
                      <div>
                        <Text as='h3' size='sm' weight='semibold'>
                          {t('onboarding.verifyInstallation.waitingForEvents')}
                        </Text>
                        <Text as='p' size='xs' colour='muted'>
                          {project?.name
                            ? t('onboarding.verifyInstallation.onTheXProject', {
                                project: project.name,
                              })
                            : t('onboarding.verifyInstallation.onYourProject')}
                        </Text>
                      </div>
                    </div>
                    <Text as='p' size='sm' colour='secondary' className='mt-4'>
                      {t('onboarding.verifyInstallation.waitingForAnEvent')}
                    </Text>

                    <div className='mt-4 space-y-2 border-t border-gray-200 pt-4 dark:border-slate-700'>
                      <Text as='p' size='xs' colour='muted'>
                        <Trans
                          t={t}
                          i18nKey='onboarding.verifyInstallation.needInstructionsAgain'
                          components={{
                            btn: (
                              <button
                                type='button'
                                onClick={() => {
                                  setCurrentStep(2)
                                  setIsWaitingForEvents(false)
                                }}
                                className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                              />
                            ),
                          }}
                        />
                      </Text>
                      <Text as='p' size='xs' colour='muted'>
                        <Trans
                          t={t}
                          i18nKey='onboarding.verifyInstallation.orContactUs'
                          components={{
                            url: (
                              <Link
                                to={
                                  isSelfhosted ? CONTACT_US_URL : routes.contact
                                }
                                target='_blank'
                                rel='noopener noreferrer'
                                className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                              />
                            ),
                          }}
                        />
                      </Text>
                    </div>
                  </div>
                )}

                <div className='mt-8 flex justify-center gap-3'>
                  {!hasEvents ? (
                    <Button
                      onClick={async () => {
                        await updateUserStep('setup_tracking')
                        setCurrentStep(2)
                        setIsWaitingForEvents(false)
                      }}
                      secondary
                      large
                    >
                      {t('common.goBack')}
                    </Button>
                  ) : null}
                  <Button
                    onClick={() => handleCompleteOnboarding(false)}
                    primary
                    large
                  >
                    {t('onboarding.finishOnboarding')}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Onboarding
