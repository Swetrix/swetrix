import { MoonIcon, SunIcon } from '@heroicons/react/24/solid'
import { SiDiscord, SiGithub, SiX } from '@icons-pack/react-simple-icons'
import _map from 'lodash/map'
import { SquareArrowOutUpRightIcon } from 'lucide-react'
import React, { memo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { changeLanguage } from '~/i18n'
import {
  isSelfhosted,
  DONATE_URL,
  GITHUB_URL,
  LINKEDIN_URL,
  STATUSPAGE_URL,
  TWITTER_URL,
  SWETRIX_VS_GOOGLE,
  SWETRIX_VS_CLOUDFLARE,
  DOCS_URL,
  SWETRIX_VS_SIMPLE_ANALYTICS,
  DISCORD_URL,
  CAPTCHA_URL,
  whitelist,
  languages,
  languageFlag,
} from '~/lib/constants'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
import Dropdown from '~/ui/Dropdown'
import Flag from '~/ui/Flag'
import LinkedIn from '~/ui/icons/LinkedIn'
import SwetrixLogo from '~/ui/icons/SwetrixLogo'
import { cn } from '~/utils/generic'
import routesPath from '~/utils/routes'

const CONTACT_US_URL = `https://swetrix.com${routesPath.contact}`
const ABOUT_US_URL = `https://swetrix.com${routesPath.about}`

const navigation = {
  company: [
    { key: 'about', href: routesPath.about, internal: true },
    { key: 'open', href: routesPath.open, internal: true },
    { key: 'status', href: STATUSPAGE_URL },
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
    } => ({ key: 'data-policy', href: routesPath.dataPolicy, internal: true }),
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
    { key: 'utm', href: routesPath.utm_generator, internal: true },
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
      icon: (props: React.SVGProps<SVGSVGElement>) => <LinkedIn {...props} />,
    },
  ],
}

const LanguageSelector = () => {
  const {
    i18n: { language },
  } = useTranslation('common')

  return (
    <Dropdown
      position='up'
      items={whitelist}
      buttonClassName='!py-2 !px-3 inline-flex items-center rounded-md bg-gray-700 hover:bg-gray-600 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:mr-0 [&>svg]:ml-1 font-medium !text-sm text-gray-300 hover:text-white border border-gray-600'
      title={
        <span className='inline-flex items-center'>
          <Flag className='mr-2 rounded-xs' country={languageFlag[language]} size={16} alt={languages[language]} />
          {languages[language]}
        </span>
      }
      labelExtractor={(lng: string) => (
        <div className='flex items-center'>
          <Flag className='mr-2 rounded-xs' country={languageFlag[lng]} size={16} alt={languageFlag[lng]} />
          {languages[lng]}
        </div>
      )}
      onSelect={(lng: string) => {
        changeLanguage(lng)
      }}
      headless
      className='w-full sm:w-auto'
    />
  )
}

const ThemeSelector = () => {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation('common')

  return (
    <Dropdown
      position='up'
      title={
        <span className='flex items-center'>
          {theme === 'dark' ? (
            <MoonIcon className='mr-2 h-4 w-4 text-gray-300' aria-hidden='true' />
          ) : (
            <SunIcon className='mr-2 h-4 w-4 text-gray-300' aria-hidden='true' />
          )}
          {theme === 'dark' ? t('header.dark') : t('header.light')}
        </span>
      }
      items={[
        { key: 'light', label: t('header.light'), icon: SunIcon },
        { key: 'dark', label: t('header.dark'), icon: MoonIcon },
      ]}
      keyExtractor={(item) => item.key}
      labelExtractor={(item) => (
        <div
          className={cn('flex w-full items-center', {
            'light:text-indigo-600': item.key === 'light',
            'dark:text-indigo-400': item.key === 'dark',
          })}
        >
          <item.icon
            className={cn('mr-2 h-5 w-5', {
              'dark:text-gray-300': item.key === 'light',
              'light:text-gray-400': item.key === 'dark',
            })}
            aria-hidden='true'
          />
          {item.label}
        </div>
      )}
      onSelect={(item) => setTheme(item.key as 'light' | 'dark')}
      className='w-full sm:w-auto'
      headless
      buttonClassName='!py-2 !px-3 inline-flex items-center rounded-md bg-gray-700 hover:bg-gray-600 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:mr-0 [&>svg]:ml-1 font-medium !text-sm text-gray-300 hover:text-white border border-gray-600'
    />
  )
}

const SelfHostedFooter = () => {
  const { t } = useTranslation('common')

  return (
    <footer className='border-t border-gray-200 bg-gray-50 dark:border-slate-800/50 dark:bg-slate-900'>
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
              href={`https://swetrix.com${routesPath.utm_generator}`}
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
        <div className='mt-8 border-t border-gray-200 pt-6 dark:border-slate-800/50'>
          <div className='flex flex-col justify-center space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4'>
            <LanguageSelector />
            <ThemeSelector />
          </div>
        </div>
      </div>
    </footer>
  )
}

interface FooterProps {
  showDBIPMessage?: boolean
}

const Footer = ({ showDBIPMessage }: FooterProps) => {
  const { isAuthenticated } = useAuth()
  const { t } = useTranslation('common')
  const year = new Date().getFullYear()

  if (isSelfhosted) {
    return <SelfHostedFooter />
  }

  return (
    <footer className='dark:bg-gray-750 bg-gray-800' aria-labelledby='footer-heading'>
      <h2 id='footer-heading' className='sr-only'>
        Footer
      </h2>
      <div className='px-4 pt-8 pb-5 sm:px-6 lg:px-8'>
        <div className='xl:grid xl:grid-cols-2 xl:gap-8'>
          <div className='space-y-5 xl:col-span-1'>
            <SwetrixLogo theme='dark' lazy />
            <p className='text-base text-gray-300'>{t('footer.description')}</p>
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
            <div className='flex flex-col space-y-4 pt-10'>
              <div className='flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4'>
                <LanguageSelector />
                <ThemeSelector />
              </div>
              <p className='text-base text-gray-300'>
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
                    const { key, href, internal } = func(isAuthenticated)

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

                  {showDBIPMessage ? (
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
                  ) : null}
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
