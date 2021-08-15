import React, { memo } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { HashLink } from 'react-router-hash-link'
import { useDispatch } from 'react-redux'

import routes from 'routes'
import { authActions } from 'redux/actions/auth'

const Header = ({ authenticated }) => {
  const dispatch = useDispatch()
  
  const logoutHandler = () => {
    dispatch(authActions.logout())
  }

  return (
    <header className='bg-indigo-600'>
      <nav className='mx-auto px-4 sm:px-6 lg:px-8' aria-label='Top'>
        <div className='w-full py-4 flex items-center justify-between border-b border-indigo-500 lg:border-none'>
          <div className='flex items-center'>
            <Link to={routes.main}>
              <span className='sr-only'>Swetrix</span>
              <img className='h-10 w-28' src='/assets/logo_white.png' alt='' />
            </Link>
            <div className='hidden ml-10 space-x-1 lg:block'>
              <NavLink to={routes.features} className='text-base select-none font-medium text-white hover:text-indigo-50 py-2 px-3 hover:bg-indigo-500 rounded-md' activeClassName='bg-indigo-700 hover:bg-indigo-700' key='Features'>Features</NavLink>
              {authenticated ? (
                <NavLink to={routes.billing} className='text-base select-none font-medium text-white hover:text-indigo-50 py-2 px-3 hover:bg-indigo-500 rounded-md' activeClassName='bg-indigo-700 hover:bg-indigo-700' key='Billing'>Billing</NavLink>
              ) : (
                <>
                  <HashLink to={`${routes.main}#pricing`} className='text-base select-none font-medium text-white hover:text-indigo-50 py-2 px-3 hover:bg-indigo-500 rounded-md' key='Pricing'>Pricing</HashLink>
                  <HashLink to={`${routes.main}#faqs`} className='text-base select-none font-medium text-white hover:text-indigo-50 py-2 px-3 hover:bg-indigo-500 rounded-md' key='FAQs'>FAQs</HashLink>
                </>
              )}
              <NavLink to={routes.docs} className='text-base select-none font-medium text-white hover:text-indigo-50 py-2 px-3 hover:bg-indigo-500 rounded-md' activeClassName='bg-indigo-700 hover:bg-indigo-700' key='Docs'>Docs</NavLink>
            </div>
          </div>
          <div className='flex justify-center flex-wrap ml-1 md:ml-10 space-y-1 sm:space-y-0 space-x-2 md:space-x-4'>
            {authenticated ? (
              <>
                <NavLink to={routes.user_settings} className='text-base select-none font-medium text-white hover:text-indigo-50 py-2 px-3 hover:bg-indigo-500 rounded-md' activeClassName='bg-indigo-700 hover:bg-indigo-700'>You</NavLink>
                <Link to={routes.dashboard} className='inline-block select-none bg-white py-2 px-4 border border-transparent rounded-md text-base font-medium text-indigo-600 hover:bg-indigo-50'>Dashboard</Link>
                <Link to='#' className='text-base font-medium select-none text-white hover:text-indigo-50 py-2 px-3 hover:bg-indigo-500 rounded-md' onClick={logoutHandler}>Logout</Link>
              </>
            ) : (
              <>
                <Link to={routes.signin} className='inline-block select-none bg-indigo-500 mt-1 sm:mt-0 py-2 px-3 md:px-4 border border-transparent rounded-md text-base font-medium text-white hover:bg-opacity-75'>Sign in</Link>
                <Link to={routes.signup} className='inline-block select-none bg-white py-2 px-3 md:px-4 border border-transparent rounded-md text-base font-medium text-indigo-600 hover:bg-indigo-50'>Get started</Link>
              </>
            )}
          </div>
        </div>
        <div className='py-4 flex flex-wrap justify-center space-x-2 lg:hidden'>
          <NavLink to={routes.features} className='text-base select-none font-medium text-white hover:text-indigo-50 py-1 px-3 hover:bg-indigo-500 rounded-md' activeClassName='bg-indigo-700 hover:bg-indigo-700' key='Features'>Features</NavLink>
          {authenticated ? (
            <NavLink to={routes.billing} className='text-base select-none font-medium text-white hover:text-indigo-50 py-1 px-3 hover:bg-indigo-500 rounded-md' activeClassName='bg-indigo-700 hover:bg-indigo-700' key='Billing'>Billing</NavLink>
          ) : (
            <>
              <HashLink to={`${routes.main}#pricing`} className='text-base select-none font-medium text-white hover:text-indigo-50 py-1 px-3 hover:bg-indigo-500 rounded-md' key='Pricing'>Pricing</HashLink>
              <HashLink to={`${routes.main}#faqs`} className='text-base select-none font-medium text-white hover:text-indigo-50 py-1 px-3 hover:bg-indigo-500 rounded-md' key='FAQs'>FAQs</HashLink>
            </>
          )}
          <NavLink to={routes.docs} className='text-base select-none font-medium text-white hover:text-indigo-50 py-1 px-3 hover:bg-indigo-500 rounded-md' activeClassName='bg-indigo-700 hover:bg-indigo-700' key='Docs'>Docs</NavLink>
        </div>
      </nav>
    </header>
  )
}

export default memo(Header)
