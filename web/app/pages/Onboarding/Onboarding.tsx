import { EnvelopeIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid'
import cx from 'clsx'
import type { TFunction } from 'i18next'
import { ChevronRightIcon, LaptopMinimalIcon } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { updateOnboardingStep, completeOnboarding, createProject, authMe, getProjects } from '~/api'
import { CONTACT_US_URL } from '~/components/Footer'
import { withAuthentication, auth } from '~/hoc/protected'
import { DOCS_URL, INTEGRATIONS_URL, isSelfhosted } from '~/lib/constants'
import { getSnippet } from '~/modals/TrackingSnippet'
import { useAuth } from '~/providers/AuthProvider'
import { Badge } from '~/ui/Badge'
import Button from '~/ui/Button'
import PulsatingCircle from '~/ui/icons/PulsatingCircle'
import Input from '~/ui/Input'
import Loader from '~/ui/Loader'
import Textarea from '~/ui/Textarea'
import { trackCustom } from '~/utils/analytics'
import { logout } from '~/utils/auth'
import routes from '~/utils/routes'

import { MAX_PROJECT_NAME_LENGTH } from '../Project/New'

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
  const { user, loadUser } = useAuth()
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [project, setProject] = useState<Project | null>(null)
  const [isWaitingForEvents, setIsWaitingForEvents] = useState(false)
  const [hasEvents, setHasEvents] = useState(false)

  const [newProjectErrors, setNewProjectErrors] = useState<{
    name?: string
  }>({})

  useEffect(() => {
    if (user?.hasCompletedOnboarding) {
      navigate(routes.dashboard)
      return
    }

    const determineCurrentStep = async () => {
      if (!user?.isActive && !isSelfhosted) {
        setCurrentStep(0)
        return
      }

      if (!user?.onboardingStep) {
        setCurrentStep(1)
        return
      }

      switch (user.onboardingStep) {
        case 'create_project':
          setCurrentStep(1)
          break
        case 'setup_tracking':
          setCurrentStep(2)
          try {
            const projectsData = await getProjects(1, 0)
            if (projectsData.results.length > 0) {
              setProject(projectsData.results[0])
              setCurrentStep(2)
            }
          } catch (reason) {
            console.error('Failed to get projects:', reason)
          }
          break
        case 'waiting_for_events':
          setCurrentStep(3)
          setIsWaitingForEvents(true)
          break
        default:
          setCurrentStep(1)
      }
    }

    determineCurrentStep()
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
  }, [isWaitingForEvents, project])

  const updateUserStep = async (step: string) => {
    try {
      await updateOnboardingStep(step)
      await loadUser()
    } catch (reason) {
      console.error('Failed to update onboarding step:', reason)
    }
  }

  const handleCreateProject = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault()
    e?.stopPropagation()

    const trimmedName = projectName.trim()

    if (!trimmedName) {
      setNewProjectErrors({ name: t('project.settings.noNameError') })
      return
    }

    if (trimmedName.length > MAX_PROJECT_NAME_LENGTH) {
      setNewProjectErrors({ name: t('project.settings.pxCharsError', { amount: MAX_PROJECT_NAME_LENGTH }) })
      return
    }

    setIsLoading(true)
    try {
      const newProject = await createProject({
        name: trimmedName,
      })

      setProject(newProject)
      await updateUserStep('setup_tracking')
      setCurrentStep(2)

      trackCustom('PROJECT_CREATED', {
        from: 'onboarding',
      })
    } catch (reason) {
      toast.error(typeof reason === 'string' ? reason : 'Failed to create project')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompleteOnboarding = async (skipped = false) => {
    try {
      await completeOnboarding()
      await loadUser()

      trackCustom('ONBOARDING_COMPLETED', {
        skipped,
      })

      navigate(routes.dashboard)
    } catch (reason) {
      console.error('Failed to complete onboarding:', reason)
      toast.error(typeof reason === 'string' ? reason : t('apiNotifications.somethingWentWrong'))
    }
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
      <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
        <Loader />
      </div>
    )
  }

  const progressPercentage = (currentStep / (steps.length - 1)) * 100

  return (
    <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
      <div className='mx-auto flex min-h-screen max-w-7xl md:px-6 lg:px-8'>
        <div className='hidden md:block md:w-80 md:border-r md:border-gray-200 md:bg-white md:p-8 md:dark:border-slate-700 md:dark:bg-slate-800/50'>
          <div className='mb-8'>
            <div className='mb-2 text-sm font-medium text-gray-500 uppercase dark:text-gray-400'>
              {t('onboarding.welcome')}
            </div>
            <h1 className='max-w-3xl text-2xl font-medium tracking-tight text-pretty text-gray-950 dark:text-gray-200'>
              {t('onboarding.title')}
            </h1>
          </div>

          <nav aria-label='Progress'>
            <ol className='overflow-hidden'>
              {steps.map((step, stepIdx) => {
                if (step.uiHidden) return null

                const status = step.completed ? 'complete' : step.current ? 'current' : 'upcoming'

                return (
                  <li key={step.id} className={cx(stepIdx !== steps.length - 1 ? 'pb-10' : '', 'relative')}>
                    {status === 'complete' ? (
                      <>
                        {stepIdx !== steps.length - 1 ? (
                          <div
                            aria-hidden='true'
                            className='absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5 bg-indigo-600'
                          />
                        ) : null}
                        <div className='group relative flex items-start'>
                          <span className='flex h-9 items-center'>
                            <span className='relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600'>
                              <CheckCircleIconSolid aria-hidden='true' className='h-5 w-5 text-white' />
                            </span>
                          </span>
                          <span className='ml-4 flex min-w-0 flex-col'>
                            <span className='text-sm font-medium text-gray-900 dark:text-gray-50'>{step.title}</span>
                            <span className='text-sm text-gray-600 dark:text-gray-300'>{step.description}</span>
                          </span>
                        </div>
                      </>
                    ) : status === 'current' ? (
                      <>
                        {stepIdx !== steps.length - 1 ? (
                          <div
                            aria-hidden='true'
                            className='absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5 bg-gray-300 dark:bg-slate-600'
                          />
                        ) : null}
                        <div className='group relative flex items-start' aria-current='step'>
                          <span aria-hidden='true' className='flex h-9 items-center'>
                            <span className='relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-indigo-600 bg-white dark:border-indigo-500 dark:bg-slate-800'>
                              <span className='h-2.5 w-2.5 rounded-full bg-indigo-600 dark:bg-indigo-500' />
                            </span>
                          </span>
                          <span className='ml-4 flex min-w-0 flex-col'>
                            <span className='text-sm font-medium text-indigo-600 dark:text-indigo-500'>
                              {step.title}
                            </span>
                            <span className='text-sm text-gray-600 dark:text-gray-300'>{step.description}</span>
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        {stepIdx !== steps.length - 1 ? (
                          <div
                            aria-hidden='true'
                            className='absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5 bg-gray-300 dark:bg-slate-600'
                          />
                        ) : null}
                        <div className='group relative flex items-start'>
                          <span aria-hidden='true' className='flex h-9 items-center'>
                            <span className='relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white transition-colors group-hover:border-gray-400 dark:border-slate-600 dark:bg-slate-800'>
                              <span className='h-2.5 w-2.5 rounded-full bg-transparent transition-colors group-hover:bg-gray-300 dark:group-hover:bg-slate-600' />
                            </span>
                          </span>
                          <span className='ml-4 flex min-w-0 flex-col'>
                            <span className='text-sm font-medium text-gray-500 dark:text-gray-200/90'>
                              {step.title}
                            </span>
                            <span className='text-sm text-gray-600 dark:text-gray-300/70'>{step.description}</span>
                          </span>
                        </div>
                      </>
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>

          {/* We don't want users to skip the "Confirm your email" step until they've confirmed their email */}
          {currentStep === 0 ? null : (
            <div className='mt-8 border-t border-gray-200 pt-8 dark:border-slate-700'>
              <button
                type='button'
                onClick={() => handleCompleteOnboarding(true)}
                className='flex items-center text-sm text-gray-800 hover:underline dark:text-gray-200'
              >
                {t('onboarding.skipOnboarding')}
                <ChevronRightIcon className='ml-0.5 h-3.5 w-3.5' />
              </button>
            </div>
          )}
        </div>

        <div className='flex-1 overflow-visible'>
          <div className='max-w-3xl px-6 py-8 md:px-12'>
            <div className='mb-8 block md:hidden'>
              <h4 className='sr-only'>Progress</h4>
              <p className='text-sm font-medium text-gray-900 dark:text-gray-50'>{steps[currentStep].title}</p>
              <div aria-hidden='true' className='mt-4'>
                <div className='overflow-hidden rounded-full bg-gray-200 dark:bg-slate-600'>
                  <div style={{ width: `${progressPercentage}%` }} className='h-2 rounded-full bg-indigo-600' />
                </div>
              </div>
            </div>

            {/* "Confirm your email" step */}
            {currentStep === 0 ? (
              <div>
                <EnvelopeIcon className='mb-2 h-16 w-auto text-indigo-500 dark:text-indigo-600' />
                <h1 className='max-w-3xl text-5xl/10 tracking-tight text-pretty text-gray-950 max-lg:font-medium dark:text-gray-200'>
                  {t('onboarding.confirm.title')}
                </h1>
                <p className='mt-6 max-w-prose text-base whitespace-pre-line text-gray-800 dark:text-gray-200'>
                  {t('onboarding.confirm.linkSent', { email: user?.email })}
                </p>
                <p className='mt-4 max-w-prose text-sm whitespace-pre-line text-gray-800 dark:text-gray-200'>
                  {t('onboarding.confirm.spam')}
                </p>
                <p className='max-w-prose text-sm whitespace-pre-line text-gray-800 dark:text-gray-200'>
                  <Trans
                    t={t}
                    i18nKey='onboarding.confirm.wrongEmail'
                    components={{
                      url: (
                        <span
                          tabIndex={0}
                          role='button'
                          className='cursor-pointer font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                          onClick={() => {
                            logout()
                          }}
                        />
                      ),
                    }}
                  />
                </p>
              </div>
            ) : null}

            {/* "Create a project" step */}
            {currentStep === 1 ? (
              <form onSubmit={handleCreateProject}>
                <h1 className='max-w-3xl text-5xl/10 tracking-tight text-pretty text-gray-950 max-lg:font-medium dark:text-gray-200'>
                  {t('onboarding.createProject.title')}
                </h1>
                <p className='mt-6 max-w-prose text-base whitespace-pre-line text-gray-800 dark:text-gray-200'>
                  {t('onboarding.createProject.desc')}
                </p>

                <div className='mt-6'>
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

                <div className='mt-6 flex justify-end'>
                  <Button type='submit' loading={isLoading} primary large>
                    {t('common.continue')}
                  </Button>
                </div>
              </form>
            ) : null}

            {/* "Install tracking script" step */}
            {currentStep === 2 && project ? (
              <div>
                <h1 className='max-w-3xl text-5xl/10 tracking-tight text-pretty text-gray-950 max-lg:font-medium dark:text-gray-200'>
                  {t('onboarding.installTracking.title')}
                </h1>
                <p className='mt-6 max-w-prose text-base whitespace-pre-line text-gray-800 dark:text-gray-200'>
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
                </p>

                <div className='mt-8 rounded-lg border border-gray-300 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-800/25'>
                  <div className='flex items-center space-x-3'>
                    <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-800'>
                      <LaptopMinimalIcon className='h-5 w-5 text-gray-900 dark:text-gray-100' />
                    </div>
                    <div>
                      <h3 className='font-medium text-gray-900 dark:text-gray-50'>
                        {t('onboarding.installTracking.websiteInstallation')}
                      </h3>
                      <p className='text-sm text-gray-500 dark:text-gray-400'>
                        {t('onboarding.installTracking.pasteScript')}
                      </p>
                    </div>
                  </div>

                  <p className='mt-4 text-gray-800 dark:text-gray-200'>
                    <Trans
                      t={t}
                      i18nKey='modals.trackingSnippet.add'
                      components={{
                        bsect: <Badge label='<body>' colour='slate' />,
                      }}
                    />
                  </p>

                  <Textarea
                    classes={{
                      container: 'mt-2 font-mono',
                      textarea: 'bg-gray-100 ring-0',
                    }}
                    value={getSnippet(project.id)}
                    rows={15}
                    readOnly
                  />

                  <p className='mt-4 text-sm text-gray-600 dark:text-gray-400'>
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
                  </p>
                </div>

                <div className='mt-6 flex justify-end'>
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
              <div>
                <h1 className='max-w-3xl text-5xl/10 tracking-tight text-pretty text-gray-950 max-lg:font-medium dark:text-gray-200'>
                  {t('onboarding.verifyInstallation.navTitle')}
                </h1>
                <p className='mt-6 max-w-prose text-base whitespace-pre-line text-gray-800 dark:text-gray-200'>
                  {t('onboarding.verifyInstallation.desc')}
                </p>

                <div className='mt-8 rounded-lg border border-gray-300 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-800/25'>
                  {hasEvents ? (
                    <>
                      <div className='flex items-center space-x-3'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-800/30'>
                          <CheckCircleIconSolid className='h-5 w-5 text-green-500' />
                        </div>
                        <div>
                          <h3 className='font-medium text-gray-900 dark:text-gray-50'>
                            {t('onboarding.verifyInstallation.perfect')}
                          </h3>
                          <p className='text-sm text-gray-500 dark:text-gray-400'>
                            {t('onboarding.verifyInstallation.perfectDesc')}
                          </p>
                        </div>
                      </div>

                      <p className='mt-4 text-gray-800 dark:text-gray-200'>
                        {t('onboarding.verifyInstallation.eventReceived')}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className='flex items-center space-x-3'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-800'>
                          <PulsatingCircle type='big' />
                        </div>
                        <div>
                          <h3 className='font-medium text-gray-900 dark:text-gray-50'>
                            {t('onboarding.verifyInstallation.waitingForEvents')}
                          </h3>
                          <p className='text-sm text-gray-500 dark:text-gray-400'>
                            {project?.name
                              ? t('onboarding.verifyInstallation.onTheXProject', { project: project.name })
                              : t('onboarding.verifyInstallation.onYourProject')}
                          </p>
                        </div>
                      </div>
                      <p className='mt-4 text-gray-800 dark:text-gray-200'>
                        {t('onboarding.verifyInstallation.waitingForAnEvent')}
                      </p>

                      <p className='mt-4 text-sm text-gray-600 dark:text-gray-400'>
                        <Trans
                          t={t}
                          i18nKey='onboarding.verifyInstallation.needInstructionsAgain'
                          components={{
                            btn: (
                              <button
                                type='button'
                                onClick={() => {}}
                                className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                              />
                            ),
                          }}
                        />
                      </p>
                      <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
                        <Trans
                          t={t}
                          i18nKey='onboarding.verifyInstallation.orContactUs'
                          components={{
                            url: (
                              <Link
                                to={isSelfhosted ? CONTACT_US_URL : routes.contact}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                              />
                            ),
                          }}
                        />
                      </p>
                    </>
                  )}
                </div>

                <div className='mt-6 flex justify-end gap-3'>
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
                  <Button onClick={handleCompleteOnboarding} primary large>
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

export default withAuthentication(Onboarding, auth.authenticated)
