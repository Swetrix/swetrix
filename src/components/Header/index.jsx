import React from 'react'
import { Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'

import routes from 'routes'
import { authActions } from 'redux/actions/auth'

const Header = ({ authenticated }) => {
  const dispatch = useDispatch()

  return (
    <header className='bg-indigo-600'>
      <nav className='mx-auto px-4 sm:px-6 lg:px-8' aria-label='Top'>
        <div className='w-full py-4 flex items-center justify-between border-b border-indigo-500 lg:border-none'>
          <div className='flex items-center'>
            <Link to={routes.main}>
              <span className='sr-only'>Analytics</span>
              <img className='h-10 w-auto' src='https://tailwindui.com/img/logos/workflow-mark.svg?color=white' alt='' />
            </Link>
            <div className='hidden ml-10 space-x-1 lg:block'>
              <Link to='/' className='text-base font-medium text-white hover:text-indigo-50 py-2 px-3 hover:bg-indigo-500 rounded-md' key='Features'>Features</Link>
              <Link to='/' className='text-base font-medium text-white hover:text-indigo-50 py-2 px-3 hover:bg-indigo-500 rounded-md' key='Pricing'>Pricing</Link>
              <Link to='/' className='text-base font-medium text-white hover:text-indigo-50 py-2 px-3 hover:bg-indigo-500 rounded-md' key='FAQs'>FAQs</Link>
              <Link to='/' className='text-base font-medium text-white hover:text-indigo-50 py-2 px-3 hover:bg-indigo-500 rounded-md' key='Docs'>Docs</Link>
            </div>
          </div>
          <div className='ml-10 space-x-4'>
            {authenticated ? (
              <>
                <Link to={routes.user_settings} className='text-base font-medium text-white hover:text-indigo-50 py-2 px-3 hover:bg-indigo-500 rounded-md'>You</Link>
                <Link to={routes.dashboard} className='inline-block bg-white py-2 px-4 border border-transparent rounded-md text-base font-medium text-indigo-600 hover:bg-indigo-50'>Dashboard</Link>
                <Link to='#' className='text-base font-medium text-white hover:text-indigo-50 py-2 px-3 hover:bg-indigo-500 rounded-md' onClick={() => dispatch(authActions.logout())}>Logout</Link>
              </>
            ) : (
              <>
                <Link to={routes.signin} className='inline-block bg-indigo-500 py-2 px-4 border border-transparent rounded-md text-base font-medium text-white hover:bg-opacity-75'>Sign in</Link>
                <Link to={routes.signup} className='inline-block bg-white py-2 px-4 border border-transparent rounded-md text-base font-medium text-indigo-600 hover:bg-indigo-50'>Get started</Link>
              </>
            )}
          </div>
        </div>
        <div className='py-4 flex flex-wrap justify-center space-x-2 lg:hidden'>
          <Link to='/' className='text-base font-medium text-white hover:text-indigo-50 py-1 px-3 hover:bg-indigo-500 rounded-md' key='Features'>Features</Link>
          <Link to='/' className='text-base font-medium text-white hover:text-indigo-50 py-1 px-3 hover:bg-indigo-500 rounded-md' key='Pricing'>Pricing</Link>
          <Link to='/' className='text-base font-medium text-white hover:text-indigo-50 py-1 px-3 hover:bg-indigo-500 rounded-md' key='FAQs'>FAQs</Link>
          <Link to='/' className='text-base font-medium text-white hover:text-indigo-50 py-1 px-3 hover:bg-indigo-500 rounded-md' key='Docs'>Docs</Link>
        </div>
      </nav>
    </header>
  )
}

export default React.memo(Header)