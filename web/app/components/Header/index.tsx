/* eslint-disable jsx-a11y/anchor-is-valid, react/no-unstable-nested-components */
import React, { memo, Fragment, useMemo, useState } from 'react'

import { Link } from '@remix-run/react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import i18next from 'i18next'
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
} from '@headlessui/react'
import {
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ChartPieIcon,
  PlayCircleIcon,
  PhoneIcon,
  BoltIcon,
  FaceSmileIcon,
  PuzzlePieceIcon,
} from '@heroicons/react/24/outline'
import { ArrowRightIcon } from '@heroicons/react/20/solid'
import { MoonIcon, SunIcon } from '@heroicons/react/24/solid'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import duration from 'dayjs/plugin/duration'
import _map from 'lodash/map'
import _includes from 'lodash/includes'
import _startsWith from 'lodash/startsWith'
import cx, { clsx } from 'clsx'

import routes from 'utils/routes'
import { authActions } from 'redux/reducers/auth'
import sagaActions from 'redux/sagas/actions'
import UIActions from 'redux/reducers/ui'
import {
  whitelist,
  languages,
  languageFlag,
  isSelfhosted,
  DOCS_URL,
  SUPPORTED_THEMES,
  isBrowser,
  CAPTCHA_URL,
} from 'redux/constants'
import Dropdown from 'ui/Dropdown'
import Flag from 'ui/Flag'
import { IUser } from 'redux/models/IUser'
import { useAppDispatch, StateType } from 'redux/store'

dayjs.extend(utc)
dayjs.extend(duration)

const CONTACT_US_URL = `https://swetrix.com${routes.contact}`

const TRIAL_STATUS_MAPPING = {
  ENDED: 1,
  ENDS_TODAY: 2,
  ENDS_TOMORROW: 3,
  ENDS_IN_X_DAYS: 4,
}

const getSolutions = (t: typeof i18next.t) => [
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
    icon: BoltIcon,
  },
  {
    name: t('header.solutions.errors.title'),
    description: t('header.solutions.errors.desc'),
    link: routes.errorTracking,
    icon: FaceSmileIcon,
  },
  {
    name: t('header.solutions.captcha.title'),
    description: t('header.solutions.captcha.desc'),
    link: CAPTCHA_URL,
    icon: PuzzlePieceIcon,
  },
]

const getCallsToAction = (t: typeof i18next.t) => [
  { name: t('header.watchDemo'), link: 'https://www.youtube.com/watch?v=XBp38fZREIE', icon: PlayCircleIcon },
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
          <PopoverButton className='inline-flex items-center gap-x-1 text-base font-semibold leading-6 text-slate-800 hover:text-slate-700 dark:text-slate-200 dark:hover:text-white'>
            <span>{t('header.solutions.title')}</span>
            <ChevronDownIcon
              className={clsx('h-3 w-3 stroke-2 transition-all', {
                'rotate-180': open,
              })}
              aria-hidden='true'
            />
          </PopoverButton>

          <Transition
            as={Fragment}
            enter='transition ease-out duration-200'
            enterFrom='opacity-0 translate-y-1'
            enterTo='opacity-100 translate-y-0'
            leave='transition ease-in duration-150'
            leaveFrom='opacity-100 translate-y-0'
            leaveTo='opacity-0 translate-y-1'
          >
            <PopoverPanel className='absolute z-30 mt-4 flex w-screen max-w-max'>
              <div className='flex w-[650px] flex-col divide-y divide-gray-300/80 rounded-lg border border-gray-300/80 bg-gray-100/80 p-[6px] backdrop-blur-2xl dark:divide-slate-900/60 dark:border-slate-900/80 dark:bg-slate-800/80'>
                <div className='grid w-full grid-cols-2 gap-1 p-4'>
                  {_map(solutions, (item) => (
                    <div
                      key={item.name}
                      className='group relative flex gap-x-2 rounded-lg p-2 hover:bg-gray-300/50 dark:hover:bg-slate-700/80'
                    >
                      <item.icon className='mt-1 h-5 w-5 text-gray-600 dark:text-gray-300' aria-hidden='true' />
                      <div>
                        {_startsWith(item.link, '/') ? (
                          <Link to={item.link} className='text-sm font-semibold text-gray-900 dark:text-gray-50'>
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

                        <p className='mt-1 text-xs text-gray-600 dark:text-neutral-100'>{item.description}</p>
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
                          className='flex items-center justify-center gap-x-2 rounded-lg p-3 text-gray-800 hover:bg-gray-300/50 dark:text-gray-100 dark:hover:bg-slate-700/80'
                        >
                          <item.icon
                            className='h-5 w-5 flex-none text-gray-400 dark:text-gray-300'
                            aria-hidden='true'
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
                        className='flex items-center justify-center gap-x-2 rounded-lg p-3 text-gray-800 hover:bg-gray-300/50 dark:text-gray-100 dark:hover:bg-slate-700/80'
                      >
                        <item.icon className='h-5 w-5 flex-none text-gray-400 dark:text-gray-300' aria-hidden='true' />
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

const ThemeMenu = ({
  theme,
  t,
  switchTheme,
}: {
  theme: string
  t: typeof i18next.t
  switchTheme: (i: string) => void
}) => (
  <Menu as='div' className='relative ml-3'>
    <div>
      <MenuButton className='flex items-center justify-center text-base font-semibold leading-6 text-slate-800 hover:text-slate-700 dark:text-slate-200 dark:hover:text-white'>
        <span className='sr-only'>{t('header.switchTheme')}</span>
        {theme === 'dark' ? (
          <SunIcon className='h-6 w-6 cursor-pointer text-gray-200 hover:text-gray-300' aria-hidden='true' />
        ) : (
          <MoonIcon className='h-6 w-6 cursor-pointer text-slate-700 hover:text-slate-600' aria-hidden='true' />
        )}
      </MenuButton>
    </div>
    <Transition
      as={Fragment}
      enter='transition ease-out duration-100'
      enterFrom='transform opacity-0 scale-95'
      enterTo='transform opacity-100 scale-100'
      leave='transition ease-in duration-75'
      leaveFrom='transform opacity-100 scale-100'
      leaveTo='transform opacity-0 scale-95'
    >
      <MenuItems className='absolute right-0 z-30 mt-2 w-36 min-w-max origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-slate-200 focus:outline-none dark:bg-slate-900 dark:ring-slate-800'>
        <MenuItem>
          {({ active }) => (
            <div
              className={cx(
                'flex w-full cursor-pointer px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-gray-100 dark:text-gray-50 hover:dark:bg-slate-800',
                {
                  'bg-gray-100 dark:bg-slate-800': active,
                },
              )}
              onClick={() => switchTheme('light')}
            >
              <SunIcon className='mr-2 h-5 w-5 text-indigo-600 dark:text-gray-200' aria-hidden='true' />
              {t('header.light')}
            </div>
          )}
        </MenuItem>
        <MenuItem>
          {({ active }) => (
            <div
              className={cx(
                'flex w-full cursor-pointer px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-indigo-400 hover:dark:bg-slate-800',
                {
                  'bg-gray-100 dark:bg-slate-800': active,
                },
              )}
              onClick={() => switchTheme('dark')}
            >
              <MoonIcon className='mr-2 h-5 w-5 text-gray-200 dark:text-indigo-400' aria-hidden='true' />
              {t('header.dark')}
            </div>
          )}
        </MenuItem>
      </MenuItems>
    </Transition>
  </Menu>
)

const ProfileMenu = ({
  user,
  logoutHandler,
  t,
  onLanguageChange,
  language,
}: {
  user: IUser
  logoutHandler: () => void
  t: typeof i18next.t
  onLanguageChange: (l: string) => void
  language: string
}) => (
  <Menu as='div' className='relative ml-3'>
    {({ open }) => (
      <>
        <div>
          <MenuButton className='flex items-center justify-center text-base font-semibold leading-6 text-slate-800 hover:text-slate-700 dark:text-slate-200 dark:hover:text-white'>
            <span>{t('common.account')}</span>
            <ChevronDownIcon
              className={cx('ml-1 h-4 w-4 transform-gpu stroke-2 transition-transform', {
                'rotate-180': open,
              })}
              aria-hidden='true'
            />
          </MenuButton>
        </div>
        <Transition
          as={Fragment}
          enter='transition ease-out duration-100'
          enterFrom='transform opacity-0 scale-95'
          enterTo='transform opacity-100 scale-100'
          leave='transition ease-in duration-75'
          leaveFrom='transform opacity-100 scale-100'
          leaveTo='transform opacity-0 scale-95'
        >
          <MenuItems className='absolute right-0 z-30 mt-2 w-60 min-w-max origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-slate-200 focus:outline-none dark:bg-slate-900 dark:ring-slate-800'>
            <div className='border-b-[1px] border-gray-200 dark:border-slate-700/50'>
              <MenuItem>
                <p className='truncate px-4 py-2' role='none'>
                  <span className='block text-xs text-gray-500 dark:text-gray-300' role='none'>
                    {t('header.signedInAs')}
                  </span>
                  <span className='mt-0.5 text-sm font-semibold text-gray-700 dark:text-gray-50' role='none'>
                    {user?.email}
                  </span>
                </p>
              </MenuItem>
            </div>

            <div className='border-b-[1px] border-gray-200 dark:border-slate-700/50'>
              {/* Language selector */}
              <Menu as='div'>
                {({ open }) => (
                  <>
                    <div>
                      <MenuButton className='flex w-full justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-50 hover:dark:bg-slate-800'>
                        <div className='flex'>
                          <Flag
                            className='mr-1.5 rounded-sm'
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
                      </MenuButton>
                    </div>

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
                      <MenuItems
                        className='absolute right-0 z-50 mt-1 w-full min-w-max origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-slate-200 focus:outline-none dark:bg-slate-800 dark:ring-slate-800'
                        static
                      >
                        {_map(whitelist, (lng) => (
                          <MenuItem key={lng}>
                            <span
                              className='block cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-gray-600'
                              role='menuitem'
                              tabIndex={0}
                              onClick={() => onLanguageChange(lng)}
                            >
                              <div className='flex'>
                                <div className='pt-1'>
                                  <Flag
                                    className='mr-1.5 rounded-sm'
                                    country={languageFlag[lng]}
                                    size={20}
                                    alt={languageFlag[lng]}
                                  />
                                </div>
                                {languages[lng]}
                              </div>
                            </span>
                          </MenuItem>
                        ))}
                      </MenuItems>
                    </Transition>
                  </>
                )}
              </Menu>

              {isSelfhosted ? (
                <MenuItem>
                  {({ active }) => (
                    <a
                      href={CONTACT_US_URL}
                      target='_blank'
                      rel='noopener noreferrer'
                      className={cx('block px-4 py-2 text-sm text-gray-700 dark:text-gray-50', {
                        'bg-gray-100 dark:bg-slate-800': active,
                      })}
                    >
                      {t('footer.support')}
                    </a>
                  )}
                </MenuItem>
              ) : (
                <MenuItem>
                  {({ active }) => (
                    <Link
                      to={routes.contact}
                      className={cx('block px-4 py-2 text-sm text-gray-700 dark:text-gray-50', {
                        'bg-gray-100 dark:bg-slate-800': active,
                      })}
                    >
                      {t('footer.support')}
                    </Link>
                  )}
                </MenuItem>
              )}
              {!isSelfhosted && (
                <MenuItem>
                  {({ active }) => (
                    <Link
                      to={routes.billing}
                      className={cx('block px-4 py-2 text-sm text-gray-700 dark:text-gray-50', {
                        'bg-gray-100 dark:bg-slate-800': active,
                      })}
                    >
                      {t('common.billing')}
                    </Link>
                  )}
                </MenuItem>
              )}
            </div>

            <MenuItem>
              {({ active }) => (
                <Link
                  to={routes.user_settings}
                  className={cx('block px-4 py-2 text-sm text-gray-700 dark:text-gray-50', {
                    'bg-gray-100 dark:bg-slate-800': active,
                  })}
                >
                  {t('common.accountSettings')}
                </Link>
              )}
            </MenuItem>
            <MenuItem>
              {({ active }) => (
                <p
                  className={cx('cursor-pointer px-4 py-2 text-sm text-gray-700 dark:text-gray-50', {
                    'bg-gray-100 dark:bg-slate-800': active,
                  })}
                  onClick={logoutHandler}
                >
                  {t('common.logout')}
                </p>
              )}
            </MenuItem>
          </MenuItems>
        </Transition>
      </>
    )}
  </Menu>
)

const AuthedHeader = ({
  user,
  switchTheme,
  theme,
  onLanguageChange,
  rawStatus,
  status,
  logoutHandler,
  colourBackground,
  openMenu,
}: {
  user: IUser
  switchTheme: (thm?: string) => void
  theme: string
  onLanguageChange: (lng: string) => void
  rawStatus: string | number
  status: string
  logoutHandler: () => void
  colourBackground: boolean
  openMenu: () => void
}): JSX.Element => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  return (
    <header
      className={cx('relative overflow-x-clip', {
        'border-b border-gray-200 bg-gray-50 dark:border-slate-600/40 dark:bg-slate-900': colourBackground,
      })}
    >
      <nav className='mx-auto px-4 sm:px-6 lg:px-8' aria-label='Top'>
        <div className='flex w-full items-center justify-between py-4'>
          <div className='flex items-center'>
            {/* Logo */}
            <Link to={routes.main}>
              <span className='sr-only'>Swetrix</span>
              <img
                className='-translate-y-[3px]'
                height='28px'
                width='126.35px'
                src={theme === 'dark' ? '/assets/logo_white.png' : '/assets/logo_blue.png'}
                alt=''
              />
            </Link>
            <div className='ml-10 hidden gap-4 space-x-1 lg:flex'>
              {user?.planCode === 'trial' && (
                <Link
                  to={routes.billing}
                  className={cx('text-base font-semibold leading-6', {
                    'text-amber-600 hover:text-amber-500': rawStatus === TRIAL_STATUS_MAPPING.ENDS_IN_X_DAYS,
                    'text-rose-600 hover:text-rose-500':
                      rawStatus === TRIAL_STATUS_MAPPING.ENDS_TODAY ||
                      rawStatus === TRIAL_STATUS_MAPPING.ENDS_TOMORROW ||
                      rawStatus === TRIAL_STATUS_MAPPING.ENDED,
                  })}
                  key='TrialNotification'
                >
                  {status}
                </Link>
              )}
              {user?.planCode === 'none' && (
                <Link
                  to={routes.billing}
                  className='text-base font-semibold leading-6 text-rose-600 hover:text-rose-500'
                  key='NoSubscription'
                >
                  {t('billing.inactive')}
                </Link>
              )}
              {!isSelfhosted && <SolutionsMenu />}
              {!isSelfhosted && (
                <Link
                  to={routes.marketplace}
                  className='text-base font-semibold leading-6 text-slate-800 hover:text-slate-700 dark:text-slate-200 dark:hover:text-white'
                  key='Marketplace'
                >
                  {t('common.marketplace')}
                </Link>
              )}
              {isSelfhosted ? (
                <a
                  href={`https://swetrix.com${routes.blog}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-base font-semibold leading-6 text-slate-800 hover:text-slate-700 dark:text-slate-200 dark:hover:text-white'
                >
                  {t('footer.blog')}
                </a>
              ) : (
                <Link
                  to={routes.blog}
                  className='text-base font-semibold leading-6 text-slate-800 hover:text-slate-700 dark:text-slate-200 dark:hover:text-white'
                >
                  {t('footer.blog')}
                </Link>
              )}
              <a
                href={DOCS_URL}
                className='text-base font-semibold leading-6 text-slate-800 hover:text-slate-700 dark:text-slate-200 dark:hover:text-white'
                target='_blank'
                rel='noreferrer noopener'
              >
                {t('common.docs')}
              </a>
              <Link
                to={routes.dashboard}
                className='text-base font-semibold leading-6 text-slate-800 hover:text-slate-700 dark:text-slate-200 dark:hover:text-white'
              >
                {t('common.dashboard')}
              </Link>
            </div>
          </div>
          <div className='ml-1 hidden flex-wrap items-center justify-center space-x-2 space-y-1 sm:space-y-0 lg:ml-10 lg:flex lg:space-x-4'>
            <ThemeMenu theme={theme} switchTheme={switchTheme} t={t} />
            <ProfileMenu
              user={user}
              logoutHandler={logoutHandler}
              onLanguageChange={onLanguageChange}
              language={language}
              t={t}
            />
          </div>
          <div className='flex items-center justify-center space-x-3 lg:hidden'>
            {/* Theme switch */}
            {theme === 'dark' ? (
              <div className='rotate-180 transition-all duration-1000 ease-in-out'>
                <SunIcon
                  onClick={() => switchTheme()}
                  className='h-8 w-8 cursor-pointer text-gray-200 hover:text-gray-300'
                />
              </div>
            ) : (
              <div className='transition-all duration-1000 ease-in-out'>
                <MoonIcon
                  onClick={() => switchTheme()}
                  className='h-8 w-8 cursor-pointer text-slate-700 hover:text-slate-600'
                />
              </div>
            )}
            <button
              type='button'
              onClick={openMenu}
              className='flex items-center gap-x-1 text-sm font-semibold leading-6 text-slate-700 hover:text-slate-600 dark:text-gray-200 dark:hover:text-gray-300'
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
  switchTheme,
  theme,
  onLanguageChange,
  colourBackground,
  refPage,
  openMenu,
}: {
  switchTheme: (a?: string) => void
  theme: string
  onLanguageChange: (lang: string) => void
  colourBackground: boolean
  refPage?: boolean
  openMenu: () => void
}) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  return (
    <header
      className={cx('relative overflow-x-clip', {
        'border-b border-gray-200 bg-gray-50 dark:border-slate-600/40 dark:bg-slate-900': colourBackground,
      })}
    >
      <nav className='mx-auto px-4 sm:px-6 lg:px-8' aria-label='Top'>
        <div className='flex w-full items-center justify-between py-4'>
          <div className='flex items-center'>
            {/* Logo */}
            {refPage ? (
              <span>
                <span className='sr-only'>Swetrix</span>
                <img
                  className='-translate-y-[3px]'
                  height='28px'
                  width='126.35px'
                  src={theme === 'dark' ? '/assets/logo_white.png' : '/assets/logo_blue.png'}
                  alt=''
                />
              </span>
            ) : (
              <Link to={routes.main}>
                <span className='sr-only'>Swetrix</span>
                <img
                  className='-translate-y-[3px]'
                  height='28px'
                  width='126.35px'
                  src={theme === 'dark' ? '/assets/logo_white.png' : '/assets/logo_blue.png'}
                  alt=''
                />
              </Link>
            )}
            {!refPage && (
              <div className='ml-10 hidden items-center gap-4 space-x-1 lg:flex'>
                {!isSelfhosted && <SolutionsMenu />}
                {!isSelfhosted && (
                  <Link
                    to={routes.marketplace}
                    className='text-base font-semibold leading-6 text-slate-800 hover:text-slate-700 dark:text-slate-200 dark:hover:text-white'
                    key='Marketplace'
                  >
                    {t('common.marketplace')}
                  </Link>
                )}
                {isSelfhosted ? (
                  <a
                    href={`https://swetrix.com${routes.blog}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-base font-semibold leading-6 text-slate-800 hover:text-slate-700 dark:text-slate-200 dark:hover:text-white'
                  >
                    {t('footer.blog')}
                  </a>
                ) : (
                  <Link
                    to={routes.blog}
                    className='text-base font-semibold leading-6 text-slate-800 hover:text-slate-700 dark:text-slate-200 dark:hover:text-white'
                  >
                    {t('footer.blog')}
                  </Link>
                )}
                {!isSelfhosted && (
                  <Link
                    to={`${routes.main}#pricing`}
                    className='text-base font-semibold leading-6 text-slate-800 hover:text-slate-700 dark:text-slate-200 dark:hover:text-white'
                    key='Pricing'
                  >
                    {t('common.pricing')}
                  </Link>
                )}
                <a
                  href={DOCS_URL}
                  className='text-base font-semibold leading-6 text-slate-800 hover:text-slate-700 dark:text-slate-200 dark:hover:text-white'
                  target='_blank'
                  rel='noreferrer noopener'
                >
                  {/* <DocumentTextIcon className='w-5 h-5 mr-1' /> */}
                  {t('common.docs')}
                </a>
              </div>
            )}
          </div>
          <div className='ml-1 hidden flex-wrap items-center justify-center space-x-2 space-y-1 sm:space-y-0 lg:ml-10 lg:flex lg:space-x-4'>
            {/* Language selector */}
            <Dropdown
              items={whitelist}
              buttonClassName='!py-0 inline-flex items-center [&>svg]:w-4 [&>svg]:h-4 [&>svg]:mr-0 [&>svg]:ml-1 text-sm font-semibold leading-6 text-base text-slate-800 hover:text-slate-700 dark:text-slate-200 dark:hover:text-white'
              selectItemClassName='text-gray-700 block px-4 py-2 text-base cursor-pointer hover:bg-gray-200 dark:text-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700'
              title={
                <>
                  <Flag
                    className='mr-1.5 rounded-sm'
                    country={languageFlag[language]}
                    size={18}
                    alt=''
                    aria-hidden='true'
                  />
                  {languages[language]}
                </>
              }
              labelExtractor={(lng: string) => (
                <div className='flex'>
                  <div className='pt-1'>
                    <Flag className='mr-1.5 rounded-sm' country={languageFlag[lng]} size={21} alt={languageFlag[lng]} />
                  </div>
                  {languages[lng]}
                </div>
              )}
              onSelect={onLanguageChange}
              headless
            />
            <ThemeMenu theme={theme} switchTheme={switchTheme} t={t} />
            {!refPage && (
              <>
                <span className='text-slate-700'>|</span>
                <Link
                  to={routes.signin}
                  className='flex items-center text-base font-semibold leading-6 text-slate-800 hover:text-slate-700 dark:text-slate-200 dark:hover:text-white'
                >
                  {t('auth.common.signin')}
                  <ArrowRightIcon className='ml-1 mt-[1px] h-4 w-4 stroke-2' />
                </Link>
              </>
            )}
          </div>
          <div className='flex items-center justify-center space-x-3 lg:hidden'>
            {/* Theme switch */}
            {theme === 'dark' ? (
              <div className='rotate-180 transition-all duration-1000 ease-in-out'>
                <SunIcon
                  onClick={() => switchTheme()}
                  className='h-8 w-8 cursor-pointer text-gray-200 hover:text-gray-300'
                />
              </div>
            ) : (
              <div className='transition-all duration-1000 ease-in-out'>
                <MoonIcon
                  onClick={() => switchTheme()}
                  className='h-8 w-8 cursor-pointer text-slate-700 hover:text-slate-600'
                />
              </div>
            )}
            <button
              type='button'
              onClick={openMenu}
              className='flex items-center gap-x-1 text-sm font-semibold leading-6 text-slate-700 hover:text-slate-600 dark:text-gray-200 dark:hover:text-gray-300'
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

interface IHeader {
  ssrTheme: 'dark' | 'light'
  authenticated: boolean
  refPage?: boolean
  transparent?: boolean
}

const Header: React.FC<IHeader> = ({ ssrTheme, authenticated, refPage, transparent }): JSX.Element => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const dispatch = useAppDispatch()
  const _dispatch = useDispatch()
  const { user } = useSelector((state: StateType) => state.auth)
  const reduxTheme = useSelector((state: StateType) => state.ui.theme.theme)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const theme = isBrowser ? reduxTheme : ssrTheme

  const solutions = getSolutions(t)

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
      return [TRIAL_STATUS_MAPPING.ENDED, t('pricing.trialEnded')]
    }

    if (diff < dayjs.duration(1, 'day').asMilliseconds()) {
      // trial ends today or tomorrow
      const isToday = future.isSame(now, 'day')
      const isTomorrow = future.isSame(now.add(1, 'day'), 'day')

      if (isToday) {
        return [TRIAL_STATUS_MAPPING.ENDS_TODAY, t('pricing.trialEndsToday')]
      }
      if (isTomorrow) {
        return [TRIAL_STATUS_MAPPING.ENDS_TOMORROW, t('pricing.trialEndsTomorrow')]
      }
    }

    // trial ends in more than 1 day
    const amount = Math.round(dayjs.duration(diff).asDays())
    return [TRIAL_STATUS_MAPPING.ENDS_IN_X_DAYS, t('pricing.xTrialDaysLeft', { amount })]
  }, [user, t])

  const logoutHandler = () => {
    setMobileMenuOpen(false)
    dispatch(authActions.logout())
    _dispatch(sagaActions.logout(false, false))
  }

  const switchTheme = (_theme?: string) => {
    const newTheme = (_includes(SUPPORTED_THEMES, _theme) && _theme) || (theme === 'dark' ? 'light' : 'dark')
    dispatch(UIActions.setTheme(newTheme as 'light' | 'dark'))
  }

  const onLanguageChange = (id: string) => {
    i18next.changeLanguage(id)
  }

  const openMenu = () => {
    setMobileMenuOpen(true)
  }

  return (
    <Popover>
      {/* Computer / Laptop / Tablet layout header */}
      {authenticated ? (
        <AuthedHeader
          user={user}
          rawStatus={rawStatus || ''}
          status={status || ''}
          logoutHandler={logoutHandler}
          switchTheme={switchTheme}
          theme={theme}
          onLanguageChange={onLanguageChange}
          colourBackground={!transparent}
          openMenu={openMenu}
        />
      ) : (
        <NotAuthedHeader
          switchTheme={switchTheme}
          theme={theme}
          onLanguageChange={onLanguageChange}
          colourBackground={!transparent}
          refPage={refPage}
          openMenu={openMenu}
        />
      )}

      {/* Mobile header popup */}
      <Dialog className='lg:hidden' open={mobileMenuOpen} onClose={setMobileMenuOpen}>
        <div className='fixed inset-0 z-10' />
        <Dialog.Panel className='fixed inset-y-0 right-0 top-0 z-30 w-full overflow-y-auto border-gray-300/80 bg-gray-100/80 p-4 backdrop-blur-2xl dark:border-slate-900/80 dark:bg-slate-800/80 sm:max-w-sm sm:border'>
          <div className='flex items-center justify-between'>
            <div>
              <span className='sr-only'>Swetrix</span>
              <img
                className='-translate-y-[3px]'
                height='28px'
                width='126.35px'
                src={theme === 'dark' ? '/assets/logo_white.png' : '/assets/logo_blue.png'}
                alt=''
              />
            </div>
            <div className='flex items-center justify-center space-x-3'>
              {/* Theme switch */}
              {theme === 'dark' ? (
                <div className='rotate-180 transition-all duration-1000 ease-in-out'>
                  <SunIcon
                    onClick={() => switchTheme()}
                    className='h-8 w-8 cursor-pointer text-gray-200 hover:text-gray-300'
                  />
                </div>
              ) : (
                <div className='transition-all duration-1000 ease-in-out'>
                  <MoonIcon
                    onClick={() => switchTheme()}
                    className='h-8 w-8 cursor-pointer text-slate-700 hover:text-slate-600'
                  />
                </div>
              )}
              <button
                type='button'
                onClick={() => setMobileMenuOpen(false)}
                className='flex items-center gap-x-1 text-sm font-semibold leading-6 text-slate-700 hover:text-slate-600 dark:text-gray-200 dark:hover:text-gray-300'
              >
                <span className='sr-only'>{t('common.openMenu')}</span>
                <XMarkIcon className='h-8 w-8 flex-none' aria-hidden='true' />
              </button>
            </div>
          </div>
          <div className='mt-6 flow-root'>
            <div className='-my-6 divide-y divide-gray-500/10'>
              <div className='space-y-2 py-6'>
                {/* Language selector */}
                <Menu as='div' className='-mx-3'>
                  {({ open }) => (
                    <>
                      <MenuButton className='flex w-full items-center justify-between rounded-lg py-2 pl-3 pr-3.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-300/50 dark:text-gray-50 dark:hover:bg-slate-700/80'>
                        <div className='flex'>
                          <Flag
                            className='mr-1.5 rounded-sm'
                            country={languageFlag[language]}
                            size={20}
                            alt=''
                            aria-hidden='true'
                          />
                          {languages[language]}
                        </div>
                        <ChevronDownIcon
                          className={cx(open ? 'rotate-180' : '', 'h-5 w-5 flex-none')}
                          aria-hidden='true'
                        />
                      </MenuButton>

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
                        <MenuItems
                          className='absolute right-0 z-50 mt-1 w-full min-w-max origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-slate-200 focus:outline-none dark:bg-slate-800 dark:ring-slate-800'
                          static
                        >
                          {_map(whitelist, (lng) => (
                            <MenuItem key={lng}>
                              <span
                                className='block cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-gray-600'
                                role='menuitem'
                                tabIndex={0}
                                onClick={() => onLanguageChange(lng)}
                              >
                                <div className='flex'>
                                  <div className='pt-1'>
                                    <Flag
                                      className='mr-1.5 rounded-sm'
                                      country={languageFlag[lng]}
                                      size={20}
                                      alt={languageFlag[lng]}
                                    />
                                  </div>
                                  {languages[lng]}
                                </div>
                              </span>
                            </MenuItem>
                          ))}
                        </MenuItems>
                      </Transition>
                    </>
                  )}
                </Menu>
                {!isSelfhosted && (
                  <Disclosure as='div' className='-mx-3'>
                    {({ open }) => (
                      <>
                        <Disclosure.Button className='flex w-full items-center justify-between rounded-lg py-2 pl-3 pr-3.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-300/50 dark:text-gray-50 dark:hover:bg-slate-700/80'>
                          {t('header.solutions.title')}
                          <ChevronDownIcon
                            className={cx(open ? 'rotate-180' : '', 'h-5 w-5 flex-none')}
                            aria-hidden='true'
                          />
                        </Disclosure.Button>
                        <Disclosure.Panel className='mt-2 space-y-2'>
                          {_map(solutions, (item) => (
                            <Disclosure.Button
                              key={item.name}
                              as='div'
                              className='group relative flex gap-x-2 rounded-lg p-2 hover:bg-gray-300/50 dark:hover:bg-slate-700/80'
                            >
                              <item.icon className='mt-1 h-5 w-5 text-gray-600 dark:text-gray-300' aria-hidden='true' />
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

                                <p className='mt-1 text-xs text-gray-600 dark:text-neutral-100'>{item.description}</p>
                              </div>
                            </Disclosure.Button>
                          ))}
                        </Disclosure.Panel>
                      </>
                    )}
                  </Disclosure>
                )}
                {!isSelfhosted && (
                  <Link
                    to={routes.marketplace}
                    onClick={() => setMobileMenuOpen(false)}
                    className='-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-300/50 dark:text-gray-50 dark:hover:bg-slate-700/80'
                    key='Marketplace'
                  >
                    {t('common.marketplace')}
                  </Link>
                )}
                {!isSelfhosted && authenticated && user?.planCode === 'trial' && (
                  <Link
                    to={routes.billing}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cx(
                      '-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 hover:bg-gray-300/50 dark:hover:bg-slate-700/80',
                      {
                        'text-amber-600': rawStatus === TRIAL_STATUS_MAPPING.ENDS_IN_X_DAYS,
                        'text-rose-600':
                          rawStatus === TRIAL_STATUS_MAPPING.ENDS_TODAY ||
                          rawStatus === TRIAL_STATUS_MAPPING.ENDS_TOMORROW ||
                          rawStatus === TRIAL_STATUS_MAPPING.ENDED,
                      },
                    )}
                    key='TrialNotification'
                  >
                    {status}
                  </Link>
                )}
                {!isSelfhosted && authenticated && user?.planCode === 'none' && (
                  <Link
                    to={routes.billing}
                    onClick={() => setMobileMenuOpen(false)}
                    className='-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-rose-600 hover:bg-gray-300/50 dark:hover:bg-slate-700/80'
                    key='NoSubscription'
                  >
                    {t('billing.inactive')}
                  </Link>
                )}
                {!isSelfhosted && authenticated && user?.planCode !== 'none' && user?.planCode !== 'trial' && (
                  <Link
                    to={routes.billing}
                    onClick={() => setMobileMenuOpen(false)}
                    className='-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-300/50 dark:text-gray-50 dark:hover:bg-slate-700/80'
                    key='Billing'
                  >
                    {t('common.billing')}
                  </Link>
                )}
                {!isSelfhosted && !authenticated && (
                  <Link
                    to={`${routes.main}#pricing`}
                    onClick={() => setMobileMenuOpen(false)}
                    className='-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-300/50 dark:text-gray-50 dark:hover:bg-slate-700/80'
                    key='Pricing'
                  >
                    {t('common.pricing')}
                  </Link>
                )}
                {isSelfhosted ? (
                  <a
                    onClick={() => setMobileMenuOpen(false)}
                    href={`https://swetrix.com${routes.blog}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-300/50 dark:text-gray-50 dark:hover:bg-slate-700/80'
                  >
                    {t('footer.blog')}
                  </a>
                ) : (
                  <Link
                    to={routes.blog}
                    onClick={() => setMobileMenuOpen(false)}
                    className='-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-300/50 dark:text-gray-50 dark:hover:bg-slate-700/80'
                  >
                    {t('footer.blog')}
                  </Link>
                )}
                <a
                  href={DOCS_URL}
                  onClick={() => setMobileMenuOpen(false)}
                  className='-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-300/50 dark:text-gray-50 dark:hover:bg-slate-700/80'
                  target='_blank'
                  rel='noreferrer noopener'
                >
                  {t('common.docs')}
                </a>
                {authenticated && (
                  <Link
                    to={routes.dashboard}
                    onClick={() => setMobileMenuOpen(false)}
                    className='-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-300/50 dark:text-gray-50 dark:hover:bg-slate-700/80'
                  >
                    {t('common.dashboard')}
                  </Link>
                )}
              </div>
              <div className='space-y-2 py-6'>
                {authenticated ? (
                  <>
                    <Link
                      to={routes.user_settings}
                      onClick={() => setMobileMenuOpen(false)}
                      className='-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-300/50 dark:text-gray-50 dark:hover:bg-slate-700/80'
                    >
                      {t('common.accountSettings')}
                    </Link>
                    <span
                      className='-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-300/50 dark:text-gray-50 dark:hover:bg-slate-700/80'
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
                      className='-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-300/50 dark:text-gray-50 dark:hover:bg-slate-700/80'
                    >
                      {t('auth.common.signin')}
                    </Link>
                    <Link
                      to={routes.signup}
                      onClick={() => setMobileMenuOpen(false)}
                      className='-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-300/50 dark:text-gray-50 dark:hover:bg-slate-700/80'
                      aria-label={t('titles.signup')}
                    >
                      {t('common.getStarted')}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </Dialog>
    </Popover>
  )
}

export default memo(Header)
