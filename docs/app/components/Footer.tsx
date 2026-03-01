"use client";

import {
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
  DiscordLogoIcon,
  XLogoIcon,
  LinkedinLogoIcon,
  ChartBarIcon,
  WarningIcon,
  ArrowsHorizontalIcon,
  ScalesIcon,
  ChartLineUpIcon,
  CodeIcon,
  MoneyIcon,
  QrCodeIcon,
  PlusCircleIcon,
  type IconProps,
} from "@phosphor-icons/react";
import type { FC, ReactNode } from "react";

const SITE = "https://swetrix.com";
const GITHUB_URL = "https://github.com/Swetrix/swetrix";
const LINKEDIN_URL = "https://www.linkedin.com/company/swetrix/";
const TWITTER_URL = "https://twitter.com/intent/user?screen_name=swetrix";
const DISCORD_URL = "https://discord.gg/ZVK8Tw2E8j";
const STATUSPAGE_URL = "https://stats.uptimerobot.com/33rvmiXXEz";
const DOCS_URL = "https://swetrix.com/docs";

interface NavItem {
  name: string;
  href: string;
  icon: FC<IconProps>;
  iconColor: string;
}

interface LegalItem {
  name: string;
  href: string;
}

const products: NavItem[] = [
  {
    name: "Web Analytics",
    href: SITE,
    icon: ChartBarIcon,
    iconColor: "text-indigo-400",
  },
  {
    name: "Performance monitoring",
    href: `${SITE}/performance`,
    icon: GaugeIcon,
    iconColor: "text-amber-400",
  },
  {
    name: "Error tracking",
    href: `${SITE}/error-tracking`,
    icon: WarningIcon,
    iconColor: "text-rose-400",
  },
  {
    name: "CAPTCHA",
    href: `${SITE}/captcha`,
    icon: ShieldCheckIcon,
    iconColor: "text-emerald-400",
  },
];

const freeTools: NavItem[] = [
  {
    name: "UTM Generator",
    href: `${SITE}/tools/utm-generator`,
    icon: LinkIcon,
    iconColor: "text-violet-400",
  },
  {
    name: "CTR Calculator",
    href: `${SITE}/tools/ctr-calculator`,
    icon: CursorClickIcon,
    iconColor: "text-pink-400",
  },
  {
    name: "ROI Calculator",
    href: `${SITE}/tools/roi-calculator`,
    icon: ChartPieIcon,
    iconColor: "text-teal-400",
  },
  {
    name: "IP Lookup",
    href: `${SITE}/tools/ip-lookup`,
    icon: GlobeIcon,
    iconColor: "text-blue-400",
  },
  {
    name: "Sitemap Validator",
    href: `${SITE}/tools/sitemap-validator`,
    icon: TreeStructureIcon,
    iconColor: "text-lime-400",
  },
  {
    name: "A/B Test Calculator",
    href: `${SITE}/tools/ab-test-calculator`,
    icon: ScalesIcon,
    iconColor: "text-orange-400",
  },
  {
    name: "LTV Calculator",
    href: `${SITE}/tools/ltv-calculator`,
    icon: ChartLineUpIcon,
    iconColor: "text-emerald-400",
  },
  {
    name: "Meta Tags Generator",
    href: `${SITE}/tools/meta-tags-generator`,
    icon: CodeIcon,
    iconColor: "text-sky-400",
  },
  {
    name: "Ad Cost Calculator",
    href: `${SITE}/tools/ad-cost-calculator`,
    icon: MoneyIcon,
    iconColor: "text-yellow-400",
  },
  {
    name: "QR Code Generator",
    href: `${SITE}/tools/qr-code-generator`,
    icon: QrCodeIcon,
    iconColor: "text-fuchsia-400",
  },
  {
    name: "More free tools",
    href: `${SITE}/tools`,
    icon: PlusCircleIcon,
    iconColor: "text-gray-400",
  },
];

const resources: NavItem[] = [
  {
    name: "Documentation",
    href: DOCS_URL,
    icon: BookOpenIcon,
    iconColor: "text-sky-400",
  },
  {
    name: "Pricing",
    href: `${SITE}/#pricing`,
    icon: CurrencyDollarIcon,
    iconColor: "text-emerald-400",
  },
];

const comparisons: NavItem[] = [
  {
    name: "Google Analytics",
    href: `${SITE}/comparison/google-analytics`,
    icon: ArrowsHorizontalIcon,
    iconColor: "text-amber-400",
  },
  {
    name: "Plausible",
    href: `${SITE}/comparison/plausible`,
    icon: ArrowsHorizontalIcon,
    iconColor: "text-violet-400",
  },
  {
    name: "Cloudflare Analytics",
    href: `${SITE}/comparison/cloudflare-analytics`,
    icon: ArrowsHorizontalIcon,
    iconColor: "text-orange-400",
  },
  {
    name: "Fathom Analytics",
    href: `${SITE}/comparison/fathom-analytics`,
    icon: ArrowsHorizontalIcon,
    iconColor: "text-purple-400",
  },
  {
    name: "Simple Analytics",
    href: `${SITE}/comparison/simple-analytics`,
    icon: ArrowsHorizontalIcon,
    iconColor: "text-red-400",
  },
  {
    name: "Vercel Web Analytics",
    href: `${SITE}/comparison/vercel-web-analytics`,
    icon: ArrowsHorizontalIcon,
    iconColor: "text-slate-400",
  },
  {
    name: "Rybbit",
    href: `${SITE}/comparison/rybbit`,
    icon: ArrowsHorizontalIcon,
    iconColor: "text-emerald-400",
  },
  {
    name: "Umami",
    href: `${SITE}/comparison/umami`,
    icon: ArrowsHorizontalIcon,
    iconColor: "text-blue-400",
  },
  {
    name: "Pirsch",
    href: `${SITE}/comparison/pirsch`,
    icon: ArrowsHorizontalIcon,
    iconColor: "text-emerald-400",
  },
  {
    name: "Matomo",
    href: `${SITE}/comparison/matomo`,
    icon: ArrowsHorizontalIcon,
    iconColor: "text-lime-400",
  },
  {
    name: "PostHog",
    href: `${SITE}/comparison/posthog`,
    icon: ArrowsHorizontalIcon,
    iconColor: "text-blue-400",
  },
];

const company: NavItem[] = [
  {
    name: "Open startup",
    href: `${SITE}/open`,
    icon: LockKeyIcon,
    iconColor: "text-teal-400",
  },
  {
    name: "Blog",
    href: `${SITE}/blog`,
    icon: ArticleIcon,
    iconColor: "text-fuchsia-400",
  },
  {
    name: "Contact",
    href: `${SITE}/contact`,
    icon: EnvelopeIcon,
    iconColor: "text-blue-400",
  },
  {
    name: "Status",
    href: STATUSPAGE_URL,
    icon: PulseIcon,
    iconColor: "text-emerald-400",
  },
];

const communityLinks: NavItem[] = [
  {
    name: "GitHub",
    href: GITHUB_URL,
    icon: GithubLogoIcon,
    iconColor: "text-gray-300",
  },
  {
    name: "Discord",
    href: DISCORD_URL,
    icon: DiscordLogoIcon,
    iconColor: "text-indigo-400",
  },
  {
    name: "Twitter / X",
    href: TWITTER_URL,
    icon: XLogoIcon,
    iconColor: "text-gray-300",
  },
  {
    name: "LinkedIn",
    href: LINKEDIN_URL,
    icon: LinkedinLogoIcon,
    iconColor: "text-blue-400",
  },
];

const legal: LegalItem[] = [
  { name: "Privacy", href: `${SITE}/privacy` },
  { name: "Terms", href: `${SITE}/terms` },
  { name: "Cookie Policy", href: `${SITE}/cookie-policy` },
  { name: "Legal notice", href: `${SITE}/imprint` },
];

function FooterLink({
  href,
  icon: Icon,
  iconColor,
  children,
}: {
  href: string;
  icon?: FC<IconProps>;
  iconColor?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className="underline-animate text-sm text-white transition-colors"
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="inline-flex items-center gap-2">
        {Icon && (
          <Icon weight="duotone" className={`h-4 w-4 shrink-0 ${iconColor}`} aria-hidden="true" />
        )}
        <span>{children}</span>
      </span>
    </a>
  );
}

function NavColumn({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold text-gray-200">{title}</h3>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.name}>
            <FooterLink href={item.href} icon={item.icon} iconColor={item.iconColor}>
              {item.name}
            </FooterLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="relative overflow-hidden border-t border-white/10 bg-slate-900 pt-16 pb-8 dark:bg-slate-900/25"
      aria-labelledby="footer-heading"
    >
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>

      <div className="absolute top-full left-1/2 mt-10 h-80 w-xl -translate-x-1/2 bg-[#C8F2F8]/50 mix-blend-plus-lighter blur-[256px]" />
      <div className="absolute top-full left-1/2 size-96 -translate-x-1/2 bg-[#C8F2F8]/50 mix-blend-overlay blur-[256px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-11">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Column 1: Products + Free Tools */}
            <div className="space-y-8">
              <NavColumn title="Products" items={products} />
              <NavColumn title="Free tools" items={freeTools} />
            </div>

            {/* Column 2: Resources + Comparisons */}
            <div className="space-y-8">
              <NavColumn title="Resources" items={resources} />
              <NavColumn title="Comparisons" items={comparisons} />
            </div>

            {/* Column 3: Company + Community */}
            <div className="space-y-8">
              <NavColumn title="Company" items={company} />
              <NavColumn title="Join our community" items={communityLinks} />
            </div>

            {/* Column 4: Logo + description */}
            <div>
              <a
                href={SITE}
                target="_blank"
                rel="noopener noreferrer"
                className="flex -translate-y-[2px] items-center gap-2 select-none"
              >
                <img
                  className="-translate-y-px"
                  height={28}
                  width={24}
                  src="/docs/img/logo/white.png"
                  alt=""
                  loading="lazy"
                />
                <span className="text-2xl leading-5 font-bold text-white">Swetrix</span>
              </a>

              <p className="mt-4 max-w-72 text-sm text-gray-200">
                Independent web analytics that respects user privacy
              </p>

              <div className="mt-6">
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <GithubLogoIcon className="mr-1.5 h-4 w-4" weight="duotone" />
                  <span>Star us on GitHub</span>
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start border-t border-white/10 pt-6 lg:pt-8">
            <div className="flex w-full flex-col items-center gap-4 text-center text-sm md:flex-row md:justify-between md:text-left">
              <div className="text-gray-200">
                &copy; 2021-{year} Swetrix Ltd. All rights reserved.
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {legal.map(({ name, href }) => (
                  <a
                    key={name}
                    href={href}
                    className="underline-animate text-sm text-gray-200 transition-colors hover:text-white"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
