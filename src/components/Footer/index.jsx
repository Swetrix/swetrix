import React, { memo } from 'react'
import { Link } from 'react-router-dom'
import { HashLink } from 'react-router-hash-link'
import _map from 'lodash/map'
import Flag from 'react-flagkit'
import PropTypes from 'prop-types'

import routes from 'routes'

const navigation = {
  support: [
    (authenticated) => (authenticated ? { name: 'Billing', href: routes.billing } : { name: 'Pricing', href: `${routes.main}#pricing` }),
    () => ({ name: 'Documentation', href: routes.docs }),
    () => ({ name: 'Guides', href: `${routes.docs}#docs-ht` }),
  ],
  company: [
    { name: 'About', href: '#' },
    { name: 'Blog', href: '#' },
  ],
  legal: [
    { name: 'Privacy', href: routes.privacy },
    { name: 'Terms', href: routes.terms },
  ],
  social: [
    {
      name: 'GitHub',
      href: 'https://github.com/Swetrix',
      icon: (props) => (
        <svg fill='currentColor' viewBox='0 0 24 24' {...props}>
          <path
            fillRule='evenodd'
            d='M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z'
            clipRule='evenodd'
          />
        </svg>
      ),
    },
  ],
}

const Footer = ({ minimal, authenticated }) => {
  if (minimal) {
    return (
      <footer className='bg-gray-800'>
        <div className='max-w-7xl mx-auto py-8 px-4 overflow-hidden sm:px-6 lg:px-8'>
          <nav className='-mx-5 -my-2 flex flex-wrap justify-center' aria-label='Footer'>
            <div className='px-5 py-2'>
              <a href='#/' className='text-base text-gray-300 hover:text-white'>
                About
              </a>
            </div>
            <div className='px-5 py-2'>
              <Link to={routes.privacy} className='text-base text-gray-300 hover:text-white'>
                Privacy Policy
              </Link>
            </div>
            <div className='px-5 py-2'>
              <Link to={routes.terms} className='text-base text-gray-300 hover:text-white'>
                Terms of Service
              </Link>
            </div>
            <div className='px-5 py-2'>
              <Link to={routes.docs} className='text-base text-gray-300 hover:text-white'>
                Docs
              </Link>
            </div>
            <div className='px-5 py-2'>
              <a href='#/' className='text-base text-gray-300 hover:text-white'>
                Blog
              </a>
            </div>
          </nav>
        </div>
      </footer>
    )
  }

  return (
    <footer className='bg-gray-800' aria-labelledby='footer-heading'>
      <h2 id='footer-heading' className='sr-only'>
        Footer
      </h2>
      <div className='w-11/12 mx-auto py-8 px-4 sm:px-6 lg:px-8'>
        <div className='xl:grid xl:grid-cols-3 xl:gap-8'>
          <div className='space-y-8 xl:col-span-1'>
            <img className='h-10 w-28' src='/assets/logo_white.png' height='40' width='112' alt='Swetrix Analytics' />
            <p className='text-gray-300 text-base'>
              The best apps need the best services.<br />
              Swetrix is a powerful analytics platform that respects user privacy.
            </p>
            <div>
              {/* <p className='flex text-gray-300 text-base'>
                Made in
                <a className='flex hover:underline hover:opacity-80 text-blue-400 ml-1' href='https://en.wikipedia.org/wiki/Sweden' target='_blank' rel='noopener noreferrer'>
                  <Flag country='SE' size={18} alt='' />
                  &nbsp;Sweden
                </a>
              </p> */}
              <p className='flex text-gray-300 text-base'>
                Made and hosted in the
                <a className='flex hover:underline hover:opacity-80 text-blue-400 ml-1' href='https://en.wikipedia.org/wiki/European_Union' target='_blank' rel='noopener noreferrer'>
                  <Flag country='EU' size={18} alt='' />
                  &nbsp;European Union
                </a>
              </p>
            </div>
            <div className='flex space-x-6'>
              {_map(navigation.social, (item) => (
                <a key={item.name} href={item.href} target='_blank' rel='noopener noreferrer' className='text-gray-400 hover:text-gray-300'>
                  <span className='sr-only'>{item.name}</span>
                  <item.icon className='h-6 w-6' aria-hidden='true' />
                </a>
              ))}
            </div>
          </div>
          <div className='mt-12 grid grid-cols-2 gap-8 xl:mt-0 xl:col-span-2'>
            <div className='md:grid md:grid-cols-2 md:gap-8'>
              <div />
              <div className='mt-12 md:mt-0'>
                <h3 className='text-sm font-semibold text-gray-400 tracking-wider uppercase'>Support</h3>
                <ul className='mt-4 space-y-4'>
                  {_map(navigation.support, (func) => {
                    const item = func(authenticated)

                    return (
                      <li key={item.name}>
                        <HashLink to={item.href} className='text-base text-gray-300 hover:text-white'>
                          {item.name}
                        </HashLink>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
            <div className='md:grid md:grid-cols-2 md:gap-8'>
              <div>
                <h3 className='text-sm font-semibold text-gray-400 tracking-wider uppercase'>Company</h3>
                <ul className='mt-4 space-y-4'>
                  {_map(navigation.company, (item) => (
                    <li key={item.name}>
                      <Link to={item.href} className='text-base text-gray-300 hover:text-white'>
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className='mt-12 md:mt-0'>
                <h3 className='text-sm font-semibold text-gray-400 tracking-wider uppercase'>Legal</h3>
                <ul className='mt-4 space-y-4'>
                  {_map(navigation.legal, (item) => (
                    <li key={item.name}>
                      <Link to={item.href} className='text-base text-gray-300 hover:text-white'>
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className='mt-8 border-t border-gray-200 pt-8'>
          <p className='text-base text-gray-400 xl:text-center'>&copy; 2021 Swetrix Analytics. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

Footer.propTypes = {
  authenticated: PropTypes.bool.isRequired,
  minimal: PropTypes.bool,
}

Footer.defaultProps = {
  minimal: false,
}

export default memo(Footer)
