import {
  Popover,
  Transition,
  Menu,
  Disclosure,
  Dialog,
  MenuButton,
  MenuItem,
  MenuItems,
  DialogPanel,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react'
import cx from 'clsx'
import { type t as i18nextT } from 'i18next'
import _map from 'lodash/map'
import _startsWith from 'lodash/startsWith'
import {
  GaugeIcon,
  WarningIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  ArrowsLeftRightIcon,
  ListIcon,
  XIcon,
  CaretDownIcon,
  MoonIcon,
  SunIcon,
  GithubLogoIcon,
  YoutubeLogoIcon,
  DiscordLogoIcon,
  EnvelopeIcon,
  ChartBarIcon,
  LifebuoyIcon,
  CreditCardIcon,
  GearIcon,
  BuildingsIcon,
  SignOutIcon,
  SignInIcon,
  UserPlusIcon,
  SquaresFourIcon,
  TagIcon,
  BookOpenIcon,
  ChatTextIcon,
} from '@phosphor-icons/react'
import { memo, Fragment, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '~/ui/Link'

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
} from '~/lib/constants'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
import Flag from '~/ui/Flag'
import FeedbackModal from '~/components/FeedbackModal'
import SwetrixLogo from '~/ui/icons/SwetrixLogo'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'
import { cn } from '~/utils/generic'
import { BannerManager } from './banners'
import { SOLUTION_VISUALS } from './solutionIllustrations'

const CONTACT_US_URL = `https://swetrix.com${routes.contact}`

const getSolutions = (t: typeof i18nextT) => [
  {
    name: t('header.solutions.analytics.title'),
    description: t('header.solutions.analytics.desc'),
    link: routes.main,
    icon: ChartBarIcon,
    className: 'text-indigo-500 dark:text-indigo-400',
  },
  {
    name: t('header.solutions.performance.title'),
    description: t('header.solutions.performance.desc'),
    link: routes.performance,
    icon: GaugeIcon,
    className: 'text-amber-500 dark:text-amber-400',
  },
  {
    name: t('header.solutions.errors.title'),
    description: t('header.solutions.errors.desc'),
    link: routes.errorTracking,
    icon: WarningIcon,
    className: 'text-red-500 dark:text-red-400',
  },
  {
    name: t('header.solutions.captcha.title'),
    description: t('header.solutions.captcha.desc'),
    link: routes.captchaLanding,
    icon: ShieldCheckIcon,
    className: 'text-emerald-500 dark:text-emerald-400',
  },
]

const getMoreSolutions = (t: typeof i18nextT) => [
  {
    name: t('header.solutions.gaAlternative.title'),
    description: t('header.solutions.gaAlternative.desc'),
    link: routes.gaAlternative,
    icon: ArrowsLeftRightIcon,
    className: 'text-amber-500 dark:text-amber-400',
  },
  {
    name: t('header.solutions.agencies.title'),
    description: t('header.solutions.agencies.desc'),
    link: routes.agencies,
    icon: BuildingsIcon,
    className: 'text-sky-500 dark:text-sky-400',
  },
]

const getCallsToAction = (t: typeof i18nextT) => [
  {
    name: t('header.watchDemo'),
    link: 'https://www.youtube.com/watch?v=XBp38fZREIE',
    icon: YoutubeLogoIcon,
    className: 'text-red-500 dark:text-red-400',
  },
  {
    name: t('header.contactSales'),
    link: routes.contact,
    icon: EnvelopeIcon,
    className: 'text-blue-500 dark:text-blue-400',
  },
]

interface SolutionItem {
  name: string
  description: string
  link: string
  icon: typeof ChartBarIcon
  className: string
}

type FooterItem = Pick<SolutionItem, 'name' | 'link' | 'icon' | 'className'>

const SolutionCard = ({ item }: { item: SolutionItem }) => {
  const visual = SOLUTION_VISUALS[item.link]
  const isInternal = _startsWith(item.link, '/')

  const className =
    'group/card relative flex flex-col rounded-xl p-2 ring-1 ring-transparent transition-[box-shadow,background-color] duration-200 ease-out hover:bg-gray-50 hover:ring-gray-200/80 motion-reduce:transition-none dark:hover:bg-slate-800/40 dark:hover:ring-slate-700/60'

  const inner = (
    <>
      <div
        className={cn(
          'relative h-28 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200/70 dark:bg-slate-800 dark:ring-slate-700/60',
          'grayscale transition-[filter] duration-500 ease-out group-hover/card:grayscale-0',
          'motion-reduce:transition-none',
        )}
      >
        {visual ? (
          <>
            <img
              src={visual.bg}
              alt=''
              loading='lazy'
              className='absolute inset-0 size-full object-cover'
            />
            <visual.Mockup />
          </>
        ) : null}
      </div>
      <h3 className='flex items-start gap-1.5 px-1 pt-3 text-[13px] leading-5 font-semibold text-gray-900 dark:text-gray-50'>
        <item.icon
          className={cn(
            'mt-0.5 size-4 shrink-0 text-gray-400 transition-colors duration-300 dark:text-gray-500',
            visual?.accentIcon,
          )}
          aria-hidden='true'
          weight='duotone'
        />
        {item.name}
      </h3>
      <Text
        as='p'
        size='xs'
        className='px-1 pt-1 text-gray-600 dark:text-gray-400'
      >
        {item.description}
      </Text>
    </>
  )

  return isInternal ? (
    <Link to={item.link} className={className}>
      {inner}
    </Link>
  ) : (
    <a
      href={item.link}
      target='_blank'
      rel='noopener noreferrer'
      className={className}
    >
      {inner}
    </a>
  )
}

const FooterLink = ({
  item,
  emphasis,
}: {
  item: FooterItem
  emphasis?: boolean
}) => {
  const content = (
    <>
      <item.icon
        className={cn('size-4 shrink-0', item.className)}
        aria-hidden='true'
        weight='duotone'
      />
      <span>{item.name}</span>
    </>
  )
  const className = cn(
    'inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[13px] font-medium transition-colors',
    emphasis
      ? 'text-gray-900 hover:bg-gray-100 dark:text-gray-50 dark:hover:bg-slate-800/60'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800/60 dark:hover:text-gray-100',
  )

  return _startsWith(item.link, '/') ? (
    <Link to={item.link} className={className}>
      {content}
    </Link>
  ) : (
    <a
      href={item.link}
      target='_blank'
      rel='noopener noreferrer'
      className={className}
    >
      {content}
    </a>
  )
}

const SolutionsMenu = ({ inverted }: { inverted?: boolean }) => {
  const { t } = useTranslation('common')
  const solutions = getSolutions(t)
  const moreSolutions = getMoreSolutions(t)
  const ctas = getCallsToAction(t)
  const [open, setOpen] = useState(false)
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )

  const handleOpen = () => {
    clearTimeout(closeTimeout.current)
    setOpen(true)
  }

  const handleClose = () => {
    closeTimeout.current = setTimeout(() => setOpen(false), 50)
  }

  const handleBlur = (e: React.FocusEvent) => {
    if (e.currentTarget.contains(e.relatedTarget)) return
    handleClose()
  }

  return (
    <div
      className='relative'
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
      onFocus={handleOpen}
      onBlur={handleBlur}
    >
      <button
        type='button'
        className={cn(
          'underline-animate inline-flex items-center gap-x-1 text-base leading-6 font-semibold focus:outline-hidden',
          inverted ? 'text-white' : 'text-slate-800 dark:text-white',
        )}
      >
        <span>{t('header.solutions.title')}</span>
        <CaretDownIcon
          className={cx('size-3 transition-transform', {
            'rotate-180': open,
          })}
          aria-hidden='true'
        />
      </button>

      <Transition
        show={open}
        as={Fragment}
        enter='transition-all ease-out duration-200'
        enterFrom='opacity-0 translate-y-1'
        enterTo='opacity-100 translate-y-0'
        leave='transition-all ease-in duration-150'
        leaveFrom='opacity-100 translate-y-0'
        leaveTo='opacity-0 translate-y-1'
      >
        <div className='absolute left-0 z-40 mt-3 w-[min(50rem,calc(100vw-1.5rem))] xl:w-[56rem]'>
          <div className='overflow-hidden rounded-2xl bg-white/95 ring-1 ring-gray-200/80 backdrop-blur-md dark:bg-slate-950/95 dark:ring-slate-700/60'>
            <div className='grid grid-cols-2 gap-2 p-3 lg:grid-cols-4'>
              {_map(solutions, (item) => (
                <SolutionCard key={item.name} item={item} />
              ))}
            </div>
            <div className='flex flex-col gap-3 border-t border-gray-200/80 bg-gray-50/70 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700/60 dark:bg-slate-900/40'>
              <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
                {_map(moreSolutions, (item) => (
                  <FooterLink key={item.name} item={item} />
                ))}
              </div>
              <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
                {_map(ctas, (item) => (
                  <FooterLink key={item.name} item={item} emphasis />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  )
}

const ProfileMenu = ({
  logoutHandler,
  openFeedback,
  inverted,
}: {
  logoutHandler: () => void
  openFeedback: () => void
  inverted?: boolean
}) => {
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
            <MenuButton
              className={cn(
                'underline-animate flex items-center justify-center text-base leading-6 font-semibold focus:outline-hidden',
                inverted ? 'text-white' : 'text-slate-800 dark:text-white',
              )}
            >
              <span>{t('common.account')}</span>
              <CaretDownIcon
                className={cx(
                  'ml-1 size-4 transform-gpu transition-transform',
                  {
                    'rotate-180': open,
                  },
                )}
                aria-hidden='true'
              />
            </MenuButton>
          </div>
          <MenuItems
            className='absolute right-0 z-30 mt-2 w-60 min-w-max origin-top-right rounded-md bg-white p-1 ring-1 ring-slate-200 transition duration-200 ease-out focus:outline-hidden data-closed:scale-95 data-closed:opacity-0 dark:bg-slate-950 dark:ring-slate-800'
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
                  <DisclosureButton className='flex w-full justify-between rounded-md p-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-900/60'>
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
                    <CaretDownIcon
                      className={cx(
                        open ? 'rotate-180' : '',
                        '-mr-1 ml-2 size-5 transform-gpu transition-transform',
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
                      className='absolute right-0 z-50 w-full min-w-max origin-top-right rounded-md bg-white p-1 ring-1 ring-slate-200 focus:outline-hidden dark:bg-slate-950 dark:ring-slate-700/80'
                      static
                    >
                      {_map(whitelist, (lng) => (
                        <DisclosureButton
                          key={lng}
                          as='span'
                          className='block cursor-pointer rounded-md p-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-900'
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

            {!isSelfhosted ? (
              <MenuItem>
                <Link
                  to={routes.billing}
                  className='flex items-center gap-2 rounded-md p-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-900/60'
                >
                  <CreditCardIcon className='h-4 w-4' />
                  {t('common.billing')}
                </Link>
              </MenuItem>
            ) : null}
            {isSelfhosted ? (
              <MenuItem>
                <a
                  href={CONTACT_US_URL}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center gap-2 rounded-md p-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-900/60'
                >
                  <LifebuoyIcon className='h-4 w-4' />
                  {t('footer.support')}
                </a>
              </MenuItem>
            ) : (
              <MenuItem>
                <Link
                  to={routes.contact}
                  className='flex items-center gap-2 rounded-md p-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-900/60'
                >
                  <LifebuoyIcon className='h-4 w-4' />
                  {t('footer.support')}
                </Link>
              </MenuItem>
            )}
            {!isSelfhosted ? (
              <MenuItem>
                <button
                  type='button'
                  className='flex w-full items-center gap-2 rounded-md p-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-900/60'
                  onClick={openFeedback}
                >
                  <ChatTextIcon className='h-4 w-4' />
                  {t('feedback.giveFeedback')}
                </button>
              </MenuItem>
            ) : null}

            <div className='my-0.5 w-full border-b-[1px] border-gray-200 dark:border-slate-700/50' />

            <MenuItem>
              <Link
                to={routes.user_settings}
                className='flex items-center gap-2 rounded-md p-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-900/60'
              >
                <GearIcon className='h-4 w-4' />
                {t('common.accountSettings')}
              </Link>
            </MenuItem>
            {!isSelfhosted ? (
              <MenuItem>
                <Link
                  to={routes.organisations}
                  className='flex items-center gap-2 rounded-md p-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-900/60'
                >
                  <BuildingsIcon className='h-4 w-4' />
                  {t('organisations.organisations')}
                </Link>
              </MenuItem>
            ) : null}
            <MenuItem>
              <button
                type='button'
                className='flex w-full items-center gap-2 rounded-md p-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-900/60'
                onClick={logoutHandler}
              >
                <SignOutIcon className='h-4 w-4' />
                {t('common.logout')}
              </button>
            </MenuItem>
          </MenuItems>
        </>
      )}
    </Menu>
  )
}

const Separator = ({ inverted }: { inverted?: boolean }) => (
  <svg
    viewBox='0 0 2 2'
    className={cn(
      'h-0.5 w-0.5 flex-none',
      inverted ? 'fill-white/70' : 'fill-gray-400',
    )}
  >
    <circle cx={1} cy={1} r={1} />
  </svg>
)

const CommunityLinks = ({ inverted }: { inverted?: boolean }) => {
  return (
    <span className='flex items-center gap-2'>
      <a
        href={DISCORD_URL}
        className={cn(
          'inline-flex items-center rounded-md p-1 transition-colors focus:outline-hidden focus-visible:ring-2',
          inverted
            ? 'text-white/85 hover:text-white focus-visible:ring-white/70'
            : 'text-indigo-600 hover:text-indigo-500 focus-visible:ring-slate-900/60 dark:text-indigo-400 dark:hover:text-indigo-100 dark:focus-visible:ring-slate-300/60',
        )}
        target='_blank'
        rel='noreferrer noopener'
      >
        <span className='sr-only'>Discord</span>
        <DiscordLogoIcon
          className='h-5 w-5'
          aria-hidden='true'
          weight='duotone'
        />
      </a>
      <a
        href={GITHUB_URL}
        className={cn(
          'inline-flex items-center rounded-md p-1 transition-colors focus:outline-hidden focus-visible:ring-2',
          inverted
            ? 'text-white/85 hover:text-white focus-visible:ring-white/70'
            : 'text-slate-700 hover:text-slate-500 focus-visible:ring-slate-900/60 dark:text-gray-200 dark:hover:text-white dark:focus-visible:ring-slate-300/60',
        )}
        target='_blank'
        rel='noreferrer noopener'
      >
        <span className='sr-only'>GitHub</span>
        <GithubLogoIcon
          className='h-5 w-5'
          aria-hidden='true'
          weight='duotone'
        />
      </a>
    </span>
  )
}

const AuthedHeader = ({
  logoutHandler,
  colourBackground,
  openMenu,
  openFeedback,
  inverted,
}: {
  logoutHandler: () => void
  colourBackground: boolean
  openMenu: () => void
  openFeedback: () => void
  inverted?: boolean
}) => {
  const { t } = useTranslation('common')

  return (
    <header
      className={cx('relative overflow-x-clip', {
        'border-b border-gray-200 bg-gray-50 dark:border-slate-600/40 dark:bg-slate-950':
          colourBackground,
      })}
    >
      <nav className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8' aria-label='Top'>
        <div className='flex w-full items-center justify-between py-4'>
          <div className='flex items-center'>
            {/* Logo */}
            <Link to={routes.main}>
              <SwetrixLogo theme={inverted ? 'dark' : undefined} />
            </Link>

            <div className='ml-10 hidden gap-4 space-x-1 lg:flex'>
              {!isSelfhosted && !isDisableMarketingPages ? (
                <SolutionsMenu inverted={inverted} />
              ) : null}
              <a
                href={DOCS_URL}
                className={cn(
                  'underline-animate text-base leading-6 font-semibold focus:outline-hidden',
                  inverted ? 'text-white' : 'text-slate-800 dark:text-white',
                )}
                target='_blank'
                rel='noreferrer noopener'
              >
                {t('common.docs')}
              </a>
              <Link
                to={routes.dashboard}
                className={cn(
                  'underline-animate text-base leading-6 font-semibold focus:outline-hidden',
                  inverted ? 'text-white' : 'text-slate-800 dark:text-white',
                )}
              >
                {t('common.dashboard')}
              </Link>
            </div>
          </div>
          <div className='ml-1 hidden flex-wrap items-center justify-center space-y-1 space-x-2 sm:space-y-0 lg:ml-10 lg:flex lg:space-x-2'>
            <CommunityLinks inverted={inverted} />
            <ProfileMenu
              logoutHandler={logoutHandler}
              openFeedback={openFeedback}
              inverted={inverted}
            />
          </div>
          <div className='flex items-center justify-center space-x-3 lg:hidden'>
            <button
              type='button'
              onClick={openMenu}
              className={cn(
                'rounded-md p-1 transition-colors hover:bg-gray-400/20 dark:hover:bg-slate-700/50',
                inverted
                  ? 'text-white hover:text-white'
                  : 'text-slate-700 hover:text-slate-600 dark:text-gray-200 dark:hover:text-gray-300',
              )}
              aria-label={t('common.openMenu')}
            >
              <ListIcon className='h-8 w-8 flex-none' aria-hidden='true' />
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
  inverted,
}: {
  colourBackground: boolean
  refPage?: boolean
  openMenu: () => void
  inverted?: boolean
}) => {
  const { t } = useTranslation('common')

  return (
    <header
      className={cx('relative overflow-x-clip', {
        'border-b border-gray-200 bg-gray-50 dark:border-slate-600/40 dark:bg-slate-950':
          colourBackground,
      })}
    >
      <nav className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8' aria-label='Top'>
        <div className='flex w-full items-center justify-between py-4'>
          <div className='flex items-center'>
            {/* Logo */}
            {refPage ? (
              <SwetrixLogo theme={inverted ? 'dark' : undefined} />
            ) : (
              <Link to={routes.main}>
                <SwetrixLogo theme={inverted ? 'dark' : undefined} />
              </Link>
            )}

            {!refPage ? (
              <div className='ml-10 hidden items-center gap-4 space-x-1 lg:flex'>
                {!isSelfhosted && !isDisableMarketingPages ? (
                  <SolutionsMenu inverted={inverted} />
                ) : null}
                {!isSelfhosted && !isDisableMarketingPages ? (
                  <Link
                    to={routes.pricing}
                    className={cn(
                      'underline-animate text-base leading-6 font-semibold focus:outline-hidden',
                      inverted
                        ? 'text-white'
                        : 'text-slate-800 dark:text-white',
                    )}
                    key='Pricing'
                  >
                    {t('common.pricing')}
                  </Link>
                ) : null}
                <a
                  href={DOCS_URL}
                  className={cn(
                    'underline-animate text-base leading-6 font-semibold focus:outline-hidden',
                    inverted ? 'text-white' : 'text-slate-800 dark:text-white',
                  )}
                  target='_blank'
                  rel='noreferrer noopener'
                >
                  {t('common.docs')}
                </a>
                <CommunityLinks inverted={inverted} />
              </div>
            ) : null}
          </div>
          <div className='ml-1 hidden flex-wrap items-center justify-center space-y-1 space-x-2 sm:space-y-0 lg:ml-10 lg:flex lg:space-x-4'>
            {!refPage ? (
              <>
                <Link
                  to={routes.signin}
                  className={cn(
                    'underline-animate flex items-center text-base leading-6 font-semibold',
                    inverted ? 'text-white' : 'text-slate-800 dark:text-white',
                  )}
                >
                  {t('auth.common.signin')}
                </Link>
                <Separator inverted={inverted} />
                <Link
                  to={routes.signup}
                  className={cn(
                    'underline-animate flex items-center text-base leading-6 font-semibold',
                    inverted ? 'text-white' : 'text-slate-800 dark:text-white',
                  )}
                >
                  {isSelfhosted ? t('header.signUp') : t('header.startForFree')}
                  <ArrowRightIcon className='mt-[1px] ml-1 size-4' />
                </Link>
              </>
            ) : null}
          </div>
          <div className='flex items-center justify-center space-x-3 lg:hidden'>
            <button
              type='button'
              onClick={openMenu}
              className={cn(
                'rounded-md p-1 transition-colors hover:bg-gray-400/20 dark:hover:bg-slate-700/50',
                inverted
                  ? 'text-white hover:text-white'
                  : 'text-slate-700 hover:text-slate-600 dark:text-gray-200 dark:hover:text-gray-300',
              )}
              aria-label={t('common.openMenu')}
            >
              <ListIcon className='h-8 w-8 flex-none' aria-hidden='true' />
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
  inverted?: boolean
}

const Header = ({ refPage, transparent, inverted }: HeaderProps) => {
  const { t } = useTranslation('common')
  const { isAuthenticated, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  const solutions = getSolutions(t)
  const moreSolutions = getMoreSolutions(t)

  const logoutHandler = () => {
    setMobileMenuOpen(false)
    logout()
  }

  const openMenu = () => {
    setMobileMenuOpen(true)
  }

  const openFeedback = () => {
    setMobileMenuOpen(false)
    setFeedbackOpen(true)
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
          openFeedback={openFeedback}
          inverted={inverted}
        />
      ) : (
        <NotAuthedHeader
          colourBackground={!transparent}
          refPage={refPage}
          openMenu={openMenu}
          inverted={inverted}
        />
      )}

      {/* Mobile header popup */}
      <Dialog
        className='lg:hidden'
        open={mobileMenuOpen}
        onClose={setMobileMenuOpen}
      >
        <div className='fixed inset-0 z-10' />
        <DialogPanel className='fixed inset-y-0 top-0 right-0 z-30 w-full overflow-y-auto border-gray-300/80 bg-gray-100/80 p-4 backdrop-blur-2xl sm:max-w-sm sm:border dark:border-slate-900/80 dark:bg-slate-900/80'>
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
                aria-label={t('common.close')}
              >
                <XIcon className='h-8 w-8 flex-none' aria-hidden='true' />
              </button>
            </div>
          </div>
          <div className='mt-6 flow-root'>
            <div className='-my-6 divide-y divide-gray-500/10'>
              <div className='space-y-2 py-3'>
                <a
                  href={DISCORD_URL}
                  className='-mx-3 flex items-center gap-2 rounded-lg px-3 py-2 text-base leading-7 font-semibold text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'
                  target='_blank'
                  rel='noreferrer noopener'
                >
                  <DiscordLogoIcon
                    className='h-5 w-5 text-indigo-600 dark:text-indigo-400'
                    aria-hidden='true'
                    weight='duotone'
                  />
                  <span>Discord</span>
                </a>
                <a
                  href={GITHUB_URL}
                  className='-mx-3 flex items-center gap-2 rounded-lg px-3 py-2 text-base leading-7 font-semibold text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'
                  target='_blank'
                  rel='noreferrer noopener'
                >
                  <GithubLogoIcon
                    className='h-5 w-5 text-slate-700 dark:text-gray-200'
                    aria-hidden='true'
                    weight='duotone'
                  />
                  <span>GitHub</span>
                </a>
              </div>
              <div className='space-y-2 py-3'>
                {!isSelfhosted ? (
                  <Disclosure as='div' className='-mx-3'>
                    {({ open }) => (
                      <>
                        <DisclosureButton className='flex w-full items-center justify-between rounded-lg py-2 pr-3.5 pl-3 text-base leading-7 font-semibold text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'>
                          {t('header.solutions.title')}
                          <CaretDownIcon
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

                                  <Text
                                    as='p'
                                    size='xs'
                                    className='mt-1 text-gray-600 dark:text-neutral-100'
                                  >
                                    {item.description}
                                  </Text>
                                </div>
                              </DisclosureButton>
                            ))}
                            <div className='mx-2 my-1 border-t border-gray-300/80 dark:border-slate-700/60' />
                            {_map(moreSolutions, (item) => (
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

                                  <Text
                                    as='p'
                                    size='xs'
                                    className='mt-1 text-gray-600 dark:text-neutral-100'
                                  >
                                    {item.description}
                                  </Text>
                                </div>
                              </DisclosureButton>
                            ))}
                          </DisclosurePanel>
                        </Transition>
                      </>
                    )}
                  </Disclosure>
                ) : null}
                {!isSelfhosted && isAuthenticated ? (
                  <Link
                    to={routes.billing}
                    onClick={() => setMobileMenuOpen(false)}
                    className='-mx-3 flex items-center gap-2 rounded-lg px-3 py-2 text-base leading-7 font-semibold text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'
                    key='Billing'
                  >
                    <CreditCardIcon className='h-5 w-5' />
                    {t('common.billing')}
                  </Link>
                ) : null}
                {!isSelfhosted &&
                !isDisableMarketingPages &&
                !isAuthenticated ? (
                  <Link
                    to={routes.pricing}
                    onClick={() => setMobileMenuOpen(false)}
                    className='-mx-3 flex items-center gap-2 rounded-lg px-3 py-2 text-base leading-7 font-semibold text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'
                    key='Pricing'
                  >
                    <TagIcon className='h-5 w-5' />
                    {t('common.pricing')}
                  </Link>
                ) : null}
                <a
                  href={DOCS_URL}
                  onClick={() => setMobileMenuOpen(false)}
                  className='-mx-3 flex items-center gap-2 rounded-lg px-3 py-2 text-base leading-7 font-semibold text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'
                  target='_blank'
                  rel='noreferrer noopener'
                >
                  <BookOpenIcon className='h-5 w-5' />
                  {t('common.docs')}
                </a>
                {isAuthenticated ? (
                  <Link
                    to={routes.dashboard}
                    onClick={() => setMobileMenuOpen(false)}
                    className='-mx-3 flex items-center gap-2 rounded-lg px-3 py-2 text-base leading-7 font-semibold text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'
                  >
                    <SquaresFourIcon className='h-5 w-5' />
                    {t('common.dashboard')}
                  </Link>
                ) : null}
                {isAuthenticated && !isSelfhosted ? (
                  <button
                    type='button'
                    onClick={openFeedback}
                    className='-mx-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-base leading-7 font-semibold text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'
                  >
                    <ChatTextIcon className='h-5 w-5' />
                    {t('feedback.giveFeedback')}
                  </button>
                ) : null}
              </div>
              <div className='space-y-2 py-3'>
                {isAuthenticated ? (
                  <>
                    <Link
                      to={routes.user_settings}
                      onClick={() => setMobileMenuOpen(false)}
                      className='-mx-3 flex items-center gap-2 rounded-lg px-3 py-2 text-base leading-7 font-semibold text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'
                    >
                      <GearIcon className='h-5 w-5' />
                      {t('common.accountSettings')}
                    </Link>
                    {!isSelfhosted ? (
                      <Link
                        to={routes.organisations}
                        onClick={() => setMobileMenuOpen(false)}
                        className='-mx-3 flex items-center gap-2 rounded-lg px-3 py-2 text-base leading-7 font-semibold text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'
                      >
                        <BuildingsIcon className='h-5 w-5' />
                        {t('organisations.organisations')}
                      </Link>
                    ) : null}
                    <button
                      type='button'
                      className='-mx-3 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-base leading-7 font-semibold text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'
                      onClick={logoutHandler}
                    >
                      <SignOutIcon className='h-5 w-5' />
                      {t('common.logout')}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to={routes.signin}
                      onClick={() => setMobileMenuOpen(false)}
                      className='-mx-3 flex items-center gap-2 rounded-lg px-3 py-2 text-base leading-7 font-semibold text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'
                    >
                      <SignInIcon className='h-5 w-5' />
                      {t('auth.common.signin')}
                    </Link>
                    <Link
                      to={routes.signup}
                      onClick={() => setMobileMenuOpen(false)}
                      className='-mx-3 flex items-center gap-2 rounded-lg px-3 py-2 text-base leading-7 font-semibold text-gray-900 transition-colors hover:bg-gray-400/20 dark:text-gray-50 dark:hover:bg-slate-700/50'
                      aria-label={t('titles.signup')}
                    >
                      <UserPlusIcon className='h-5 w-5' />
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
      {isAuthenticated && !isSelfhosted ? (
        <FeedbackModal
          isOpened={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
        />
      ) : null}
    </Popover>
  )
}

export default memo(Header)
