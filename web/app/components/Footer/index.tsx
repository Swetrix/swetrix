import { MoonIcon, SunIcon } from '@heroicons/react/24/solid'
import { SiGithub } from '@icons-pack/react-simple-icons'
import _map from 'lodash/map'
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
  DOCS_URL,
  DISCORD_URL,
  CAPTCHA_URL,
  whitelist,
  languages,
  languageFlag,
} from '~/lib/constants'
import { useTheme } from '~/providers/ThemeProvider'
import Dropdown from '~/ui/Dropdown'
import Flag from '~/ui/Flag'
import SwetrixLogo from '~/ui/icons/SwetrixLogo'
import { cn } from '~/utils/generic'
import routesPath from '~/utils/routes'

export const CONTACT_US_URL = `https://swetrix.com${routesPath.contact}`

const products = [
  { key: 'header.solutions.analytics.title', href: routesPath.main, internal: true },
  { key: 'header.solutions.performance.title', href: routesPath.performance, internal: true },
  { key: 'header.solutions.errors.title', href: routesPath.errorTracking, internal: true },
  { key: 'header.solutions.captcha.title', href: CAPTCHA_URL, internal: false },
]

const productionNavigation = {
  products,
  resources: [
    { key: 'docs', href: DOCS_URL, internal: false },
    { key: 'pricing', href: `${routesPath.main}#pricing`, internal: true },
    { key: 'tools', href: routesPath.tools, internal: true },
    { key: 'utm', href: routesPath.utm_generator, internal: true },
    { key: 'ctr', href: routesPath.ctr_calculator, internal: true },
    { key: 'roi', href: routesPath.roi_calculator, internal: true },
  ],
  company: [
    { key: 'about', href: routesPath.about, internal: true },
    { key: 'open', href: routesPath.open, internal: true },
    { key: 'status', href: STATUSPAGE_URL, internal: false },
    { key: 'blog', href: routesPath.blog, internal: true },
    { key: 'contact', href: routesPath.contact, internal: true },
  ],
  community: [
    { name: 'GitHub', href: GITHUB_URL },
    { name: 'Discord', href: DISCORD_URL },
    { name: 'X (Twitter)', href: TWITTER_URL },
    { name: 'LinkedIn', href: LINKEDIN_URL },
  ],
  comparisons: [
    { name: 'Google Analytics', href: '/comparison/google-analytics' },
    { name: 'Plausible', href: '/comparison/plausible' },
    { name: 'Cloudflare Analytics', href: '/comparison/cloudflare-analytics' },
    { name: 'Fathom Analytics', href: '/comparison/fathom-analytics' },
    { name: 'Simple Analytics', href: '/comparison/simple-analytics' },
    { name: 'Vercel Web Analytics', href: '/comparison/vercel-web-analytics' },
    { name: 'Umami', href: '/comparison/umami' },
    { name: 'Matomo', href: '/comparison/matomo' },
  ],
  legal: [
    { key: 'privacy', href: routesPath.privacy, internal: true },
    { key: 'terms', href: routesPath.terms, internal: true },
    { key: 'cookie', href: routesPath.cookiePolicy, internal: true },
    { key: 'data-policy', href: routesPath.dataPolicy, internal: true },
    { key: 'imprint', href: routesPath.imprint, internal: true },
  ],
}

const communityEditionNavigation = {
  products,
  resources: [
    { key: 'docs', href: DOCS_URL, internal: false },
    { key: 'pricing', href: `https://swetrix.com/#pricing`, internal: false },
    { key: 'tools', href: `https://swetrix.com${routesPath.tools}`, internal: false },
    { key: 'utm', href: `https://swetrix.com${routesPath.utm_generator}`, internal: false },
    { key: 'ctr', href: `https://swetrix.com${routesPath.ctr_calculator}`, internal: false },
    { key: 'roi', href: `https://swetrix.com${routesPath.roi_calculator}`, internal: false },
  ],
  company: [
    { key: 'cloudEdition', href: 'https://swetrix.com', internal: false },
    { key: 'blog', href: `https://swetrix.com${routesPath.blog}`, internal: false },
    { key: 'supportUs', href: DONATE_URL, internal: false },
  ],
  community: [
    { name: 'GitHub', href: GITHUB_URL },
    { name: 'Discord', href: DISCORD_URL },
    { name: 'X', href: TWITTER_URL },
    { name: 'LinkedIn', href: LINKEDIN_URL },
  ],
  comparisons: [{ name: 'Plausible', href: 'https://swetrix.com/blog/swetrix-vs-plausible' }],
  legal: [
    { key: 'contact', href: `https://swetrix.com${routesPath.contact}`, internal: false },
    { key: 'imprint', href: `https://swetrix.com${routesPath.imprint}`, internal: false },
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

const FooterLink = ({ href, internal, children }: { href: string; internal: boolean; children: React.ReactNode }) => {
  if (internal) {
    return (
      <Link to={href} className='underline-animate text-sm text-white transition-colors'>
        {children}
      </Link>
    )
  }

  return (
    <a
      href={href}
      className='underline-animate text-sm text-white transition-colors'
      target='_blank'
      rel='noopener noreferrer'
    >
      {children}
    </a>
  )
}

const Footer = ({ showDBIPMessage }: FooterProps) => {
  const { t } = useTranslation('common')
  const year = new Date().getFullYear()

  return (
    <footer
      className='relative overflow-hidden border-t border-white/10 bg-slate-900 pt-16 pb-8'
      aria-labelledby='footer-heading'
    >
      <h2 id='footer-heading' className='sr-only'>
        Footer
      </h2>
      <div className='absolute top-full left-1/2 mt-10 h-[20rem] w-[36rem] -translate-x-1/2 bg-[#C8F2F8]/50 mix-blend-plus-lighter blur-[256px]' />
      <div className='absolute top-full left-1/2 size-96 -translate-x-1/2 bg-[#C8F2F8]/50 mix-blend-overlay blur-[256px]' />

      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <div className='space-y-11'>
          <div className='md:flex md:justify-between md:gap-8 lg:gap-10'>
            <nav className='w-full'>
              <ul className='-mx-3 flex flex-row flex-wrap gap-y-8 lg:flex-nowrap'>
                <li className='flex w-1/2 flex-col px-3 lg:w-1/5'>
                  <ul>
                    <li className='mb-4 text-sm font-bold text-white uppercase'>{t('footer.products')}</li>
                    {_map(navigation.products, ({ key, href, internal }) => (
                      <li key={key} className='mb-2'>
                        <FooterLink href={href} internal={internal}>
                          {t(key)}
                        </FooterLink>
                      </li>
                    ))}
                  </ul>
                </li>

                <li className='flex w-1/2 flex-col px-3 lg:w-1/5'>
                  <ul>
                    <li className='mb-4 text-sm font-bold text-white uppercase'>{t('footer.resources')}</li>
                    {_map(navigation.resources, ({ key, href, internal }) => (
                      <li key={key} className='mb-2'>
                        <FooterLink href={href} internal={internal}>
                          {t(`footer.${key}`)}
                        </FooterLink>
                      </li>
                    ))}
                  </ul>
                </li>

                <li className='flex w-1/2 flex-col px-3 lg:w-1/5'>
                  <ul>
                    <li className='mb-4 text-sm font-bold text-white uppercase'>{t('footer.company')}</li>
                    {_map(navigation.company, ({ key, href, internal }) => (
                      <li key={key} className='mb-2'>
                        <FooterLink href={href} internal={internal}>
                          {t(`footer.${key}`)}
                        </FooterLink>
                      </li>
                    ))}
                  </ul>
                </li>

                <li className='flex w-1/2 flex-col px-3 lg:w-1/5'>
                  <ul>
                    <li className='mb-4 text-sm font-bold text-white uppercase'>{t('footer.community')}</li>
                    {_map(navigation.community, ({ name, href }) => (
                      <li key={name} className='mb-2'>
                        <FooterLink href={href} internal={false}>
                          {name}
                        </FooterLink>
                      </li>
                    ))}
                  </ul>
                </li>

                <li className='flex w-1/2 flex-col px-3 lg:w-1/5'>
                  <ul>
                    <li className='mb-4 text-sm font-bold text-white uppercase'>{t('footer.comparisons')}</li>
                    {_map(navigation.comparisons, ({ name, href }) => (
                      <li key={name} className='mb-2'>
                        <FooterLink href={href} internal={!isSelfhosted}>
                          {name}
                        </FooterLink>
                      </li>
                    ))}
                  </ul>
                </li>
              </ul>
            </nav>

            <div className='mt-12 md:mt-0 md:w-fit md:min-w-[280px]'>
              <SwetrixLogo theme='dark' lazy />

              <p className='mt-4 text-sm text-white'>
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
                          className='text-indigo-400 hover:text-indigo-300'
                        />
                      ),
                    }}
                  />
                ) : (
                  t('footer.description')
                )}
              </p>

              {isSelfhosted ? null : (
                <div className='mt-2 flex text-sm text-white'>
                  <Trans t={t} i18nKey='footer.madeInHostedIn'>
                    <Flag className='mx-[1ch]' country='GB' size={16} alt='GB' aria-hidden='true' />
                    <Flag className='mx-[1ch]' country='UA' size={16} alt='UA' aria-hidden='true' />
                    <Flag className='mx-[1ch]' country='EU' size={16} alt='EU' aria-hidden='true' />
                  </Trans>
                </div>
              )}

              <div className='mt-8 flex w-full justify-end md:w-auto'>
                <a
                  href={GITHUB_URL}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50'
                >
                  <SiGithub className='mr-2 h-4 w-4' />
                  <span>{t('footer.starOnGithub')}</span>
                </a>
              </div>

              <div className='mt-4 flex flex-col justify-end space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4'>
                <LanguageSelector />
                <ThemeSelector />
              </div>
            </div>
          </div>

          <div className='flex flex-col items-start border-t border-white/10 pt-6 lg:pt-8'>
            <div className='flex w-full flex-col items-center gap-4 text-center text-sm text-white md:flex-row md:justify-between md:text-left'>
              <div>
                © {year} {t('footer.copy')}
                {showDBIPMessage && isSelfhosted ? (
                  <>
                    {' · '}
                    <a href='https://db-ip.com' target='_blank' rel='noopener noreferrer' className='underline-animate'>
                      IP Geolocation by DB-IP
                    </a>
                  </>
                ) : null}
              </div>

              <div className='flex flex-wrap items-center justify-center gap-4'>
                {_map(navigation.legal, ({ key, href, internal }) => (
                  <FooterLink key={key} href={href} internal={internal}>
                    {t(`footer.${key}`)}
                  </FooterLink>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default memo(Footer)
