import {
  GlobeIcon,
  CalculatorIcon,
  CursorClickIcon,
  LinkIcon,
  FileMagnifyingGlassIcon,
  CaretDownIcon,
  ScalesIcon,
  ChartLineUpIcon,
  CodeIcon,
  MoneyIcon,
  QrCodeIcon,
  BracketsCurlyIcon,
  RobotIcon,
  FunnelIcon,
  ShareNetworkIcon,
  PercentIcon,
  NetworkIcon,
  FileSearchIcon,
  CertificateIcon,
  LinkBreakIcon,
  CookieIcon,
  ShieldCheckIcon,
  GaugeIcon,
  PulseIcon,
  HardDrivesIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from '~/ui/Link'
import { useLocation } from 'react-router'

import { stripLangFromPath } from '~/lib/constants'
import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'

export const TOOLS = [
  {
    id: 'ip-lookup',
    title: 'IP Lookup',
    description: 'Find your IP address and geolocation data',
    href: '/tools/ip-lookup',
    icon: GlobeIcon,
  },
  {
    id: 'dns-lookup',
    title: 'DNS Lookup',
    description: 'Check A, AAAA, MX, NS, TXT, and CAA records',
    href: '/tools/dns-lookup',
    icon: NetworkIcon,
  },
  {
    id: 'sitemap-validator',
    title: 'Sitemap Validator',
    description: 'Validate your sitemap.xml for errors',
    href: '/tools/sitemap-validator',
    icon: FileMagnifyingGlassIcon,
  },
  {
    id: 'http-headers-checker',
    title: 'HTTP Headers Checker',
    description: 'Inspect response, cache, and security headers',
    href: '/tools/http-headers-checker',
    icon: FileSearchIcon,
  },
  {
    id: 'ssl-certificate-checker',
    title: 'SSL Certificate Checker',
    description: 'Check HTTPS certificate issuer and expiry',
    href: '/tools/ssl-certificate-checker',
    icon: CertificateIcon,
  },
  {
    id: 'redirect-checker',
    title: 'Redirect Checker',
    description: 'Trace URL redirects and final destinations',
    href: '/tools/redirect-checker',
    icon: LinkBreakIcon,
  },
  {
    id: 'cookie-checker',
    title: 'Cookie Checker',
    description: 'Inspect Set-Cookie headers and attributes',
    href: '/tools/cookie-checker',
    icon: CookieIcon,
  },
  {
    id: 'csp-checker',
    title: 'CSP Checker',
    description: 'Check and generate Content Security Policy headers',
    href: '/tools/csp-checker',
    icon: ShieldCheckIcon,
  },
  {
    id: 'canonical-url-checker',
    title: 'Canonical URL Checker',
    description: 'Check canonical tags and indexability signals',
    href: '/tools/canonical-url-checker',
    icon: FileSearchIcon,
  },
  {
    id: 'page-size-checker',
    title: 'Page Size Checker',
    description: 'Estimate page weight and linked resource size',
    href: '/tools/page-size-checker',
    icon: GaugeIcon,
  },
  {
    id: 'uptime-sla-calculator',
    title: 'Uptime SLA Calculator',
    description: 'Convert downtime into uptime and SLA allowances',
    href: '/tools/uptime-sla-calculator',
    icon: PulseIcon,
  },
  {
    id: 'website-bandwidth-calculator',
    title: 'Bandwidth Calculator',
    description: 'Estimate hosting bandwidth from traffic and page weight',
    href: '/tools/website-bandwidth-calculator',
    icon: HardDrivesIcon,
  },
  {
    id: 'roi-calculator',
    title: 'ROI Calculator',
    description: 'Calculate ROAS, ROI, CAC, and other metrics',
    href: '/tools/roi-calculator',
    icon: CalculatorIcon,
  },
  {
    id: 'ctr-calculator',
    title: 'CTR Calculator',
    description: 'Calculate your Click-Through Rate',
    href: '/tools/ctr-calculator',
    icon: CursorClickIcon,
  },
  {
    id: 'utm-generator',
    title: 'UTM Generator',
    description: 'Create trackable URLs with UTM parameters',
    href: '/tools/utm-generator',
    icon: LinkIcon,
  },
  {
    id: 'ab-test-calculator',
    title: 'A/B Test Calculator',
    description: 'Calculate statistical significance of your A/B tests',
    href: '/tools/ab-test-calculator',
    icon: ScalesIcon,
  },
  {
    id: 'ltv-calculator',
    title: 'LTV Calculator',
    description: 'Calculate Customer Lifetime Value',
    href: '/tools/ltv-calculator',
    icon: ChartLineUpIcon,
  },
  {
    id: 'meta-tags-generator',
    title: 'Meta Tags Generator',
    description: 'Generate SEO and Open Graph meta tags',
    href: '/tools/meta-tags-generator',
    icon: CodeIcon,
  },
  {
    id: 'ad-cost-calculator',
    title: 'Ad Cost Calculator',
    description: 'Calculate CPM, CPC, and total ad costs',
    href: '/tools/ad-cost-calculator',
    icon: MoneyIcon,
  },
  {
    id: 'qr-code-generator',
    title: 'QR Code Generator',
    description: 'Create customizable QR codes instantly',
    href: '/tools/qr-code-generator',
    icon: QrCodeIcon,
  },
  {
    id: 'schema-markup-generator',
    title: 'Schema Markup Generator',
    description: 'Generate JSON-LD structured data for rich snippets',
    href: '/tools/schema-markup-generator',
    icon: BracketsCurlyIcon,
  },
  {
    id: 'robots-txt-generator',
    title: 'Robots.txt Generator',
    description: 'Create crawler rules to control search engine indexing',
    href: '/tools/robots-txt-generator',
    icon: RobotIcon,
  },
  {
    id: 'conversion-rate-calculator',
    title: 'Conversion Rate Calculator',
    description: 'Calculate conversion rate, traffic needs, and revenue impact',
    href: '/tools/conversion-rate-calculator',
    icon: FunnelIcon,
  },
  {
    id: 'og-preview',
    title: 'Open Graph Preview',
    description:
      'Preview social media cards for Google, Facebook, X, and LinkedIn',
    href: '/tools/og-preview',
    icon: ShareNetworkIcon,
  },
  {
    id: 'percentage-calculator',
    title: 'Percentage Calculator',
    description: 'Calculate percentages, percentage of, and percentage change',
    href: '/tools/percentage-calculator',
    icon: PercentIcon,
  },
] as const

interface ToolsNavProps {
  className?: string
}

export function ToolsNav({ className }: ToolsNavProps) {
  const location = useLocation()
  const strippedPath = stripLangFromPath(location.pathname)

  return (
    <nav
      className={cn(
        'overflow-hidden rounded-xl bg-white ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800',
        className,
      )}
    >
      {TOOLS.map((tool, index) => {
        const isActive = strippedPath === tool.href
        const Icon = tool.icon

        return (
          <Link
            key={tool.id}
            to={tool.href}
            className={cn(
              'flex items-start gap-3 px-4 py-3 transition-colors',
              index !== 0 && 'border-t border-gray-100 dark:border-slate-800',
              isActive
                ? 'bg-gray-50 dark:bg-slate-800/50'
                : 'hover:bg-gray-50 dark:hover:bg-slate-800/30',
            )}
          >
            <Icon
              className={cn(
                'mt-0.5 h-5 w-5 shrink-0',
                isActive
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-400 dark:text-gray-500',
              )}
            />
            <div className='min-w-0'>
              <Text
                as='p'
                size='sm'
                weight='medium'
                colour={isActive ? 'primary' : 'secondary'}
              >
                {tool.title}
              </Text>
              <Text
                as='p'
                size='xs'
                colour={isActive ? 'primary' : 'secondary'}
              >
                {tool.description}
              </Text>
            </div>
          </Link>
        )
      })}
    </nav>
  )
}

export function ToolsNavMobile({ className }: ToolsNavProps) {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const strippedPath = stripLangFromPath(location.pathname)

  const currentTool = TOOLS.find((tool) => tool.href === strippedPath)
  const CurrentIcon = currentTool?.icon

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl bg-white ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-700',
        className,
      )}
    >
      <button
        type='button'
        onClick={() => setIsOpen(!isOpen)}
        className='flex w-full items-center justify-between gap-3 px-4 py-3'
      >
        <div className='flex items-center gap-3'>
          {CurrentIcon && (
            <CurrentIcon className='h-5 w-5 shrink-0 text-gray-900 dark:text-white' />
          )}
          <div className='text-left'>
            <Text as='p' size='sm' weight='medium' colour='primary'>
              {currentTool?.title || 'Tools'}
            </Text>
            <Text as='p' size='xs' colour='secondary'>
              {currentTool?.description || 'Select a tool'}
            </Text>
          </div>
        </div>
        <CaretDownIcon
          className={cn(
            'h-5 w-5 shrink-0 text-gray-400 transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {isOpen && (
        <div className='border-t border-gray-100 dark:border-slate-700'>
          {TOOLS.filter((tool) => tool.href !== strippedPath).map(
            (tool, index) => {
              const Icon = tool.icon

              return (
                <Link
                  key={tool.id}
                  to={tool.href}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/30',
                    index !== 0 &&
                      'border-t border-gray-100 dark:border-slate-700',
                  )}
                >
                  <Icon className='mt-0.5 h-5 w-5 shrink-0 text-gray-400 dark:text-gray-500' />
                  <div className='min-w-0'>
                    <Text as='p' size='sm' weight='medium' colour='secondary'>
                      {tool.title}
                    </Text>
                    <Text as='p' size='xs' colour='secondary'>
                      {tool.description}
                    </Text>
                  </div>
                </Link>
              )
            },
          )}
        </div>
      )}
    </div>
  )
}
