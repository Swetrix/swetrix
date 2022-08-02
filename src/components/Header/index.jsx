/* eslint-disable jsx-a11y/anchor-is-valid, react/no-unstable-nested-components */
import React, { memo, Fragment, useRef } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { HashLink } from 'react-router-hash-link'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import Flag from 'react-flagkit'
import i18next from 'i18next'
import { Popover, Transition } from '@headlessui/react'
import { MenuIcon, XIcon } from '@heroicons/react/outline'
import { MoonIcon, SunIcon } from '@heroicons/react/solid'

import routes from 'routes'
import { authActions } from 'redux/actions/auth'
import UIActions from 'redux/actions/ui'
import {
  whitelist, languages, languageFlag, isSelfhosted, BLOG_URL,
} from 'redux/constants'
import Dropdown from 'ui/Dropdown'

const Header = ({ authenticated, theme }) => {
  const { t, i18n: { language } } = useTranslation('common')
  const dispatch = useDispatch()
  const buttonRef = useRef()

  const logoutHandler = () => {
    dispatch(authActions.logout())
  }

  const switchTheme = () => {
    dispatch(UIActions.setTheme(theme === 'dark' ? 'light' : 'dark'))
  }

  const onLanguageChange = (id) => {
    i18next.changeLanguage(id)
  }

  return (
    <Popover className='relative bg-white'>
      <header className='bg-indigo-600 dark:bg-gray-750'>
        <nav className='mx-auto px-4 sm:px-6 lg:px-8' aria-label='Top'>
          <div className='w-full py-4 flex items-center justify-between border-b border-indigo-500 dark:border-gray-300 lg:border-none'>
            <div className='flex items-center'>
              <Link to={routes.main}>
                <span className='sr-only'>Swetrix</span>
                <img className='h-10' src='/assets/logo_white.svg' alt='' />
              </Link>
              <div className='hidden ml-10 space-x-1 lg:block'>
                <a href={BLOG_URL} className='text-base select-none font-medium text-white hover:text-indigo-50 py-2 px-3 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' target='_blank' rel='noreferrer noopener'>
                  {t('footer.blog')}
                </a>
                {!isSelfhosted && (
                  authenticated ? (
                    <NavLink to={routes.billing} className='text-base select-none font-medium text-white hover:text-indigo-50 py-2 px-3 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' activeClassName='bg-indigo-700 hover:bg-indigo-700 dark:bg-gray-700' key='Billing'>
                      {t('common.billing')}
                    </NavLink>
                  ) : (
                    <>
                      <NavLink to={routes.features} className='text-base select-none font-medium text-white hover:text-indigo-50 py-2 px-3 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' activeClassName='bg-indigo-700 hover:bg-indigo-700 dark:bg-gray-700' key='Features'>
                        {t('common.features')}
                      </NavLink>
                      <HashLink to={`${routes.main}#pricing`} className='text-base select-none font-medium text-white hover:text-indigo-50 py-2 px-3 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' key='Pricing'>
                        {t('common.pricing')}
                      </HashLink>
                    </>
                  )
                )}
                <NavLink to={routes.docs} className='text-base select-none font-medium text-white hover:text-indigo-50 py-2 px-3 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' activeClassName='bg-indigo-700 hover:bg-indigo-700 dark:bg-gray-700' key='Docs'>
                  {t('common.docs')}
                </NavLink>
              </div>
            </div>
            <div className='hidden md:flex justify-center items-center flex-wrap ml-1 md:ml-10 space-y-1 sm:space-y-0 space-x-2 md:space-x-4'>
              {theme === 'dark' ? (
                <div className='transition-all duration-1000 ease-in-out rotate-180'>
                  <SunIcon onClick={switchTheme} className='h-10 w-10 text-gray-200 hover:text-gray-300 cursor-pointer' />
                </div>
              ) : (
                <div className='transition-all duration-1000 ease-in-out'>
                  <MoonIcon onClick={switchTheme} className='h-10 w-10 text-indigo-100 hover:text-indigo-200 cursor-pointer' />
                </div>
              )}
              <Dropdown
                items={whitelist}
                buttonClassName='flex items-center w-full rounded-md border border-gray-300 shadow-sm px-3 md:px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500 dark:text-gray-50 dark:border-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600'
                selectItemClassName='text-gray-700 block px-4 py-2 text-base cursor-pointer hover:bg-gray-200 dark:text-gray-50 dark:border-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600'
                title={(
                  <>
                    <Flag className='rounded-sm mr-1.5' country={languageFlag[language]} size={21} alt='' />
                    {languages[language]}
                  </>
                )}
                labelExtractor={(lng) => (
                  <div className='flex'>
                    <Flag className='rounded-sm mr-1.5' country={languageFlag[lng]} size={21} alt='' />
                    {languages[lng]}
                  </div>
                )}
                onSelect={onLanguageChange}
              />
              {authenticated ? (
                <>
                  {!isSelfhosted && (
                    <NavLink to={routes.user_settings} className='text-base select-none font-medium text-white hover:text-indigo-50 py-2 px-3 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' activeClassName='bg-indigo-700 hover:bg-indigo-700 dark:bg-gray-700'>
                      {t('common.you')}
                    </NavLink>
                  )}
                  <Link to={routes.dashboard} className='inline-block select-none bg-white py-2 px-4 border border-transparent rounded-md text-base font-medium text-indigo-600 hover:bg-indigo-50 dark:text-gray-50 dark:border-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600'>
                    {t('common.dashboard')}
                  </Link>
                  <Link to='#' className='text-base font-medium select-none text-white hover:text-indigo-50 py-2 px-3 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' onClick={logoutHandler}>
                    {t('common.logout')}
                  </Link>
                </>
              ) : (
                <>
                  <Link to={routes.signin} className='inline-block select-none bg-indigo-500 dark:bg-gray-700 mt-1 sm:mt-0 py-2 px-3 md:px-4 border border-transparent rounded-md text-base font-medium text-white hover:bg-opacity-75 hover:dark:bg-gray-600'>
                    {t('auth.common.signin')}
                  </Link>
                  {!isSelfhosted && (
                    <Link to={routes.signup} className='inline-block select-none bg-white dark:bg-gray-700 dark:text-gray-50 py-2 px-3 md:px-4 border border-transparent rounded-md text-base font-medium text-indigo-600 hover:bg-indigo-50 hover:dark:bg-gray-600'>
                      {t('common.getStarted')}
                    </Link>
                  )}
                </>
              )}
            </div>
            <div className='md:hidden flex justify-center items-center'>
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
                <MenuIcon className='h-6 w-6' aria-hidden='true' />
              </Popover.Button>
            </div>
          </div>
          <div className='py-4 flex flex-wrap justify-center space-x-2 lg:hidden'>
            <a href={BLOG_URL} className='text-base select-none font-medium text-white hover:text-indigo-50 py-1 px-3 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' target='_blank' rel='noreferrer noopener'>
              {t('footer.blog')}
            </a>
            {authenticated ? (
              <NavLink to={routes.billing} className='text-base select-none font-medium text-white hover:text-indigo-50 py-1 px-3 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' activeClassName='bg-indigo-700 hover:bg-indigo-700 dark:bg-gray-700' key='Billing'>
                {t('common.billing')}
              </NavLink>
            ) : (
              <>
                <HashLink to={`${routes.main}#pricing`} className='text-base select-none font-medium text-white hover:text-indigo-50 py-1 px-3 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' key='Pricing'>
                  {t('common.pricing')}
                </HashLink>
                <NavLink to={routes.features} className='text-base select-none font-medium text-white hover:text-indigo-50 py-1 px-3 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' activeClassName='bg-indigo-700 hover:bg-indigo-700 dark:bg-gray-700' key='Features'>
                  {t('common.features')}
                </NavLink>
              </>
            )}
            <NavLink to={routes.docs} className='text-base select-none font-medium text-white hover:text-indigo-50 py-1 px-3 dark:hover:bg-gray-700 hover:bg-indigo-500 rounded-md' activeClassName='bg-indigo-700 hover:bg-indigo-700 dark:bg-gray-700' key='Docs'>
              {t('common.docs')}
            </NavLink>
          </div>
        </nav>
      </header>

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
                    <img className='h-10' src='/assets/logo_white.svg' alt='' />
                  ) : (
                    <img className='h-10' src='/assets/logo_blue.svg' alt='' />
                  )}
                </Link>
                <Popover.Button ref={buttonRef} className='bg-white dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500'>
                  <span className='sr-only'>
                    {t('common.closeMenu')}
                  </span>
                  <XIcon className='h-6 w-6' aria-hidden='true' />
                </Popover.Button>
              </div>
            </div>
            <div className='py-6 px-5 space-y-6'>
              <div className='grid grid-cols-1 gap-y-4'>
                <Dropdown
                  items={whitelist}
                  buttonClassName='flex items-center w-full rounded-md border border-gray-300 shadow-sm px-3 md:px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500 dark:text-gray-50 dark:border-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600'
                  selectItemClassName='text-gray-700 block px-4 py-2 text-base cursor-pointer hover:bg-gray-200 dark:text-gray-50 dark:border-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600'
                  title={(
                    <>
                      <Flag className='rounded-sm mr-1.5' country={languageFlag[language]} size={21} alt='' />
                      {languages[language]}
                    </>
                  )}
                  labelExtractor={(lng) => (
                    <div className='flex'>
                      <Flag className='rounded-sm mr-1.5' country={languageFlag[lng]} size={21} alt='' />
                      {languages[lng]}
                    </div>
                  )}
                  onSelect={onLanguageChange}
                />
                {authenticated ? (
                  <>
                    <div onClick={() => buttonRef.current?.click()}>
                      <Link to={routes.user_settings} className='w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700'>
                        {t('common.you')}
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
                      <Link to={routes.signup} className='w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700'>
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

export default memo(Header)
