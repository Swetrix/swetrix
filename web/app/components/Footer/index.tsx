import React, { memo } from 'react'
import { Link } from '@remix-run/react'
import { Trans, useTranslation } from 'react-i18next'
import { SiDiscord, SiGithub, SiLinkedin, SiX } from '@icons-pack/react-simple-icons'
import _map from 'lodash/map'
import Flag from '~/ui/Flag'

import {
  isSelfhosted,
  DONATE_URL,
  GITHUB_URL,
  LINKEDIN_URL,
  STATUSPAGE_URL,
  TWITTER_URL,
  UTM_GENERATOR_URL,
  SWETRIX_VS_GOOGLE,
  SWETRIX_VS_CLOUDFLARE,
  DOCS_URL,
  SWETRIX_VS_SIMPLE_ANALYTICS,
  DISCORD_URL,
  CAPTCHA_URL,
} from '~/lib/constants'
import routesPath from '~/utils/routes'
import { SquareArrowOutUpRightIcon } from 'lucide-react'
import SwetrixLogo from '~/ui/icons/SwetrixLogo'

const CONTACT_US_URL = `https://swetrix.com${routesPath.contact}`
const ABOUT_US_URL = `https://swetrix.com${routesPath.about}`

const navigation = {
  company: [
    { key: 'about', href: routesPath.about, internal: true },
    { key: 'changelog', href: routesPath.changelog, internal: true },
    { key: 'open', href: routesPath.open, internal: true },
    { key: 'press', href: routesPath.press, internal: true },
    { key: 'status', href: STATUSPAGE_URL },
    { key: 'donate', href: DONATE_URL },
    { key: 'blog', href: routesPath.blog, internal: true },
  ],
  legal: [
    (
      authenticated: boolean | undefined,
    ): {
      key: string
      href: string
      internal: boolean
    } =>
      authenticated
        ? { key: 'billing', href: routesPath.billing, internal: true }
        : { key: 'pricing', href: `${routesPath.main}#pricing`, internal: true },
    (): {
      key: string
      href: string
      internal: boolean
    } => ({ key: 'docs', href: DOCS_URL, internal: false }),
    (): {
      key: string
      href: string
      internal: boolean
    } => ({ key: 'contact', href: routesPath.contact, internal: true }),
    (): {
      key: string
      href: string
      internal: boolean
    } => ({ key: 'privacy', href: routesPath.privacy, internal: true }),
    (): {
      key: string
      href: string
      internal: boolean
    } => ({ key: 'terms', href: routesPath.terms, internal: true }),
    (): {
      key: string
      href: string
      internal: boolean
    } => ({ key: 'cookie', href: routesPath.cookiePolicy, internal: true }),
    (): {
      key: string
      href: string
      internal: boolean
    } => ({ key: 'imprint', href: routesPath.imprint, internal: true }),
  ],
  features: [
    { value: 'vs Google Analytics', href: SWETRIX_VS_GOOGLE },
    { value: 'vs Cloudflare Analytics', href: SWETRIX_VS_CLOUDFLARE },
    { value: 'vs Simple Analytics', href: SWETRIX_VS_SIMPLE_ANALYTICS },
    { key: 'captcha', href: CAPTCHA_URL, internal: false },
    { key: 'utm', href: UTM_GENERATOR_URL, internal: false },
  ],
  social: [
    {
      name: 'GitHub',
      href: GITHUB_URL,
      icon: (props: React.SVGProps<SVGSVGElement>) => <SiGithub {...props} />,
    },
    {
      name: 'Twitter',
      href: TWITTER_URL,
      icon: (props: React.SVGProps<SVGSVGElement>) => <SiX {...props} />,
    },
    {
      name: 'Discord',
      href: DISCORD_URL,
      icon: (props: React.SVGProps<SVGSVGElement>) => <SiDiscord {...props} />,
    },
    {
      name: 'LinkedIn',
      href: LINKEDIN_URL,
      icon: (props: React.SVGProps<SVGSVGElement>) => <SiLinkedin {...props} />,
    },
  ],
}

const SelfHostedFooter = () => {
  const { t } = useTranslation('common')

  return (
    <footer className='border-t border-gray-200 bg-gray-50 font-mono dark:border-slate-800/50 dark:bg-slate-900'>
      <div className='mx-auto max-w-7xl overflow-hidden px-4 py-8 sm:px-6 lg:px-8'>
        <nav className='-mx-5 -my-2 flex flex-wrap justify-center' aria-label='Footer'>
          <div className='px-5 py-2'>
            <a
              href={CONTACT_US_URL}
              target='_blank'
              rel='noopener noreferrer'
              className='leading-6 text-slate-900 hover:text-slate-700 dark:text-gray-300 dark:hover:text-white'
            >
              {t('footer.contact')}
            </a>
          </div>
          <div className='px-5 py-2'>
            <a
              href={UTM_GENERATOR_URL}
              className='leading-6 text-slate-900 hover:text-slate-700 dark:text-gray-300 dark:hover:text-white'
              target='_blank'
              rel='noopener noreferrer'
              aria-label={`${t('footer.status')} (opens in a new tab)`}
            >
              {t('footer.utm')}
            </a>
          </div>
          <div className='px-5 py-2'>
            <a
              href={DONATE_URL}
              className='leading-6 text-slate-900 hover:text-slate-700 dark:text-gray-300 dark:hover:text-white'
              target='_blank'
              rel='noopener noreferrer'
              aria-label={`${t('footer.status')} (opens in a new tab)`}
            >
              {t('footer.donate')}
            </a>
          </div>
          <div className='px-5 py-2'>
            <a
              href={ABOUT_US_URL}
              target='_blank'
              rel='noopener noreferrer'
              className='leading-6 text-slate-900 hover:text-slate-700 dark:text-gray-300 dark:hover:text-white'
            >
              {t('footer.about')}
            </a>
          </div>
        </nav>
      </div>
    </footer>
  )
}

interface FooterProps {
  authenticated?: boolean
  showDBIPMessage?: boolean
}

const Footer = ({ authenticated, showDBIPMessage }: FooterProps) => {
  const { t } = useTranslation('common')
  const year = new Date().getFullYear()

  if (isSelfhosted) {
    return <SelfHostedFooter />
  }

  return (
    <footer className='dark:bg-gray-750 bg-gray-800 font-mono' aria-labelledby='footer-heading'>
      <h2 id='footer-heading' className='sr-only'>
        Footer
      </h2>
      <div className='w-11/12 px-4 pt-8 pb-5 sm:px-6 lg:px-8'>
        <div className='xl:grid xl:grid-cols-2 xl:gap-8'>
          <div className='space-y-5 xl:col-span-1'>
            <SwetrixLogo theme='dark' lazy />
            <p className='text-base text-gray-300'>
              {t('footer.slogan')}
              <br />
              {t('footer.description')}
            </p>
            <div className='flex text-gray-300'>
              <Trans t={t} i18nKey='footer.madeInHostedIn'>
                <Flag className='mx-[1ch]' country='GB' size={18} alt='GB' aria-hidden='true' />
                <Flag className='mx-[1ch]' country='UA' size={18} alt='UA' aria-hidden='true' />
                <Flag className='mx-[1ch]' country='EU' size={18} alt='EU' aria-hidden='true' />
              </Trans>
            </div>
            <div className='flex space-x-4'>
              {_map(navigation.social, (item) => (
                <a
                  key={item.name}
                  href={item.href}
                  title={item.name}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-gray-400 hover:text-gray-300'
                  aria-label={`${item.name} (opens in a new tab)`}
                >
                  <span className='sr-only'>{item.name}</span>
                  <item.icon className='h-6 w-6' aria-hidden='true' />
                </a>
              ))}
            </div>
            <p className='pt-10 text-base text-gray-300'>
              &copy; {year} {t('footer.copy')}
            </p>
            <a
              href='https://u24.gov.ua/'
              target='_blank'
              rel='noreferrer noopener'
              className='block max-w-max items-center border-b-2 border-transparent text-base text-gray-300 hover:border-gray-300'
            >
              {t('main.ukrSupport')}
              <SquareArrowOutUpRightIcon className='mb-1 ml-1 inline size-4' strokeWidth={1.5} />
            </a>
          </div>
          <div className='mt-12 xl:mt-0'>
            <div className='grid grid-cols-2 gap-8 md:grid-cols-3'>
              <div>
                <h3 className='text-sm font-semibold tracking-wider text-white uppercase'>{t('footer.features')}</h3>
                <ul className='mt-4 space-y-4'>
                  {_map(navigation.features, (data) => {
                    const { value, key, href, internal } = data

                    const displayValue = value || t(`footer.${key}`)

                    return (
                      <li key={displayValue}>
                        {internal ? (
                          <Link to={href} className='text-base text-gray-300 hover:text-white'>
                            {displayValue}
                          </Link>
                        ) : (
                          <a
                            href={href}
                            className='text-base text-gray-300 hover:text-white'
                            target='_blank'
                            rel='noopener noreferrer'
                            aria-label={`${displayValue} (opens in a new tab)`}
                          >
                            {displayValue}
                          </a>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
              <div>
                <h3 className='text-sm font-semibold tracking-wider text-white uppercase'>{t('footer.company')}</h3>
                <ul className='mt-4 space-y-4'>
                  {_map(navigation.company, ({ key, href, internal }) => (
                    <li key={key}>
                      {internal ? (
                        <Link to={href} className='text-base text-gray-300 hover:text-white'>
                          {t(`footer.${key}`)}
                        </Link>
                      ) : (
                        <a
                          href={href}
                          className='text-base text-gray-300 hover:text-white'
                          target='_blank'
                          rel='noopener noreferrer'
                          aria-label={`${t(`footer.${key}`)} (opens in a new tab)`}
                        >
                          {t(`footer.${key}`)}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div className='mt-12 md:mt-0'>
                <h3 className='text-sm font-semibold tracking-wider text-white uppercase'>{t('footer.legal')}</h3>
                <ul className='mt-4 space-y-4'>
                  {_map(navigation.legal, (func) => {
                    const { key, href, internal } = func(authenticated)

                    return (
                      <li key={key}>
                        {internal ? (
                          <Link to={href} className='text-base text-gray-300 hover:text-white'>
                            {t(`footer.${key}`)}
                          </Link>
                        ) : (
                          <a
                            href={href}
                            className='text-base text-gray-300 hover:text-white'
                            target='_blank'
                            rel='noopener noreferrer'
                            aria-label={`${t(`footer.${key}`)} (opens in a new tab)`}
                          >
                            {t(`footer.${key}`)}
                          </a>
                        )}
                      </li>
                    )
                  })}

                  {showDBIPMessage && (
                    <li>
                      <a
                        className='text-base text-gray-300 hover:text-white'
                        target='_blank'
                        rel='noopener noreferrer'
                        href='https://db-ip.com'
                        aria-label='IP Geolocation by DB-IP (opens in a new tab)'
                      >
                        IP Geolocation by DB-IP
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default memo(Footer)
