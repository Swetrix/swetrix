import React, { memo } from 'react'
import { Link } from 'react-router-dom'
import { HashLink } from 'react-router-hash-link'
import { useTranslation } from 'react-i18next'
import _map from 'lodash/map'
import Flag from 'react-flagkit'
import PropTypes from 'prop-types'

import routes from 'routes'

const STATUSPAGE_URL = 'https://stats.uptimerobot.com/33rvmiXXEz'

const navigation = {
  support: [
    (authenticated) => (authenticated ? { key: 'billing', href: routes.billing } : { key: 'pricing', href: `${routes.main}#pricing` }),
    () => ({ key: 'docs', href: routes.docs }),
    () => ({ key: 'guides', href: `${routes.docs}#docs-ht` }),
  ],
  company: [
    { key: 'contact', href: routes.contact, internal: true },
    { key: 'status', href: STATUSPAGE_URL },
  ],
  legal: [
    { key: 'privacy', href: routes.privacy },
    { key: 'terms', href: routes.terms },
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
  const { t, i18n: { language } } = useTranslation('common')
  const year = new Date().getFullYear()

  if (minimal) {
    return (
      <footer className='bg-gray-800'>
        <div className='max-w-7xl mx-auto py-8 px-4 overflow-hidden sm:px-6 lg:px-8'>
          <nav className='-mx-5 -my-2 flex flex-wrap justify-center' aria-label='Footer'>
            <div className='px-5 py-2'>
              <Link to={routes.contact} className='text-base text-gray-300 hover:text-white'>
                {t('footer.contact')}
              </Link>
            </div>
            <div className='px-5 py-2'>
              <Link to={routes.privacy} className='text-base text-gray-300 hover:text-white'>
                {t('footer.pp')}
              </Link>
            </div>
            <div className='px-5 py-2'>
              <Link to={routes.terms} className='text-base text-gray-300 hover:text-white'>
                {t('footer.tos')}
              </Link>
            </div>
            <div className='px-5 py-2'>
              <Link to={routes.docs} className='text-base text-gray-300 hover:text-white'>
                {t('common.docs')}
              </Link>
            </div>
            <div className='px-5 py-2'>
              <a href={STATUSPAGE_URL} className='text-base text-gray-300 hover:text-white' target='_blank' rel='noopener noreferrer'>
                {t('footer.status')}
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
            <div className='flex gap-5 flex-wrap'>
              <img className='h-10' src='/assets/logo_white.svg' loading='lazy' alt='Swetrix Analytics' />
              <img className='h-10 w-28' src='/assets/pci.png' height='40' width='112' loading='lazy' alt='PCI Complaint' />
              <img className='h-10 w-28' src='/assets/mc.png' height='40' width='112' loading='lazy' alt='' />
              <img className='h-10 w-28' src='/assets/visa.png' height='40' width='112' loading='lazy' alt='' />
            </div>
            <p className='text-gray-300 text-base'>
              {t('footer.slogan')}
              <br />
              {t('footer.description')}
            </p>
            <div>
              <p className='flex text-gray-300 text-base'>
                {t('footer.madeIn')}
                <a className='flex hover:underline hover:opacity-80 text-blue-400 ml-1' href={`https://${language}.wikipedia.org/wiki/Ukraine`} target='_blank' rel='noopener noreferrer'>
                  <Flag country='UA' size={18} alt='' />
                  &nbsp;
                  {t('footer.ukraine')}
                </a>
              </p>
              <p className='flex text-gray-300 text-base'>
                {t('footer.hostedIn')}
                <a className='flex hover:underline hover:opacity-80 text-blue-400 ml-1' href={`https://${language}.wikipedia.org/wiki/European_Union`} target='_blank' rel='noopener noreferrer'>
                  <Flag country='EU' size={18} alt='' />
                  &nbsp;
                  {t('footer.eu')}
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
                <h3 className='text-sm font-semibold text-gray-400 tracking-wider uppercase'>
                  {t('footer.support')}
                </h3>
                <ul className='mt-4 space-y-4'>
                  {_map(navigation.support, (func) => {
                    const { key, href } = func(authenticated)

                    return (
                      <li key={key}>
                        <HashLink to={href} className='text-base text-gray-300 hover:text-white'>
                          {t(`footer.${key}`)}
                        </HashLink>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
            <div className='md:grid md:grid-cols-2 md:gap-8'>
              <div>
                <h3 className='text-sm font-semibold text-gray-400 tracking-wider uppercase'>
                  {t('footer.company')}
                </h3>
                <ul className='mt-4 space-y-4'>
                  {_map(navigation.company, ({ key, href, internal }) => (
                    <li key={key}>
                      {internal ? (
                        <Link to={href} className='text-base text-gray-300 hover:text-white'>
                          {t(`footer.${key}`)}
                        </Link>
                      ) : (
                        <a href={href} className='text-base text-gray-300 hover:text-white' target='_blank' rel='noopener noreferrer'>
                          {t(`footer.${key}`)}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div className='mt-12 md:mt-0'>
                <h3 className='text-sm font-semibold text-gray-400 tracking-wider uppercase'>
                  {t('footer.legal')}
                </h3>
                <ul className='mt-4 space-y-4'>
                  {_map(navigation.legal, ({ key, href }) => (
                    <li key={key}>
                      <Link to={href} className='text-base text-gray-300 hover:text-white'>
                        {t(`footer.${key}`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className='mt-8 border-t border-gray-200 pt-8'>
          <p className='text-base text-gray-400 xl:text-center'>
            &copy;
            {' '}
            {year}
            {' '}
            {t('footer.copy')}
          </p>
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
