import {
  MoonIcon,
  SunIcon,
  GithubLogoIcon,
  GaugeIcon,
  ShieldCheckIcon,
  BookOpenIcon,
  CurrencyDollarIcon,
  LinkIcon,
  CursorClickIcon,
  ChartPieIcon,
  GlobeIcon,
  TreeStructureIcon,
  LockKeyIcon,
  PulseIcon,
  ArticleIcon,
  EnvelopeIcon,
  CloudIcon,
  HeartIcon,
  DiscordLogoIcon,
  XLogoIcon,
  LinkedinLogoIcon,
  type IconProps,
  ChartBarIcon,
  WarningIcon,
  ArrowsHorizontalIcon,
} from '@phosphor-icons/react'
import _map from 'lodash/map'
import React, { memo, type FC } from 'react'
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

interface NavItem {
  key?: string
  name?: string
  href: string
  internal?: boolean
  icon: FC<IconProps>
  iconColor: string
}

interface LegalItem {
  key: string
  href: string
  internal: boolean
}

const products: NavItem[] = [
  {
    key: 'header.solutions.analytics.title',
    href: routesPath.main,
    internal: true,
    icon: ChartBarIcon,
    iconColor: 'text-indigo-400',
  },
  {
    key: 'header.solutions.performance.title',
    href: routesPath.performance,
    internal: true,
    icon: GaugeIcon,
    iconColor: 'text-amber-400',
  },
  {
    key: 'header.solutions.errors.title',
    href: routesPath.errorTracking,
    internal: true,
    icon: WarningIcon,
    iconColor: 'text-rose-400',
  },
  {
    key: 'header.solutions.captcha.title',
    href: routesPath.captchaLanding,
    internal: true,
    icon: ShieldCheckIcon,
    iconColor: 'text-emerald-400',
  },
]

const freeTools: NavItem[] = [
  {
    key: 'utm',
    href: isSelfhosted
      ? `https://swetrix.com${routesPath.utm_generator}`
      : routesPath.utm_generator,
    internal: !isSelfhosted,
    icon: LinkIcon,
    iconColor: 'text-violet-400',
  },
  {
    key: 'ctr',
    href: isSelfhosted
      ? `https://swetrix.com${routesPath.ctr_calculator}`
      : routesPath.ctr_calculator,
    internal: !isSelfhosted,
    icon: CursorClickIcon,
    iconColor: 'text-pink-400',
  },
  {
    key: 'roi',
    href: isSelfhosted
      ? `https://swetrix.com${routesPath.roi_calculator}`
      : routesPath.roi_calculator,
    internal: !isSelfhosted,
    icon: ChartPieIcon,
    iconColor: 'text-teal-400',
  },
  {
    key: 'ip-lookup',
    name: 'IP Lookup',
    href: isSelfhosted
      ? `https://swetrix.com${routesPath.ip_lookup}`
      : routesPath.ip_lookup,
    internal: !isSelfhosted,
    icon: GlobeIcon,
    iconColor: 'text-blue-400',
  },
  {
    key: 'sitemap-validator',
    name: 'Sitemap Validator',
    href: isSelfhosted
      ? `https://swetrix.com${routesPath.sitemap_validator}`
      : routesPath.sitemap_validator,
    internal: !isSelfhosted,
    icon: TreeStructureIcon,
    iconColor: 'text-lime-400',
  },
]

const comparisons: NavItem[] = [
  {
    name: 'Google Analytics',
    href: isSelfhosted
      ? `https://swetrix.com/comparison/google-analytics`
      : '/comparison/google-analytics',
    icon: ArrowsHorizontalIcon,
    iconColor: 'text-amber-400',
    internal: !isSelfhosted,
  },
  {
    name: 'Plausible',
    href: isSelfhosted
      ? `https://swetrix.com/comparison/plausible`
      : '/comparison/plausible',
    icon: ArrowsHorizontalIcon,
    iconColor: 'text-violet-400',
    internal: !isSelfhosted,
  },
  {
    name: 'Cloudflare Analytics',
    href: isSelfhosted
      ? `https://swetrix.com/comparison/cloudflare-analytics`
      : '/comparison/cloudflare-analytics',
    icon: ArrowsHorizontalIcon,
    iconColor: 'text-orange-400',
    internal: !isSelfhosted,
  },
  {
    name: 'Fathom Analytics',
    href: isSelfhosted
      ? `https://swetrix.com/comparison/fathom-analytics`
      : '/comparison/fathom-analytics',
    icon: ArrowsHorizontalIcon,
    iconColor: 'text-purple-400',
    internal: !isSelfhosted,
  },
  {
    name: 'Simple Analytics',
    href: isSelfhosted
      ? `https://swetrix.com/comparison/simple-analytics`
      : '/comparison/simple-analytics',
    icon: ArrowsHorizontalIcon,
    iconColor: 'text-red-400',
    internal: !isSelfhosted,
  },
  {
    name: 'Vercel Web Analytics',
    href: isSelfhosted
      ? `https://swetrix.com/comparison/vercel-web-analytics`
      : '/comparison/vercel-web-analytics',
    icon: ArrowsHorizontalIcon,
    iconColor: 'text-slate-400',
    internal: !isSelfhosted,
  },
  {
    name: 'Rybbit',
    href: isSelfhosted
      ? `https://swetrix.com/comparison/rybbit`
      : '/comparison/rybbit',
    icon: ArrowsHorizontalIcon,
    iconColor: 'text-emerald-400',
    internal: !isSelfhosted,
  },
  {
    name: 'Umami',
    href: isSelfhosted
      ? `https://swetrix.com/comparison/umami`
      : '/comparison/umami',
    icon: ArrowsHorizontalIcon,
    iconColor: 'text-blue-400',
    internal: !isSelfhosted,
  },
  {
    name: 'Pirsch',
    href: isSelfhosted
      ? `https://swetrix.com/comparison/pirsch`
      : '/comparison/pirsch',
    icon: ArrowsHorizontalIcon,
    iconColor: 'text-emerald-400',
    internal: !isSelfhosted,
  },
  {
    name: 'Matomo',
    href: isSelfhosted
      ? `https://swetrix.com/comparison/matomo`
      : '/comparison/matomo',
    icon: ArrowsHorizontalIcon,
    iconColor: 'text-lime-400',
    internal: !isSelfhosted,
  },
  {
    name: 'PostHog',
    href: isSelfhosted
      ? `https://swetrix.com/comparison/posthog`
      : '/comparison/posthog',
    icon: ArrowsHorizontalIcon,
    iconColor: 'text-blue-400',
    internal: !isSelfhosted,
  },
]

const community: NavItem[] = [
  {
    name: 'GitHub',
    href: GITHUB_URL,
    icon: GithubLogoIcon,
    iconColor: 'text-gray-300',
  },
  {
    name: 'Discord',
    href: DISCORD_URL,
    icon: DiscordLogoIcon,
    iconColor: 'text-indigo-400',
  },
  {
    name: 'Twitter / X',
    href: TWITTER_URL,
    icon: XLogoIcon,
    iconColor: 'text-gray-300',
  },
  {
    name: 'LinkedIn',
    href: LINKEDIN_URL,
    icon: LinkedinLogoIcon,
    iconColor: 'text-blue-400',
  },
]

const productionNavigation = {
  products,
  freeTools,
  resources: [
    {
      key: 'docs',
      href: DOCS_URL,
      internal: false,
      icon: BookOpenIcon,
      iconColor: 'text-sky-400',
    },
    {
      key: 'pricing',
      href: `${routesPath.main}#pricing`,
      internal: true,
      icon: CurrencyDollarIcon,
      iconColor: 'text-emerald-400',
    },
  ] as NavItem[],
  comparisons,
  company: [
    {
      key: 'open',
      href: routesPath.open,
      internal: true,
      icon: LockKeyIcon,
      iconColor: 'text-teal-400',
    },
    {
      key: 'blog',
      href: routesPath.blog,
      internal: true,
      icon: ArticleIcon,
      iconColor: 'text-fuchsia-400',
    },
    {
      key: 'contact',
      href: routesPath.contact,
      internal: true,
      icon: EnvelopeIcon,
      iconColor: 'text-blue-400',
    },
    {
      key: 'status',
      href: STATUSPAGE_URL,
      internal: false,
      icon: PulseIcon,
      iconColor: 'text-emerald-400',
    },
  ] as NavItem[],
  community,
  legal: [
    { key: 'privacy', href: routesPath.privacy, internal: true },
    { key: 'terms', href: routesPath.terms, internal: true },
    { key: 'cookie', href: routesPath.cookiePolicy, internal: true },
    { key: 'imprint', href: routesPath.imprint, internal: true },
  ] as LegalItem[],
}

const communityEditionNavigation = {
  products,
  freeTools,
  resources: [
    {
      key: 'docs',
      href: DOCS_URL,
      internal: false,
      icon: BookOpenIcon,
      iconColor: 'text-sky-400',
    },
    {
      key: 'pricing',
      href: `https://swetrix.com/#pricing`,
      internal: false,
      icon: CurrencyDollarIcon,
      iconColor: 'text-emerald-400',
    },
  ] as NavItem[],
  comparisons,
  company: [
    {
      key: 'cloudEdition',
      href: 'https://swetrix.com',
      internal: false,
      icon: CloudIcon,
      iconColor: 'text-sky-400',
    },
    {
      key: 'blog',
      href: `https://swetrix.com${routesPath.blog}`,
      internal: false,
      icon: ArticleIcon,
      iconColor: 'text-amber-400',
    },
    {
      key: 'supportUs',
      href: DONATE_URL,
      internal: false,
      icon: HeartIcon,
      iconColor: 'text-rose-400',
    },
  ] as NavItem[],
  community,
  legal: [
    {
      key: 'contact',
      href: `https://swetrix.com${routesPath.contact}`,
      internal: false,
    },
    {
      key: 'imprint',
      href: `https://swetrix.com${routesPath.imprint}`,
      internal: false,
    },
  ] as LegalItem[],
}

const navigation = isSelfhosted
  ? communityEditionNavigation
  : productionNavigation

const LanguageSelector = () => {
  const {
    i18n: { language },
  } = useTranslation('common')

  return (
    <Dropdown
      position='up'
      items={whitelist}
      buttonClassName='!py-2 !px-3 inline-flex items-center rounded-md bg-transparent hover:bg-slate-800/50  [&>svg]:w-4 [&>svg]:h-4 [&>svg]:mr-0 [&>svg]:ml-1 font-medium !text-sm text-white border border-white/20'
      title={
        <span className='inline-flex items-center'>
          <Flag
            className='mr-2 rounded-xs'
            country={languageFlag[language]}
            size={16}
            alt={languages[language]}
          />
          {languages[language]}
        </span>
      }
      labelExtractor={(lng: string) => (
        <div className='flex items-center'>
          <Flag
            className='mr-2 rounded-xs'
            country={languageFlag[lng]}
            size={16}
            alt={languageFlag[lng]}
          />
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
            <MoonIcon
              className='mr-2 h-4 w-4 text-gray-300'
              aria-hidden='true'
            />
          ) : (
            <SunIcon
              className='mr-2 h-4 w-4 text-gray-300'
              aria-hidden='true'
            />
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
      buttonClassName='!py-2 !px-3 inline-flex items-center rounded-md bg-transparent hover:bg-slate-800/50 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:mr-0 [&>svg]:ml-1 font-medium !text-sm text-white border border-white/20'
    />
  )
}

interface FooterProps {
  showDBIPMessage?: boolean
}

const FooterLink = ({
  href,
  internal,
  icon: Icon,
  iconColor,
  children,
}: {
  href: string
  internal: boolean
  icon?: FC<IconProps>
  iconColor?: string
  children: React.ReactNode
}) => {
  const content = (
    <span className='inline-flex items-center gap-2'>
      {Icon && (
        <Icon
          weight='duotone'
          className={cn('h-4 w-4 shrink-0', iconColor)}
          aria-hidden='true'
        />
      )}
      <span>{children}</span>
    </span>
  )

  if (internal) {
    return (
      <Link
        to={href}
        className='underline-animate text-sm text-white transition-colors'
      >
        {content}
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
      {content}
    </a>
  )
}

const SimpleLegalLink = ({
  href,
  internal,
  children,
}: {
  href: string
  internal: boolean
  children: React.ReactNode
}) => {
  if (internal) {
    return (
      <Link
        to={href}
        className='underline-animate text-sm text-gray-200 transition-colors hover:text-white'
      >
        {children}
      </Link>
    )
  }

  return (
    <a
      href={href}
      className='underline-animate text-sm text-gray-200 transition-colors hover:text-white'
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
      className='relative overflow-hidden border-t border-white/10 bg-slate-900 pt-16 pb-8 dark:bg-slate-800/25'
      aria-labelledby='footer-heading'
    >
      <h2 id='footer-heading' className='sr-only'>
        Footer
      </h2>
      <div className='absolute top-full left-1/2 mt-10 h-[20rem] w-[36rem] -translate-x-1/2 bg-[#C8F2F8]/50 mix-blend-plus-lighter blur-[256px]' />
      <div className='absolute top-full left-1/2 size-96 -translate-x-1/2 bg-[#C8F2F8]/50 mix-blend-overlay blur-[256px]' />

      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <div className='space-y-11'>
          <div className='grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4'>
            {/* Column 1: Products + Free Tools */}
            <div className='space-y-8'>
              <div>
                <h3 className='mb-4 text-sm font-semibold text-gray-200'>
                  {t('footer.products')}
                </h3>
                <ul className='space-y-2.5'>
                  {_map(
                    navigation.products,
                    ({ key, href, internal, icon, iconColor }) => (
                      <li key={key}>
                        <FooterLink
                          href={href}
                          internal={internal ?? false}
                          icon={icon}
                          iconColor={iconColor}
                        >
                          {t(key as string)}
                        </FooterLink>
                      </li>
                    ),
                  )}
                </ul>
              </div>

              <div>
                <h3 className='mb-4 text-sm font-semibold text-gray-200'>
                  {t('footer.freeTools')}
                </h3>
                <ul className='space-y-2.5'>
                  {_map(
                    navigation.freeTools,
                    ({ key, name, href, internal, icon, iconColor }) => (
                      <li key={key}>
                        <FooterLink
                          href={href}
                          internal={internal ?? false}
                          icon={icon}
                          iconColor={iconColor}
                        >
                          {name || t(`footer.${key}`)}
                        </FooterLink>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </div>

            {/* Column 2: Resources + Comparisons */}
            <div className='space-y-8'>
              <div>
                <h3 className='mb-4 text-sm font-semibold text-gray-200'>
                  {t('footer.resources')}
                </h3>
                <ul className='space-y-2.5'>
                  {_map(
                    navigation.resources,
                    ({ key, name, href, internal, icon, iconColor }) => (
                      <li key={key}>
                        <FooterLink
                          href={href}
                          internal={internal ?? false}
                          icon={icon}
                          iconColor={iconColor}
                        >
                          {name || t(`footer.${key}`)}
                        </FooterLink>
                      </li>
                    ),
                  )}
                </ul>
              </div>

              <div>
                <h3 className='mb-4 text-sm font-semibold text-gray-200'>
                  {t('footer.comparisons')}
                </h3>
                <ul className='space-y-2.5'>
                  {_map(
                    navigation.comparisons,
                    ({ name, href, icon, iconColor }) => (
                      <li key={name}>
                        <FooterLink
                          href={href}
                          internal={!isSelfhosted}
                          icon={icon}
                          iconColor={iconColor}
                        >
                          {name}
                        </FooterLink>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </div>

            {/* Column 3: Company + Community */}
            <div className='space-y-8'>
              <div>
                <h3 className='mb-4 text-sm font-semibold text-gray-200'>
                  {t('footer.company')}
                </h3>
                <ul className='space-y-2.5'>
                  {_map(
                    navigation.company,
                    ({ key, href, internal, icon, iconColor }) => (
                      <li key={key}>
                        <FooterLink
                          href={href}
                          internal={internal ?? false}
                          icon={icon}
                          iconColor={iconColor}
                        >
                          {t(`footer.${key}`)}
                        </FooterLink>
                      </li>
                    ),
                  )}
                </ul>
              </div>

              <div>
                <h3 className='mb-4 text-sm font-semibold text-gray-200'>
                  {t('footer.community')}
                </h3>
                <ul className='space-y-2.5'>
                  {_map(
                    navigation.community,
                    ({ name, href, icon, iconColor }) => (
                      <li key={name}>
                        <FooterLink
                          href={href}
                          internal={false}
                          icon={icon}
                          iconColor={iconColor}
                        >
                          {name}
                        </FooterLink>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </div>

            {/* Column 4: About / Logo */}
            <div>
              <SwetrixLogo theme='dark' lazy />

              <p className='mt-4 max-w-72 text-sm text-gray-200'>
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
                <div className='mt-2 flex text-sm text-gray-200'>
                  <Trans t={t} i18nKey='footer.madeInHostedIn'>
                    <Flag
                      className='mx-[1ch]'
                      country='GB'
                      size={16}
                      alt='GB'
                      aria-hidden='true'
                    />
                    <Flag
                      className='mx-[1ch]'
                      country='UA'
                      size={16}
                      alt='UA'
                      aria-hidden='true'
                    />
                    <Flag
                      className='mx-[1ch]'
                      country='EU'
                      size={16}
                      alt='EU'
                      aria-hidden='true'
                    />
                  </Trans>
                </div>
              )}

              <div className='mt-6'>
                <a
                  href={GITHUB_URL}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50'
                >
                  <GithubLogoIcon className='mr-1.5 h-4 w-4' weight='duotone' />
                  <span>{t('footer.starOnGithub')}</span>
                </a>
              </div>

              <div className='mt-4 flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3'>
                <LanguageSelector />
                <ThemeSelector />
              </div>
            </div>
          </div>

          <div className='flex flex-col items-start border-t border-white/10 pt-6 lg:pt-8'>
            <div className='flex w-full flex-col items-center gap-4 text-center text-sm md:flex-row md:justify-between md:text-left'>
              <div className='text-gray-200'>
                © {year} {t('footer.copy')}
                {showDBIPMessage && isSelfhosted ? (
                  <>
                    {' · '}
                    <a
                      href='https://db-ip.com'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-gray-200 transition-colors hover:text-white'
                    >
                      IP Geolocation by DB-IP
                    </a>
                  </>
                ) : null}
              </div>

              <div className='flex flex-wrap items-center justify-center gap-x-6 gap-y-2'>
                {_map(navigation.legal, ({ key, href, internal }) => (
                  <SimpleLegalLink key={key} href={href} internal={internal}>
                    {t(`footer.${key}`)}
                  </SimpleLegalLink>
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
