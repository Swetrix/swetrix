import {
  Popover,
  Transition,
  Menu,
  Disclosure,
  Dialog,
  PopoverButton,
  PopoverPanel,
  MenuButton,
  MenuItem,
  MenuItems,
  DialogPanel,
  DisclosureButton,
  DisclosurePanel,
  PopoverBackdrop,
} from '@headlessui/react'
import { ArrowRightIcon } from '@heroicons/react/20/solid'
import {
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { MoonIcon, SunIcon } from '@heroicons/react/24/solid'
import { SiDiscord, SiGithub, SiYoutube } from '@icons-pack/react-simple-icons'
import cx from 'clsx'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import utc from 'dayjs/plugin/utc'
import { type t as i18nextT } from 'i18next'
import _map from 'lodash/map'
import _startsWith from 'lodash/startsWith'
import {
  GaugeIcon,
  ChartPieIcon,
  BugIcon,
  PuzzleIcon,
  PhoneIcon,
} from 'lucide-react'
import { memo, Fragment, useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { changeLanguage } from '~/i18n'
import {
  whitelist,
  languages,
  languageFlag,
  isSelfhosted,
  DOCS_URL,
  DISCORD_URL,
  GITHUB_URL,
  isDisableMarketingPages,
  API_URL,
} from '~/lib/constants'
import { DashboardBlockReason } from '~/lib/models/User'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
import Flag from '~/ui/Flag'
import SwetrixLogo from '~/ui/icons/SwetrixLogo'
import Modal from '~/ui/Modal'
import routes from '~/utils/routes'

dayjs.extend(utc)
dayjs.extend(duration)

const CONTACT_US_URL = `https://swetrix.com${routes.contact}`

const TRIAL_STATUS_MAPPING = {
  ENDED: 1,
  ENDS_TODAY: 2,
  ENDS_TOMORROW: 3,
  ENDS_IN_X_DAYS: 4,
}

const getSolutions = (t: typeof i18nextT) => [
  {
    name: t('header.solutions.analytics.title'),
    description: t('header.solutions.analytics.desc'),
    link: routes.main,
    icon: ChartPieIcon,
  },
  {
    name: t('header.solutions.performance.title'),
    description: t('header.solutions.performance.desc'),
    link: routes.performance,
    icon: GaugeIcon,
  },
  {
    name: t('header.solutions.errors.title'),
    description: t('header.solutions.errors.desc'),
    link: routes.errorTracking,
    icon: BugIcon,
  },
  {
    name: t('header.solutions.captcha.title'),
    description: t('header.solutions.captcha.desc'),
    link: routes.captchaLanding,
    icon: PuzzleIcon,
  },
]

const getCallsToAction = (t: typeof i18nextT) => [
  {
    name: t('header.watchDemo'),
    link: 'https://www.youtube.com/watch?v=XBp38fZREIE',
    icon: SiYoutube,
  },
  { name: t('header.contactSales'), link: routes.contact, icon: PhoneIcon },
]

const SolutionsMenu = () => {
  const { t } = useTranslation('common')
  const solutions = getSolutions(t)
  const ctas = getCallsToAction(t)

  return (
    <Popover>
      {({ open }) => (
        <>
          <PopoverButton className='underline-animate inline-flex items-center gap-x-1 text-base leading-6 font-semibold text-slate-800 focus:outline-hidden dark:text-white'>
            <span>{t('header.solutions.title')}</span>
            <ChevronDownIcon
              className={cx('h-3 w-3 stroke-2 transition-transform', {
                'rotate-180': open,
              })}
              aria-hidden='true'
            />
          </PopoverButton>

          <PopoverBackdrop className='fixed inset-0 z-30 bg-transparent' />
          <Transition
            as={Fragment}
            enter='transition-all ease-out duration-200'
            enterFrom='opacity-0 translate-y-1'
            enterTo='opacity-100 translate-y-0'
            leave='transition-all ease-in duration-150'
            leaveFrom='opacity-100 translate-y-0'
            leaveTo='opacity-0 translate-y-1'
          >
            <PopoverPanel className='absolute z-40 mt-4 flex w-screen max-w-max backdrop-blur-md'>
              <div className='flex w-[650px] flex-col divide-y divide-gray-300/80 rounded-lg border border-gray-300/80 bg-gray-50/50 p-1.5 dark:divide-slate-700/60 dark:border-slate-700/60 dark:bg-slate-900/50'>
                <div className='grid w-full grid-cols-2 gap-1 p-4'>
                  {_map(solutions, (item) => (
                    <div
                      key={item.name}
                      className='group relative flex gap-x-2 rounded-lg p-2 transition-colors hover:bg-gray-400/20 dark:hover:bg-slate-700/50'
                    >
                      <item.icon
                        className='mt-1 h-5 w-5 text-gray-600 dark:text-gray-300'
                        aria-hidden='true'
                        strokeWidth={1.5}
                      />
                      <div>
                        {_startsWith(item.link, '/') ? (
                          <Link
                            to={item.link}
                            className='text-sm font-semibold text-gray-900 dark:text-gray-50'
                          >
                            {item.name}
                            <span className='absolute inset-0' />
                          </Link>
                        ) : (
                          <a
                            href={item.link}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-sm font-semibold text-gray-900 dark:text-gray-50'
                          >
                            {item.name}
                            <span className='absolute inset-0' />
                          </a>
                        )}

                        <p className='mt-1 text-xs text-gray-600 dark:text-neutral-100'>
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className='grid grid-cols-2 gap-1 px-4 py-2'>
                  {_map(ctas, (item) => {
                    if (_startsWith(item.link, '/')) {
                      return (
                        <Link
                          key={item.name}
                          to={item.link}
                          className='flex items-center justify-center gap-x-2 rounded-lg p-3 text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'
                        >
                          <item.icon
                            className='h-5 w-5 flex-none text-gray-600 dark:text-gray-300'
                            aria-hidden='true'
                            strokeWidth={1.5}
                          />
                          {item.name}
                        </Link>
                      )
                    }

                    return (
                      <a
                        key={item.name}
                        href={item.link}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='flex items-center justify-center gap-x-2 rounded-lg p-3 text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'
                      >
                        <item.icon
                          className='h-5 w-5 flex-none text-gray-600 dark:text-gray-300'
                          aria-hidden='true'
                          strokeWidth={1.5}
                        />
                        {item.name}
                      </a>
                    )
                  })}
                </div>
              </div>
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  )
}

const ProfileMenu = ({ logoutHandler }: { logoutHandler: () => void }) => {
  const { user } = useAuth()
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  return (
    <Menu as='div' className='relative ml-3'>
      {({ open }) => (
        <>
          <div>
            <MenuButton className='underline-animate flex items-center justify-center text-base leading-6 font-semibold text-slate-800 focus:outline-hidden dark:text-white'>
              <span>{t('common.account')}</span>
              <ChevronDownIcon
                className={cx(
                  'ml-1 h-4 w-4 transform-gpu stroke-2 transition-transform',
                  {
                    'rotate-180': open,
                  },
                )}
                aria-hidden='true'
              />
            </MenuButton>
          </div>
          <MenuItems
            className='absolute right-0 z-30 mt-2 w-60 min-w-max origin-top-right rounded-md bg-white p-1 ring-1 ring-slate-200 transition duration-200 ease-out focus:outline-hidden data-closed:scale-95 data-closed:opacity-0 dark:bg-slate-900 dark:ring-slate-800'
            transition
            modal={false}
          >
            <p className='truncate p-2' role='none'>
              <span
                className='block text-xs text-gray-500 dark:text-gray-300'
                role='none'
              >
                {t('header.signedInAs')}
              </span>
              <span
                className='mt-0.5 text-sm font-semibold text-gray-700 dark:text-gray-50'
                role='none'
              >
                {user?.email}
              </span>
            </p>
            <div className='my-0.5 w-full border-b-[1px] border-gray-200 dark:border-slate-700/50' />

            {/* Language selector */}
            <Disclosure>
              {({ open }) => (
                <>
                  <DisclosureButton className='flex w-full justify-between rounded-md p-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-800/60'>
                    <div className='flex'>
                      <Flag
                        className='mr-1.5 rounded-xs'
                        country={languageFlag[language]}
                        size={20}
                        alt=''
                        aria-hidden='true'
                      />
                      {languages[language]}
                    </div>
                    <ChevronDownIcon
                      className={cx(
                        open ? 'rotate-180' : '',
                        '-mr-1 ml-2 h-5 w-5 transform-gpu stroke-2 transition-transform',
                      )}
                      aria-hidden='true'
                    />
                  </DisclosureButton>

                  <Transition
                    show={open}
                    as={Fragment}
                    enter='transition ease-out duration-100'
                    enterFrom='transform opacity-0 scale-95'
                    enterTo='transform opacity-100 scale-100'
                    leave='transition ease-in duration-75'
                    leaveFrom='transform opacity-100 scale-100'
                    leaveTo='transform opacity-0 scale-95'
                  >
                    <DisclosurePanel
                      className='absolute right-0 z-50 w-full min-w-max origin-top-right rounded-md bg-white p-1 ring-1 ring-slate-200 focus:outline-hidden dark:bg-slate-800 dark:ring-slate-800'
                      static
                    >
                      {_map(whitelist, (lng) => (
                        <DisclosureButton
                          key={lng}
                          as='span'
                          className='block cursor-pointer rounded-md p-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-gray-600'
                          onClick={() => changeLanguage(lng)}
                        >
                          <div className='flex'>
                            <div className='pt-1'>
                              <Flag
                                className='mr-1.5 rounded-xs'
                                country={languageFlag[lng]}
                                size={20}
                                alt={languageFlag[lng]}
                              />
                            </div>
                            {languages[lng]}
                          </div>
                        </DisclosureButton>
                      ))}
                    </DisclosurePanel>
                  </Transition>
                </>
              )}
            </Disclosure>

            {isSelfhosted ? (
              <MenuItem>
                <a
                  href={CONTACT_US_URL}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='block rounded-md p-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-800/60'
                >
                  {t('footer.support')}
                </a>
              </MenuItem>
            ) : (
              <MenuItem>
                <Link
                  to={routes.contact}
                  className='block rounded-md p-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-800/60'
                >
                  {t('footer.support')}
                </Link>
              </MenuItem>
            )}
            {!isSelfhosted ? (
              <MenuItem>
                <Link
                  to={routes.billing}
                  className='block rounded-md p-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-800/60'
                >
                  {t('common.billing')}
                </Link>
              </MenuItem>
            ) : null}

            <div className='my-0.5 w-full border-b-[1px] border-gray-200 dark:border-slate-700/50' />

            <MenuItem>
              <Link
                to={routes.user_settings}
                className='block rounded-md p-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-800/60'
              >
                {t('common.accountSettings')}
              </Link>
            </MenuItem>
            {!isSelfhosted ? (
              <MenuItem>
                <Link
                  to={routes.organisations}
                  className='block rounded-md p-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-800/60'
                >
                  {t('organisations.organisations')}
                </Link>
              </MenuItem>
            ) : null}
            <MenuItem>
              <button
                type='button'
                className='w-full rounded-md p-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-800/60'
                onClick={logoutHandler}
              >
                {t('common.logout')}
              </button>
            </MenuItem>
          </MenuItems>
        </>
      )}
    </Menu>
  )
}

const Separator = () => (
  <svg viewBox='0 0 2 2' className='h-0.5 w-0.5 flex-none fill-gray-400'>
    <circle cx={1} cy={1} r={1} />
  </svg>
)

const SelfhostedCommunityLinks = () => (
  <span className='flex items-center gap-2'>
    <a
      href={DISCORD_URL}
      className='inline-flex items-center rounded-md p-1 text-slate-700 transition-colors hover:text-slate-900 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:text-gray-200 dark:hover:text-white'
      target='_blank'
      rel='noreferrer noopener'
    >
      <span className='sr-only'>Discord</span>
      <SiDiscord className='h-5 w-5' aria-hidden='true' />
    </a>
    <a
      href={GITHUB_URL}
      className='inline-flex items-center rounded-md p-1 text-slate-700 transition-colors hover:text-slate-900 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:text-gray-200 dark:hover:text-white'
      target='_blank'
      rel='noreferrer noopener'
    >
      <span className='sr-only'>GitHub</span>
      <SiGithub className='h-5 w-5' aria-hidden='true' />
    </a>
  </span>
)

interface TrialBannerProps {
  status: string | null
  rawStatus: number | null
}

const TrialBanner = ({ status, rawStatus }: TrialBannerProps) => {
  const { t } = useTranslation('common')

  return (
    <div className='header-banner w-full bg-slate-900 text-gray-100 dark:bg-slate-800/70'>
      <div className='mx-auto max-w-7xl px-4 py-2 text-center text-sm sm:px-6 lg:px-8'>
        <span className='font-medium'>{status}</span>
        <span className='mx-1.5'>—</span>
        <Link to={routes.billing} className='font-semibold underline'>
          {t('header.trialBanner.pickAPlan')}
        </Link>
        <span className='ml-1.5'>
          {rawStatus === TRIAL_STATUS_MAPPING.ENDED
            ? t('header.trialBanner.keepUsingEnded')
            : t('header.trialBanner.keepUsing')}
        </span>
      </div>
    </div>
  )
}

const DashboardLockedBanner = () => {
  const { t } = useTranslation('common')
  const { user } = useAuth()
  const [showMoreInfoModal, setShowMoreInfoModal] = useState(false)

  const dashboardBlockReason = user?.dashboardBlockReason

  const message = useMemo(() => {
    if (dashboardBlockReason === DashboardBlockReason.exceeding_plan_limits) {
      return t('project.locked.descExceedingTier')
    }
    if (dashboardBlockReason === DashboardBlockReason.trial_ended) {
      return t('project.locked.descTialEnded')
    }
    if (dashboardBlockReason === DashboardBlockReason.payment_failed) {
      return t('project.locked.descPaymentFailed')
    }
    if (dashboardBlockReason === DashboardBlockReason.subscription_cancelled) {
      return t('project.locked.descSubCancelled')
    }
  }, [t, dashboardBlockReason])

  return (
    <>
      <div className='header-banner w-full bg-amber-500 text-gray-50'>
        <div className='mx-auto max-w-7xl space-x-2 px-4 py-2 text-center text-sm sm:px-6 lg:px-8'>
          <span>{t('dashboard.accountLocked')}</span>
          <button
            type='button'
            onClick={() => setShowMoreInfoModal(true)}
            className='rounded-md bg-slate-100 px-2 py-0.5 font-medium text-gray-900'
          >
            {t('common.learnMore')}
          </button>
        </div>
      </div>
      <Modal
        onClose={() => setShowMoreInfoModal(false)}
        closeText={t('common.close')}
        title={t('dashboard.accountLockedTitle')}
        message={
          <span>
            {message}
            <br />
            <br />
            {t('project.locked.resolve')}
          </span>
        }
        type='warning'
        isOpened={showMoreInfoModal}
        customButtons={
          <Link
            to={routes.billing}
            onClick={() => setShowMoreInfoModal(false)}
            className='inline-flex w-full justify-center rounded-md bg-indigo-600 px-4 py-2 text-base font-medium text-white transition-colors hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm'
          >
            {t('main.goToBilling')}
          </Link>
        }
      />
    </>
  )
}

const SelfhostedCantReachAPIBanner = () => {
  const { t } = useTranslation('common')

  return (
    <div className='header-banner w-full bg-amber-500 text-gray-50'>
      <div className='mx-auto max-w-7xl space-x-2 px-4 py-2 text-center text-sm sm:px-6 lg:px-8'>
        <span>{t('ce.cantReachBackend')}</span>
      </div>
    </div>
  )
}

const BannerManager = () => {
  const { t } = useTranslation('common')
  const { user, isAuthenticated } = useAuth()
  const [
    showSelfhostedCantReachAPIBanner,
    setShowSelfhostedCantReachAPIBanner,
  ] = useState(false)

  useEffect(() => {
    const checkApiUrl = async () => {
      const response = await fetch(`${API_URL}ping`)
      if (!response.ok) {
        setShowSelfhostedCantReachAPIBanner(true)
      }
    }

    checkApiUrl()
  }, [])

  const [rawStatus, status] = useMemo(() => {
    const { trialEndDate } = user || {}

    if (!trialEndDate) {
      return [null, null]
    }

    const now = dayjs.utc()
    const future = dayjs.utc(trialEndDate)
    const diff = future.diff(now)

    if (diff < 0) {
      // trial has already ended
      return [TRIAL_STATUS_MAPPING.ENDED, t('header.trialBanner.ended')]
    }

    if (diff < dayjs.duration(1, 'day').asMilliseconds()) {
      // trial ends today or tomorrow
      const isToday = future.isSame(now, 'day')
      const isTomorrow = future.isSame(now.add(1, 'day'), 'day')

      if (isToday) {
        return [
          TRIAL_STATUS_MAPPING.ENDS_TODAY,
          t('header.trialBanner.endsToday'),
        ]
      }
      if (isTomorrow) {
        return [
          TRIAL_STATUS_MAPPING.ENDS_TOMORROW,
          t('header.trialBanner.endsTomorrow'),
        ]
      }
    }

    // trial ends in more than 1 day
    const amount = Math.round(dayjs.duration(diff).asDays())
    return [
      TRIAL_STATUS_MAPPING.ENDS_IN_X_DAYS,
      t('header.trialBanner.youHaveXDaysLeft', { amount }),
    ]
  }, [user, t])

  const trialBannerHidden = useMemo(() => {
    return (
      !status ||
      isSelfhosted ||
      !isAuthenticated ||
      !['none', 'trial'].includes(user?.planCode || '')
    )
  }, [status, isAuthenticated, user?.planCode])

  if (showSelfhostedCantReachAPIBanner) {
    return <SelfhostedCantReachAPIBanner />
  }

  if (!trialBannerHidden) {
    return <TrialBanner status={status} rawStatus={rawStatus} />
  }

  if (user?.dashboardBlockReason) {
    return <DashboardLockedBanner />
  }

  return null
}

const AuthedHeader = ({
  logoutHandler,
  colourBackground,
  openMenu,
}: {
  logoutHandler: () => void
  colourBackground: boolean
  openMenu: () => void
}) => {
  const { t } = useTranslation('common')

  return (
    <header
      className={cx('relative overflow-x-clip', {
        'border-b border-gray-200 bg-gray-50 dark:border-slate-600/40 dark:bg-slate-900':
          colourBackground,
      })}
    >
      <nav className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8' aria-label='Top'>
        <div className='flex w-full items-center justify-between py-4'>
          <div className='flex items-center'>
            {/* Logo */}
            <Link to={routes.main}>
              <SwetrixLogo />
            </Link>

            <div className='ml-10 hidden gap-4 space-x-1 lg:flex'>
              {!isSelfhosted && !isDisableMarketingPages ? (
                <SolutionsMenu />
              ) : null}
              {isSelfhosted ? <SelfhostedCommunityLinks /> : null}
              <a
                href={DOCS_URL}
                className='underline-animate text-base leading-6 font-semibold text-slate-800 focus:outline-hidden dark:text-white'
                target='_blank'
                rel='noreferrer noopener'
              >
                {t('common.docs')}
              </a>
              <Link
                to={routes.dashboard}
                className='underline-animate text-base leading-6 font-semibold text-slate-800 focus:outline-hidden dark:text-white'
              >
                {t('common.dashboard')}
              </Link>
            </div>
          </div>
          <div className='ml-1 hidden flex-wrap items-center justify-center space-y-1 space-x-2 sm:space-y-0 lg:ml-10 lg:flex lg:space-x-4'>
            <ProfileMenu logoutHandler={logoutHandler} />
          </div>
          <div className='flex items-center justify-center space-x-3 lg:hidden'>
            <button
              type='button'
              onClick={openMenu}
              className='rounded-md p-1 text-slate-700 transition-colors hover:bg-gray-400/20 hover:text-slate-600 dark:text-gray-200 dark:hover:bg-slate-700/50 dark:hover:text-gray-300'
            >
              <span className='sr-only'>{t('common.openMenu')}</span>
              <Bars3Icon className='h-8 w-8 flex-none' aria-hidden='true' />
            </button>
          </div>
        </div>
      </nav>
    </header>
  )
}

const NotAuthedHeader = ({
  colourBackground,
  refPage,
  openMenu,
}: {
  colourBackground: boolean
  refPage?: boolean
  openMenu: () => void
}) => {
  const { t } = useTranslation('common')

  return (
    <header
      className={cx('relative overflow-x-clip', {
        'border-b border-gray-200 bg-gray-50 dark:border-slate-600/40 dark:bg-slate-900':
          colourBackground,
      })}
    >
      <nav className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8' aria-label='Top'>
        <div className='flex w-full items-center justify-between py-4'>
          <div className='flex items-center'>
            {/* Logo */}
            {refPage ? (
              <SwetrixLogo />
            ) : (
              <Link to={routes.main}>
                <SwetrixLogo />
              </Link>
            )}

            {!refPage ? (
              <div className='ml-10 hidden items-center gap-4 space-x-1 lg:flex'>
                {!isSelfhosted && !isDisableMarketingPages ? (
                  <SolutionsMenu />
                ) : null}
                {!isSelfhosted && !isDisableMarketingPages ? (
                  <Link
                    to={`${routes.main}#pricing`}
                    className='underline-animate text-base leading-6 font-semibold text-slate-800 focus:outline-hidden dark:text-white'
                    key='Pricing'
                  >
                    {t('common.pricing')}
                  </Link>
                ) : null}
                {isSelfhosted ? <SelfhostedCommunityLinks /> : null}
                <a
                  href={DOCS_URL}
                  className='underline-animate text-base leading-6 font-semibold text-slate-800 focus:outline-hidden dark:text-white'
                  target='_blank'
                  rel='noreferrer noopener'
                >
                  {t('common.docs')}
                </a>
              </div>
            ) : null}
          </div>
          <div className='ml-1 hidden flex-wrap items-center justify-center space-y-1 space-x-2 sm:space-y-0 lg:ml-10 lg:flex lg:space-x-4'>
            {!refPage ? (
              <>
                <Link
                  to={routes.signin}
                  className='underline-animate flex items-center text-base leading-6 font-semibold text-slate-800 dark:text-white'
                >
                  {t('auth.common.signin')}
                </Link>
                <Separator />
                <Link
                  to={routes.signup}
                  className='underline-animate flex items-center text-base leading-6 font-semibold text-slate-800 dark:text-white'
                >
                  {isSelfhosted ? t('header.signUp') : t('header.startForFree')}
                  <ArrowRightIcon className='mt-[1px] ml-1 h-4 w-4 stroke-2' />
                </Link>
              </>
            ) : null}
          </div>
          <div className='flex items-center justify-center space-x-3 lg:hidden'>
            <button
              type='button'
              onClick={openMenu}
              className='rounded-md p-1 text-slate-700 transition-colors hover:bg-gray-400/20 hover:text-slate-600 dark:text-gray-200 dark:hover:bg-slate-700/50 dark:hover:text-gray-300'
            >
              <span className='sr-only'>{t('common.openMenu')}</span>
              <Bars3Icon className='h-8 w-8 flex-none' aria-hidden='true' />
            </button>
          </div>
        </div>
      </nav>
    </header>
  )
}

interface HeaderProps {
  refPage?: boolean
  transparent?: boolean
}

const Header = ({ refPage, transparent }: HeaderProps) => {
  const { t } = useTranslation('common')
  const { isAuthenticated, user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  const solutions = getSolutions(t)

  const logoutHandler = () => {
    setMobileMenuOpen(false)
    logout()
  }

  const openMenu = () => {
    setMobileMenuOpen(true)
  }

  return (
    <Popover>
      <BannerManager />

      {/* Computer / Laptop / Tablet layout header */}
      {isAuthenticated ? (
        <AuthedHeader
          logoutHandler={logoutHandler}
          colourBackground={!transparent}
          openMenu={openMenu}
        />
      ) : (
        <NotAuthedHeader
          colourBackground={!transparent}
          refPage={refPage}
          openMenu={openMenu}
        />
      )}

      {/* Mobile header popup */}
      <Dialog
        className='lg:hidden'
        open={mobileMenuOpen}
        onClose={setMobileMenuOpen}
      >
        <div className='fixed inset-0 z-10' />
        <DialogPanel className='fixed inset-y-0 top-0 right-0 z-30 w-full overflow-y-auto border-gray-300/80 bg-gray-100/80 p-4 backdrop-blur-2xl sm:max-w-sm sm:border dark:border-slate-900/80 dark:bg-slate-800/80'>
          <div className='flex items-center justify-between'>
            <SwetrixLogo />
            <div className='flex items-center justify-center space-x-3'>
              {/* Theme switch */}
              {theme === 'dark' ? (
                <button
                  type='button'
                  onClick={() => setTheme('light')}
                  className='rounded-md p-1 text-slate-700 transition-colors hover:bg-gray-400/20 hover:text-slate-600 dark:text-gray-200 dark:hover:bg-slate-700/50 dark:hover:text-gray-300'
                  aria-label={t('header.light')}
                >
                  <SunIcon className='h-8 w-8 flex-none' aria-hidden='true' />
                </button>
              ) : (
                <button
                  type='button'
                  onClick={() => setTheme('dark')}
                  className='rounded-md p-1 text-slate-700 transition-colors hover:bg-gray-400/20 hover:text-slate-600 dark:text-gray-200 dark:hover:bg-slate-700/50 dark:hover:text-gray-300'
                  aria-label={t('header.dark')}
                >
                  <MoonIcon className='h-8 w-8 flex-none' aria-hidden='true' />
                </button>
              )}
              <button
                type='button'
                onClick={() => setMobileMenuOpen(false)}
                className='rounded-md p-1 text-slate-700 transition-colors hover:bg-gray-400/20 hover:text-slate-600 dark:text-gray-200 dark:hover:bg-slate-700/50 dark:hover:text-gray-300'
              >
                <span className='sr-only'>{t('common.close')}</span>
                <XMarkIcon className='h-8 w-8 flex-none' aria-hidden='true' />
              </button>
            </div>
          </div>
          <div className='mt-6 flow-root'>
            <div className='-my-6 divide-y divide-gray-500/10'>
              <div className='space-y-2 py-6'>
                {!isSelfhosted ? (
                  <Disclosure as='div' className='-mx-3'>
                    {({ open }) => (
                      <>
                        <DisclosureButton className='flex w-full items-center justify-between rounded-lg py-2 pr-3.5 pl-3 text-base leading-7 font-semibold text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'>
                          {t('header.solutions.title')}
                          <ChevronDownIcon
                            className={cx(
                              open ? 'rotate-180' : '',
                              'h-5 w-5 flex-none',
                            )}
                            aria-hidden='true'
                          />
                        </DisclosureButton>
                        <Transition
                          show={open}
                          as={Fragment}
                          enter='transition transform ease-out duration-200'
                          enterFrom='opacity-0 -translate-y-2'
                          enterTo='opacity-100 translate-y-0'
                          leave='transition transform ease-in duration-150'
                          leaveFrom='opacity-100 translate-y-0'
                          leaveTo='opacity-0 -translate-y-2'
                        >
                          <DisclosurePanel className='mt-2 space-y-2'>
                            {_map(solutions, (item) => (
                              <DisclosureButton
                                key={item.name}
                                as='div'
                                className='group relative flex gap-x-2 rounded-lg p-2 transition-colors hover:bg-gray-400/20 dark:hover:bg-slate-700/50'
                              >
                                <item.icon
                                  className='mt-1 h-5 w-5 text-gray-600 dark:text-gray-300'
                                  aria-hidden='true'
                                />
                                <div>
                                  {_startsWith(item.link, '/') ? (
                                    <Link
                                      to={item.link}
                                      onClick={() => setMobileMenuOpen(false)}
                                      className='text-sm font-semibold text-gray-900 dark:text-gray-50'
                                    >
                                      {item.name}
                                      <span className='absolute inset-0' />
                                    </Link>
                                  ) : (
                                    <a
                                      href={item.link}
                                      onClick={() => setMobileMenuOpen(false)}
                                      target='_blank'
                                      rel='noopener noreferrer'
                                      className='text-sm font-semibold text-gray-900 dark:text-gray-50'
                                    >
                                      {item.name}
                                      <span className='absolute inset-0' />
                                    </a>
                                  )}

                                  <p className='mt-1 text-xs text-gray-600 dark:text-neutral-100'>
                                    {item.description}
                                  </p>
                                </div>
                              </DisclosureButton>
                            ))}
                          </DisclosurePanel>
                        </Transition>
                      </>
                    )}
                  </Disclosure>
                ) : null}
                {!isSelfhosted &&
                isAuthenticated &&
                user?.planCode !== 'none' &&
                user?.planCode !== 'trial' ? (
                  <Link
                    to={routes.billing}
                    onClick={() => setMobileMenuOpen(false)}
                    className='-mx-3 block rounded-lg px-3 py-2 text-base leading-7 font-semibold text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'
                    key='Billing'
                  >
                    {t('common.billing')}
                  </Link>
                ) : null}
                {!isSelfhosted &&
                !isDisableMarketingPages &&
                !isAuthenticated ? (
                  <Link
                    to={`${routes.main}#pricing`}
                    onClick={() => setMobileMenuOpen(false)}
                    className='-mx-3 block rounded-lg px-3 py-2 text-base leading-7 font-semibold text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'
                    key='Pricing'
                  >
                    {t('common.pricing')}
                  </Link>
                ) : null}
                {isSelfhosted ? (
                  <div className='-mx-3 flex items-center gap-3 px-3 py-2'>
                    <SelfhostedCommunityLinks />
                  </div>
                ) : null}
                <a
                  href={DOCS_URL}
                  onClick={() => setMobileMenuOpen(false)}
                  className='-mx-3 block rounded-lg px-3 py-2 text-base leading-7 font-semibold text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'
                  target='_blank'
                  rel='noreferrer noopener'
                >
                  {t('common.docs')}
                </a>
                {isAuthenticated ? (
                  <Link
                    to={routes.dashboard}
                    onClick={() => setMobileMenuOpen(false)}
                    className='-mx-3 block rounded-lg px-3 py-2 text-base leading-7 font-semibold text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'
                  >
                    {t('common.dashboard')}
                  </Link>
                ) : null}
              </div>
              <div className='space-y-2 py-6'>
                {isAuthenticated ? (
                  <>
                    <Link
                      to={routes.user_settings}
                      onClick={() => setMobileMenuOpen(false)}
                      className='-mx-3 block rounded-lg px-3 py-2 text-base leading-7 font-semibold text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'
                    >
                      {t('common.accountSettings')}
                    </Link>
                    {!isSelfhosted ? (
                      <Link
                        to={routes.organisations}
                        onClick={() => setMobileMenuOpen(false)}
                        className='-mx-3 block rounded-lg px-3 py-2 text-base leading-7 font-semibold text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'
                      >
                        {t('organisations.organisations')}
                      </Link>
                    ) : null}
                    <span
                      className='-mx-3 block rounded-lg px-3 py-2 text-base leading-7 font-semibold text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'
                      onClick={logoutHandler}
                    >
                      {t('common.logout')}
                    </span>
                  </>
                ) : (
                  <>
                    <Link
                      to={routes.signin}
                      onClick={() => setMobileMenuOpen(false)}
                      className='-mx-3 block rounded-lg px-3 py-2 text-base leading-7 font-semibold text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'
                    >
                      {t('auth.common.signin')}
                    </Link>
                    <Link
                      to={routes.signup}
                      onClick={() => setMobileMenuOpen(false)}
                      className='-mx-3 block rounded-lg px-3 py-2 text-base leading-7 font-semibold text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'
                      aria-label={t('titles.signup')}
                    >
                      {isSelfhosted
                        ? t('header.signUp')
                        : t('header.startForFree')}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogPanel>
      </Dialog>
    </Popover>
  )
}

export default memo(Header)
