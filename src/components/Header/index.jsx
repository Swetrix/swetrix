/* eslint-disable jsx-a11y/anchor-is-valid, react/no-unstable-nested-components */
import React, {
  memo, Fragment, useRef, useMemo,
} from 'react'
import PropTypes from 'prop-types'
import { Link, NavLink } from 'react-router-dom'
import { HashLink } from 'react-router-hash-link'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import Flag from 'react-flagkit'
import i18next from 'i18next'
import {
  Popover, Transition, Menu,
} from '@headlessui/react'
import {
  Bars3Icon, XMarkIcon, DocumentTextIcon, CreditCardIcon, CircleStackIcon, RssIcon,
  ChevronDownIcon, PresentationChartLineIcon,
} from '@heroicons/react/24/outline'
import { MoonIcon, SunIcon } from '@heroicons/react/24/solid'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import duration from 'dayjs/plugin/duration'
import _map from 'lodash/map'
import _includes from 'lodash/includes'
import cx from 'clsx'

import routes from 'routes'
import { authActions } from 'redux/actions/auth'
import UIActions from 'redux/actions/ui'
import {
  whitelist, languages, languageFlag, isSelfhosted, BLOG_URL,
  DOCS_URL, SUPPORTED_THEMES,
} from 'redux/constants'
import Dropdown from 'ui/Dropdown'

dayjs.extend(utc)
dayjs.extend(duration)

const TRIAL_STATUS_MAPPING = {
  ENDED: 1,
  ENDS_TODAY: 2,
  ENDS_TOMORROW: 3,
  ENDS_IN_X_DAYS: 4,
}

const ThemeMenu = ({
  theme, t, switchTheme,
}) => (
  <Menu as='div' className='relative ml-3'>
    <div>
      <Menu.Button className='flex justify-center items-center text-base font-medium text-white focus:outline-none hover:text-indigo-100 hover:dark:text-gray-200'>
        <span className='sr-only'>
          {t('header.switchTheme')}
        </span>
        {theme === 'dark' ? (
          <SunIcon className='h-6 w-6 text-gray-200 hover:text-gray-300 cursor-pointer' aria-hidden='true' />
        ) : (
          <MoonIcon className='h-6 w-6 text-indigo-100 hover:text-indigo-200 cursor-pointer' aria-hidden='true' />
        )}
      </Menu.Button>
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
      <Menu.Items className='absolute right-0 z-10 mt-2 w-36 min-w-max origin-top-right rounded-md bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none'>
        <Menu.Item>
          {({ active }) => (
            <div
              className={cx('flex w-full font-semibold cursor-pointer px-4 py-2 text-sm text-indigo-600 dark:text-gray-50 hover:bg-gray-100 hover:dark:bg-gray-700', {
                'bg-gray-100 dark:bg-gray-700': active,
              })}
              onClick={() => switchTheme('light')}
            >
              <SunIcon className='h-5 w-5 mr-2 text-indigo-600 dark:text-gray-200' aria-hidden='true' />
              {t('header.light')}
            </div>
          )}
        </Menu.Item>
        <Menu.Item>
          {({ active }) => (
            <div
              className={cx('flex w-full font-semibold cursor-pointer px-4 py-2 text-sm text-gray-700 dark:text-indigo-400 hover:bg-gray-100 hover:dark:bg-gray-700', {
                'bg-gray-100 dark:bg-gray-700': active,
              })}
              onClick={() => switchTheme('dark')}
            >
              <MoonIcon className='h-5 w-5 mr-2 text-gray-200 dark:text-indigo-400' aria-hidden='true' />
              {t('header.dark')}
            </div>
          )}
        </Menu.Item>
      </Menu.Items>
    </Transition>
  </Menu>
)

const ProfileMenu = ({
  user, logoutHandler, t, onLanguageChange, language,
}) => (
  <Menu as='div' className='relative ml-3'>
    <div>
      <Menu.Button className='flex justify-center items-center text-base font-medium text-white focus:outline-none hover:text-indigo-100 hover:dark:text-gray-200'>
        <span>Account</span>
        <ChevronDownIcon className='h-4 w-4 ml-1' aria-hidden='true' />
      </Menu.Button>
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
      <Menu.Items className='absolute right-0 z-10 mt-2 w-60 min-w-max origin-top-right rounded-md bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none'>
        <div className='border-gray-200 dark:border-gray-700 border-b-[1px]'>
          <Menu.Item>
            <p className='truncate py-2 px-4' role='none'>
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
          </Menu.Item>
        </div>

        <div className='border-gray-200 dark:border-gray-700 border-b-[1px]'>
          {/* Language selector */}
          <Menu as='div'>
            {({ open }) => (
              <>
                <div>
                  <Menu.Button
                    // className='inline-flex w-full rounded-md border border-gray-300 shadow-sm px-3 md:px-4 py-2 bg-white text-sm font-medium text-gray-700 dark:text-gray-50 dark:border-gray-800 dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500'
                    className='flex justify-between w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-50 hover:bg-gray-100 hover:dark:bg-gray-700'
                  >
                    <div className='flex'>
                      <Flag className='rounded-sm mr-1.5' country={languageFlag[language]} size={20} alt='' aria-hidden='true' />
                      {languages[language]}
                    </div>
                    <ChevronDownIcon className='-mr-1 ml-2 h-5 w-5' aria-hidden='true' />
                  </Menu.Button>
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
                  <Menu.Items
                    className='z-50 origin-top-right absolute right-0 mt-1 w-full min-w-max rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none'
                    static
                  >
                    <div className='py-1'>
                      {_map(whitelist, lng => (
                        <Menu.Item key={lng}>
                          <span
                            className='text-gray-700 dark:text-gray-50 dark:border-gray-800 dark:bg-gray-700 block px-4 py-2 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600'
                            role='menuitem'
                            tabIndex='-1'
                            id='menu-item-0'
                            onClick={() => onLanguageChange(lng)}
                          >
                            <div className='flex'>
                              <div className='pt-1'>
                                <Flag className='rounded-sm mr-1.5' country={languageFlag[lng]} size={20} alt={languageFlag[lng]} />
                              </div>
                              {languages[lng]}
                            </div>
                          </span>
                        </Menu.Item>
                      ))}
                    </div>
                  </Menu.Items>
                </Transition>
              </>
            )}
          </Menu>

          <Menu.Item>
            {({ active }) => (
              <Link
                to={routes.changelog}
                className={cx('block px-4 py-2 text-sm text-gray-700 dark:text-gray-50', {
                  'bg-gray-100 dark:bg-gray-700': active,
                })}
              >
                {t('footer.changelog')}
              </Link>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <Link
                to={routes.contact}
                className={cx('block px-4 py-2 text-sm text-gray-700 dark:text-gray-50', {
                  'bg-gray-100 dark:bg-gray-700': active,
                })}
              >
                {t('footer.support')}
              </Link>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <Link
                to={routes.billing}
                className={cx('block px-4 py-2 text-sm text-gray-700 dark:text-gray-50', {
                  'bg-gray-100 dark:bg-gray-700': active,
                })}
              >
                {t('common.billing')}
              </Link>
            )}
          </Menu.Item>
        </div>

        {!isSelfhosted && (
          <Menu.Item>
            {({ active }) => (
              <Link
                to={routes.user_settings}
                className={cx('block px-4 py-2 text-sm text-gray-700 dark:text-gray-50', {
                  'bg-gray-100 dark:bg-gray-700': active,
                })}
              >
                {t('common.accountSettings')}
              </Link>
            )}
          </Menu.Item>
        )}
        <Menu.Item>
          {({ active }) => (
            <p
              className={cx('cursor-pointer px-4 py-2 text-sm text-gray-700 dark:text-gray-50', {
                'bg-gray-100 dark:bg-gray-700': active,
              })}
              onClick={logoutHandler}
            >
              {t('common.logout')}
            </p>
          )}
        </Menu.Item>
      </Menu.Items>
    </Transition>
  </Menu>
)

const AuthedHeader = ({
  user, switchTheme, theme, onLanguageChange, rawStatus, status, t, language, logoutHandler,
}) => (
  <header className='bg-indigo-600 dark:bg-gray-750 relative overflow-x-clip'>
    <nav className='mx-auto px-4 sm:px-6 lg:px-8' aria-label='Top'>
      <div className='w-full py-4 flex items-center justify-between border-b border-indigo-500 dark:border-gray-300 lg:border-none'>
        <div className='flex items-center'>
          {/* Logo */}
          <Link to={routes.main}>
            <span className='sr-only'>Swetrix</span>
            <img className='h-10' src='/assets/logo_white.svg' alt='Swetrix' />
          </Link>

          <div className='hidden ml-10 space-x-1 lg:flex'>
            {!isSelfhosted && user?.planCode === 'trial' && (
              <Link
                to={routes.billing}
                className={cx('flex justify-center items-center text-base select-none font-medium py-2 px-2 rounded-md', {
                  'text-amber-800 bg-amber-200 dark:bg-amber-300 hover:bg-amber-300 dark:hover:bg-amber-200': rawStatus === TRIAL_STATUS_MAPPING.ENDS_IN_X_DAYS,
                  'text-rose-800 bg-rose-200 dark:bg-rose-300 hover:bg-rose-300 dark:hover:bg-rose-200': rawStatus === TRIAL_STATUS_MAPPING.ENDS_TODAY || rawStatus === TRIAL_STATUS_MAPPING.ENDS_TOMORROW || rawStatus === TRIAL_STATUS_MAPPING.ENDED,
                })}
                key='TrialNotification'
              >
                {status}
              </Link>
            )}
            {user?.planCode === 'none' && (
              <Link
                to={routes.billing}
                className='flex justify-center items-center text-base select-none font-medium py-2 px-2 rounded-md text-rose-800 bg-rose-200 dark:bg-rose-300 hover:bg-rose-300 dark:hover:bg-rose-200'
                key='NoSubscription'
              >
                {t('billing.inactive')}
              </Link>
            )}
            <a href={BLOG_URL} className='flex justify-center items-center text-base select-none font-medium text-white hover:text-indigo-50 py-2 px-2 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' target='_blank' rel='noreferrer noopener'>
              <RssIcon className='w-5 h-5 mr-1' />
              {t('footer.blog')}
            </a>
            <a href={DOCS_URL} className='flex justify-center items-center text-base select-none font-medium text-white hover:text-indigo-50 py-2 px-2 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' target='_blank' rel='noreferrer noopener'>
              <DocumentTextIcon className='w-5 h-5 mr-1' />
              {t('common.docs')}
            </a>
            <Link to={routes.dashboard} className='flex justify-center items-center text-base select-none font-medium text-white hover:text-indigo-50 py-2 px-2 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md'>
              <PresentationChartLineIcon className='w-5 h-5 mr-1' />
              {t('common.dashboard')}
            </Link>
          </div>
        </div>
        <div className='hidden md:flex justify-center items-center flex-wrap ml-1 md:ml-10 space-y-1 sm:space-y-0 space-x-2 md:space-x-4'>
          <ThemeMenu
            theme={theme}
            switchTheme={switchTheme}
            t={t}
          />
          <ProfileMenu
            user={user}
            logoutHandler={logoutHandler}
            onLanguageChange={onLanguageChange}
            language={language}
            t={t}
          />
        </div>
        <div className='md:hidden flex justify-center items-center'>
          {/* Theme switch */}
          {theme === 'dark' ? (
            <div className='transition-all duration-1000 ease-in-out rotate-180'>
              <SunIcon onClick={switchTheme} className='h-10 w-10 text-gray-200 hover:text-gray-300 cursor-pointer' />
            </div>
          ) : (
            <div className='transition-all duration-1000 ease-in-out'>
              <MoonIcon onClick={switchTheme} className='h-10 w-10 text-indigo-100 hover:text-indigo-200 cursor-pointer' />
            </div>
          )}
          <Popover.Button className='bg-white dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded-md p-2 ml-3 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500'>
            <span className='sr-only'>
              {t('common.openMenu')}
            </span>
            <Bars3Icon className='h-6 w-6' aria-hidden='true' />
          </Popover.Button>
        </div>
      </div>
      <div className='py-4 flex flex-wrap justify-center space-x-2 lg:hidden'>
        <a href={BLOG_URL} className='flex justify-center items-center text-base select-none font-medium text-white hover:text-indigo-50 py-1 px-2 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' target='_blank' rel='noreferrer noopener'>
          <RssIcon className='w-5 h-5 mr-1' />
          {t('footer.blog')}
        </a>
        <a href={DOCS_URL} className='flex justify-center items-center text-base select-none font-medium text-white hover:text-indigo-50 py-1 px-2 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' target='_blank' rel='noreferrer noopener'>
          <DocumentTextIcon className='w-5 h-5 mr-1' />
          {t('common.docs')}
        </a>
        <Link to={routes.dashboard} className='flex justify-center items-center text-base select-none font-medium text-white hover:text-indigo-50 py-2 px-2 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md'>
          <PresentationChartLineIcon className='w-5 h-5 mr-1' />
          {t('common.dashboard')}
        </Link>
      </div>
    </nav>
  </header>
)

const NotAuthedHeader = ({
  switchTheme, theme, onLanguageChange, t, language,
}) => (
  <header className='bg-indigo-600 dark:bg-gray-750 relative overflow-x-clip'>
    <nav className='mx-auto px-4 sm:px-6 lg:px-8' aria-label='Top'>
      <div className='w-full py-4 flex items-center justify-between border-b border-indigo-500 dark:border-gray-300 lg:border-none'>
        <div className='flex items-center'>
          {/* Logo */}
          <Link to={routes.main}>
            <span className='sr-only'>Swetrix</span>
            <img className='h-10' src='/assets/logo_white.svg' alt='Swetrix' />
          </Link>

          <div className='hidden ml-10 space-x-1 lg:flex'>
            <a href={BLOG_URL} className='flex justify-center items-center text-base select-none font-medium text-white hover:text-indigo-50 py-2 px-2 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' target='_blank' rel='noreferrer noopener'>
              <RssIcon className='w-5 h-5 mr-1' />
              {t('footer.blog')}
            </a>
            {!isSelfhosted && (
              <>
                <NavLink to={routes.features} className='flex justify-center items-center text-base select-none font-medium text-white hover:text-indigo-50 py-2 px-2 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' activeClassName='bg-indigo-700 hover:bg-indigo-700 dark:bg-gray-700' key='Features'>
                  <CircleStackIcon className='w-5 h-5 mr-1' />
                  {t('common.features')}
                </NavLink>
                <HashLink to={`${routes.main}#pricing`} className='flex justify-center items-center text-base select-none font-medium text-white hover:text-indigo-50 py-2 px-2 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' key='Pricing'>
                  <CreditCardIcon className='w-5 h-5 mr-1' />
                  {t('common.pricing')}
                </HashLink>
              </>
            )}
            <a href={DOCS_URL} className='flex justify-center items-center text-base select-none font-medium text-white hover:text-indigo-50 py-2 px-2 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' target='_blank' rel='noreferrer noopener'>
              <DocumentTextIcon className='w-5 h-5 mr-1' />
              {t('common.docs')}
            </a>
          </div>
        </div>
        <div className='hidden md:flex justify-center items-center flex-wrap ml-1 md:ml-10 space-y-1 sm:space-y-0 space-x-2 md:space-x-4'>
          {/* Theme switch */}
          {theme === 'dark' ? (
            <div className='transition-all duration-1000 ease-in-out rotate-180'>
              <SunIcon onClick={switchTheme} className='h-10 w-10 text-gray-200 hover:text-gray-300 cursor-pointer' />
            </div>
          ) : (
            <div className='transition-all duration-1000 ease-in-out'>
              <MoonIcon onClick={switchTheme} className='h-10 w-10 text-indigo-100 hover:text-indigo-200 cursor-pointer' />
            </div>
          )}

          {/* Language selector */}
          <Dropdown
            items={whitelist}
            buttonClassName='flex items-center w-full rounded-md border border-gray-300 shadow-sm px-3 md:px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500 dark:text-gray-50 dark:border-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600'
            selectItemClassName='text-gray-700 block px-4 py-2 text-base cursor-pointer hover:bg-gray-200 dark:text-gray-50 dark:border-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600'
            title={(
              <>
                <Flag className='rounded-sm mr-1.5' country={languageFlag[language]} size={21} alt='' aria-hidden='true' />
                {languages[language]}
              </>
            )}
            labelExtractor={(lng) => (
              <div className='flex'>
                <div className='pt-1'>
                  <Flag className='rounded-sm mr-1.5' country={languageFlag[lng]} size={21} alt={languageFlag[lng]} />
                </div>
                {languages[lng]}
              </div>
            )}
            onSelect={onLanguageChange}
          />
          <Link to={routes.signin} className='inline-block select-none bg-indigo-500 dark:bg-gray-700 mt-1 sm:mt-0 py-2 px-3 md:px-4 border border-transparent rounded-md text-base font-medium text-white hover:bg-opacity-75 hover:dark:bg-gray-600'>
            {t('auth.common.signin')}
          </Link>
          {!isSelfhosted && (
            <Link to={routes.signup} className='inline-block select-none bg-white dark:bg-gray-700 dark:text-gray-50 py-2 px-3 md:px-4 border border-transparent rounded-md text-base font-medium text-indigo-600 hover:bg-indigo-50 hover:dark:bg-gray-600' aria-label={t('titles.signup')}>
              {t('common.getStarted')}
            </Link>
          )}
        </div>
        <div className='md:hidden flex justify-center items-center'>
          {/* Theme switch */}
          {theme === 'dark' ? (
            <div className='transition-all duration-1000 ease-in-out rotate-180'>
              <SunIcon onClick={switchTheme} className='h-10 w-10 text-gray-200 hover:text-gray-300 cursor-pointer' />
            </div>
          ) : (
            <div className='transition-all duration-1000 ease-in-out'>
              <MoonIcon onClick={switchTheme} className='h-10 w-10 text-indigo-100 hover:text-indigo-200 cursor-pointer' />
            </div>
          )}
          <Popover.Button className='bg-white dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded-md p-2 ml-3 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500'>
            <span className='sr-only'>
              {t('common.openMenu')}
            </span>
            <Bars3Icon className='h-6 w-6' aria-hidden='true' />
          </Popover.Button>
        </div>
      </div>
      <div className='py-4 flex flex-wrap justify-center space-x-2 lg:hidden'>
        <a href={BLOG_URL} className='flex justify-center items-center text-base select-none font-medium text-white hover:text-indigo-50 py-1 px-2 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' target='_blank' rel='noreferrer noopener'>
          <RssIcon className='w-5 h-5 mr-1' />
          {t('footer.blog')}
        </a>
        <HashLink to={`${routes.main}#pricing`} className='flex justify-center items-center text-base select-none font-medium text-white hover:text-indigo-50 py-1 px-2 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' key='Pricing'>
          <CreditCardIcon className='w-5 h-5 mr-1' />
          {t('common.pricing')}
        </HashLink>
        <NavLink to={routes.features} className='flex justify-center items-center text-base select-none font-medium text-white hover:text-indigo-50 py-1 px-2 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' activeClassName='bg-indigo-700 hover:bg-indigo-700 dark:bg-gray-700' key='Features'>
          <CircleStackIcon className='w-5 h-5 mr-1' />
          {t('common.features')}
        </NavLink>
        <a href={DOCS_URL} className='flex justify-center items-center text-base select-none font-medium text-white hover:text-indigo-50 py-1 px-2 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' target='_blank' rel='noreferrer noopener'>
          <DocumentTextIcon className='w-5 h-5 mr-1' />
          {t('common.docs')}
        </a>
      </div>
    </nav>
  </header>
)

const Header = ({
  authenticated, theme, user,
}) => {
  const { t, i18n: { language } } = useTranslation('common')
  const dispatch = useDispatch()
  const buttonRef = useRef()

  const [rawStatus, status] = useMemo(() => {
    const { trialEndDate } = (user || {})

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
    dispatch(authActions.logout())
  }

  const switchTheme = (_theme) => {
    const newTheme = (_includes(SUPPORTED_THEMES, _theme) && _theme) || (theme === 'dark' ? 'light' : 'dark')
    dispatch(UIActions.setTheme(newTheme))
  }

  const onLanguageChange = (id) => {
    i18next.changeLanguage(id)
  }

  return (
    <Popover className='relative bg-white'>
      {/* Computer / Laptop / Tablet layout header */}
      {authenticated ? (
        <AuthedHeader
          user={user}
          rawStatus={rawStatus}
          status={status}
          logoutHandler={logoutHandler}
          switchTheme={switchTheme}
          theme={theme}
          onLanguageChange={onLanguageChange}
          language={language}
          t={t}
        />
      ) : (
        <NotAuthedHeader
          switchTheme={switchTheme}
          theme={theme}
          onLanguageChange={onLanguageChange}
          language={language}
          t={t}
        />
      )}

      {/* Mobile header popup */}
      <Transition
        as={Fragment}
        enter='duration-200 ease-out'
        enterFrom='opacity-0 scale-95'
        enterTo='opacity-100 scale-100'
        leave='duration-100 ease-in'
        leaveFrom='opacity-100 scale-100'
        leaveTo='opacity-0 scale-95'
      >
        <Popover.Panel focus className='absolute top-0 z-50 inset-x-0 p-2 transition transform origin-top-right md:hidden'>
          <div className='rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 bg-white dark:bg-gray-750 divide-y-2 divide-gray-50 dark:divide-gray-800'>
            <div className='pt-5 pb-6 px-5'>
              <div className='flex items-center justify-between'>
                <Link to={routes.main}>
                  <span className='sr-only'>Swetrix</span>
                  {theme === 'dark' ? (
                    // themeType === THEME_TYPE.christmas ? (
                    //   <img className='h-10' src='/assets/logo_white_christmas.png' alt='Swetrix' />
                    // ) : (
                    //   <img className='h-10' src='/assets/logo_white.svg' alt='Swetrix' />
                    // )
                    <img className='h-10' src='/assets/logo_white.svg' alt='Swetrix' />
                  ) : (
                    <img className='h-10' src='/assets/logo_blue.svg' alt='Swetrix' />
                  )}
                </Link>
                <Popover.Button ref={buttonRef} className='bg-white dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500'>
                  <span className='sr-only'>
                    {t('common.closeMenu')}
                  </span>
                  <XMarkIcon className='h-6 w-6' aria-hidden='true' />
                </Popover.Button>
              </div>
            </div>
            <div className='py-6 px-5 space-y-6'>
              <div className='grid grid-cols-1 gap-y-4'>
                {/* Language selector */}
                <Dropdown
                  items={whitelist}
                  buttonClassName='flex items-center w-full rounded-md border border-gray-300 shadow-sm px-3 md:px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500 dark:text-gray-50 dark:border-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600'
                  selectItemClassName='text-gray-700 block px-4 py-2 text-base cursor-pointer hover:bg-gray-200 dark:text-gray-50 dark:border-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600'
                  title={(
                    <>
                      <Flag className='rounded-sm mr-1.5' country={languageFlag[language]} size={21} alt='' aria-hidden='true' />
                      {languages[language]}
                    </>
                  )}
                  labelExtractor={(lng) => (
                    <div className='flex'>
                      <div className='pt-1'>
                        <Flag className='rounded-sm mr-1.5' country={languageFlag[lng]} size={21} alt={languageFlag[lng]} />
                      </div>
                      {languages[lng]}
                    </div>
                  )}
                  onSelect={onLanguageChange}
                />
                {authenticated ? (
                  <>
                    {!isSelfhosted && user?.planCode === 'trial' && (
                      <Link
                        to={routes.billing}
                        className={cx('flex justify-center items-center text-base select-none font-medium py-2 px-2 rounded-md', {
                          'text-amber-800 bg-amber-200 dark:bg-amber-300 hover:bg-amber-300 dark:hover:bg-amber-200': rawStatus === TRIAL_STATUS_MAPPING.ENDS_IN_X_DAYS,
                          'text-rose-800 bg-rose-200 dark:bg-rose-300 hover:bg-rose-300 dark:hover:bg-rose-200': rawStatus === TRIAL_STATUS_MAPPING.ENDS_TODAY || rawStatus === TRIAL_STATUS_MAPPING.ENDS_TOMORROW || rawStatus === TRIAL_STATUS_MAPPING.ENDED,
                        })}
                        key='TrialNotification'
                      >
                        {status}
                      </Link>
                    )}
                    {!isSelfhosted && user?.planCode === 'none' && (
                      <Link
                        to={routes.billing}
                        className='flex justify-center items-center text-base select-none font-medium py-2 px-2 rounded-md text-rose-800 bg-rose-200 dark:bg-rose-300 hover:bg-rose-300 dark:hover:bg-rose-200'
                        key='NoSubscription'
                      >
                        {t('billing.inactive')}
                      </Link>
                    )}
                    {/* Temporarily put it here until the header is fully redesigned */}
                    {!isSelfhosted && user?.planCode !== 'none' && user?.planCode !== 'trial' && (
                      <Link
                        to={routes.billing}
                        className='w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700'
                        key='Billing'
                      >
                        {t('common.billing')}
                      </Link>
                    )}
                    <div onClick={() => buttonRef.current?.click()}>
                      <Link to={routes.user_settings} className='w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700'>
                        {t('common.accountSettings')}
                      </Link>
                    </div>
                    <div onClick={() => buttonRef.current?.click()}>
                      <Link to={routes.dashboard} className='w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700'>
                        {t('common.dashboard')}
                      </Link>
                    </div>
                    <div onClick={() => buttonRef.current?.click()}>
                      <Link to='#' className='w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-indigo-600 bg-gray-50 hover:bg-indigo-50 dark:text-gray-50 dark:border-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600' onClick={logoutHandler}>
                        {t('common.logout')}
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <div onClick={() => buttonRef.current?.click()}>
                      <Link to={routes.signin} className='w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-indigo-600 bg-gray-50 hover:bg-indigo-50'>
                        {t('auth.common.signin')}
                      </Link>
                    </div>
                    <div onClick={() => buttonRef.current?.click()}>
                      <Link to={routes.signup} className='w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700' aria-label={t('titles.signup')}>
                        {t('common.getStarted')}
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  )
}

Header.propTypes = {
  authenticated: PropTypes.bool.isRequired,
  theme: PropTypes.string.isRequired,
  // themeType: PropTypes.string.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  user: PropTypes.object,
}

Header.defaultProps = {
  user: {},
}

export default memo(Header)
