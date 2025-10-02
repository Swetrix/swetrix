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

export const CONTACT_US_URL = `https://swetrix.com${routesPath.contact}`

const productionNavigation = {
  company: [
    { key: 'about', href: routesPath.about, internal: true },
    { key: 'open', href: routesPath.open, internal: true },
    { key: 'status', href: STATUSPAGE_URL, internal: false },
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
    { value: 'vs Google Analytics', href: SWETRIX_VS_GOOGLE, internal: false },
    { value: 'vs Cloudflare Analytics', href: SWETRIX_VS_CLOUDFLARE, internal: false },
    { value: 'vs Simple Analytics', href: SWETRIX_VS_SIMPLE_ANALYTICS, internal: false },
    { key: 'tools', href: routesPath.tools, internal: true },
    { key: 'utm', href: routesPath.utm_generator, internal: true },
    { key: 'ctr', href: routesPath.ctr_calculator, internal: true },
    { key: 'roi', href: routesPath.roi_calculator, internal: true },
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

const communityEditionNavigation = {
  company: [
    { key: 'cloudEdition', href: 'https://swetrix.com', internal: false },
    { key: 'pricing', href: `https://swetrix.com/#pricing`, internal: false },
    { key: 'blog', href: `https://swetrix.com${routesPath.blog}`, internal: false },
    { key: 'supportUs', href: DONATE_URL, internal: false },
  ],
  legal: [
    (): {
      key: string
      href: string
      internal: boolean
    } => ({ key: 'docs', href: DOCS_URL, internal: false }),
    (): {
      key: string
      href: string
      internal: boolean
    } => ({ key: 'contact', href: `https://swetrix.com${routesPath.contact}`, internal: false }),
    (): {
      key: string
      href: string
      internal: boolean
    } => ({ key: 'imprint', href: `https://swetrix.com${routesPath.imprint}`, internal: false }),
  ],
  features: [
    { key: 'tools', href: `https://swetrix.com${routesPath.tools}`, internal: false },
    { key: 'utm', href: `https://swetrix.com${routesPath.utm_generator}`, internal: false },
    { key: 'ctr', href: `https://swetrix.com${routesPath.ctr_calculator}`, internal: false },
    { key: 'roi', href: `https://swetrix.com${routesPath.roi_calculator}`, internal: false },
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

const navigation = isSelfhosted ? communityEditionNavigation : productionNavigation

const LanguageSelector = () => {
  const {
    i18n: { language },
  } = useTranslation('common')

  return (
    <Dropdown
      position='up'
      items={whitelist}
      buttonClassName='!py-2 !px-3 inline-flex items-center rounded-md bg-transparent hover:bg-white/10 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:mr-0 [&>svg]:ml-1 font-medium !text-sm text-white border border-white/20'
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
      buttonClassName='!py-2 !px-3 inline-flex items-center rounded-md bg-transparent hover:bg-white/10 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:mr-0 [&>svg]:ml-1 font-medium !text-sm text-white border border-white/20'
    />
  )
}

interface FooterProps {
  showDBIPMessage?: boolean
}

const Footer = ({ showDBIPMessage }: FooterProps) => {
  const { isAuthenticated } = useAuth()
  const { t } = useTranslation('common')
  const year = new Date().getFullYear()

  return (
    <footer
      className='relative overflow-hidden border-t border-white/10 bg-slate-900 pb-20'
      aria-labelledby='footer-heading'
    >
      <h2 id='footer-heading' className='sr-only'>
        Footer
      </h2>
      <div className='absolute top-full left-1/2 mt-10 h-[20rem] w-[36rem] -translate-x-1/2 bg-[#C8F2F8]/50 mix-blend-plus-lighter blur-[256px]' />
      <div className='absolute top-full left-1/2 size-96 -translate-x-1/2 bg-[#C8F2F8]/50 mix-blend-overlay blur-[256px]' />
      <div className='mx-auto max-w-7xl px-4 pt-8 pb-5 sm:px-6 lg:px-8 lg:pt-12'>
        <div className='xl:grid xl:grid-cols-2 xl:gap-8'>
          <div className='space-y-5 xl:col-span-1'>
            <SwetrixLogo theme='dark' lazy />
            <p className='text-base text-white'>
              {isSelfhosted ? (
                <Trans
                  t={t}
                  i18nKey='footer.ceDescription'
                  components={{
                    url: (
                      <a
                        href='https://swetrix.com'
                        target='_blank'
                        rel='noopener noreferrer'
                        className='underline-animate text-indigo-400'
                      />
                    ),
                  }}
                />
              ) : (
                t('footer.description')
              )}
            </p>
            {isSelfhosted ? null : (
              <div className='flex text-white'>
                <Trans t={t} i18nKey='footer.madeInHostedIn'>
                  <Flag className='mx-[1ch]' country='GB' size={18} alt='GB' aria-hidden='true' />
                  <Flag className='mx-[1ch]' country='UA' size={18} alt='UA' aria-hidden='true' />
                  <Flag className='mx-[1ch]' country='EU' size={18} alt='EU' aria-hidden='true' />
                </Trans>
              </div>
            )}
            <div className='flex space-x-4'>
              {_map(navigation.social, (item) => (
                <a
                  key={item.name}
                  href={item.href}
                  title={item.name}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-white transition-colors hover:text-gray-400'
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
              <p className='text-base text-white'>
                &copy; {year} {t('footer.copy')}
              </p>
              <a
                href='https://u24.gov.ua/'
                target='_blank'
                rel='noreferrer noopener'
                className='underline-animate block max-w-max items-center border-b-2 border-transparent text-base text-white'
              >
                {t('main.ukrSupport')}
                <SquareArrowOutUpRightIcon className='mb-1 ml-1 inline size-4' strokeWidth={1.5} />
              </a>
            </div>
          </div>
          <div className='mt-12 xl:mt-0'>
            <div className='grid grid-cols-2 gap-8 md:grid-cols-3'>
              <div>
                <h3 className='text-sm font-bold tracking-wider text-white uppercase'>{t('footer.features')}</h3>
                <ul className='mt-4 space-y-4'>
                  {_map(navigation.features, (data) => {
                    // @ts-expect-error wrong type
                    const { value, key, href, internal } = data

                    const displayValue = value || t(`footer.${key}`)

                    return (
                      <li key={displayValue}>
                        {internal ? (
                          <Link to={href} className='underline-animate text-base text-white'>
                            {displayValue}
                          </Link>
                        ) : (
                          <a
                            href={href}
                            className='underline-animate text-base text-white'
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
                <h3 className='text-sm font-bold tracking-wider text-white uppercase'>{t('footer.company')}</h3>
                <ul className='mt-4 space-y-4'>
                  {_map(navigation.company, ({ key, href, internal }) => (
                    <li key={key}>
                      {internal ? (
                        <Link to={href} className='underline-animate text-base text-white'>
                          {t(`footer.${key}`)}
                        </Link>
                      ) : (
                        <a
                          href={href}
                          className='underline-animate text-base text-white'
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
                <h3 className='text-sm font-bold tracking-wider text-white uppercase'>{t('footer.legal')}</h3>
                <ul className='mt-4 space-y-4'>
                  {_map(navigation.legal, (func) => {
                    const { key, href, internal } = func(isAuthenticated)

                    return (
                      <li key={key}>
                        {internal ? (
                          <Link to={href} className='underline-animate text-base text-white'>
                            {t(`footer.${key}`)}
                          </Link>
                        ) : (
                          <a
                            href={href}
                            className='underline-animate text-base text-white'
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
                        className='underline-animate text-base text-white'
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
