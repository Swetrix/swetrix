'use client';

import Link from 'next/link';
import { Cards, Card } from 'fumadocs-ui/components/card';
import type { ComponentType } from 'react';
import {
  siAngular,
  siAstro,
  siBigcommerce,
  siCarrd,
  siDjango,
  siDocusaurus,
  siDrupal,
  siFlask,
  siFramer,
  siGatsby,
  siGhost,
  siGoogletagmanager,
  siHugo,
  siJekyll,
  siLaravel,
  siNextdotjs,
  siNuxt,
  siReact,
  siRemix,
  siRubyonrails,
  siShopify,
  siSquarespace,
  siSvelte,
  siVuedotjs,
  siWebflow,
  siWix,
  siWoocommerce,
  siWordpress,
  type SimpleIcon,
} from 'simple-icons';
import GoogleGIcon from './GoogleGIcon';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

const INTEGRATIONS: {
  name: string
  href: string
  icon?: SimpleIcon
  customIcon?: ComponentType<{ className?: string }>
  iconClassName?: string
}[] = [
  {
    name: 'Angular',
    href: '/angular-integration',
    icon: siAngular,
    iconClassName: 'text-[#DD0031]',
  },
  {
    name: 'Astro',
    href: '/astro-integration',
    icon: siAstro,
  },
  {
    name: 'BigCommerce',
    href: '/bigcommerce-integration',
    icon: siBigcommerce,
    iconClassName: 'dark:text-white',
  },
  {
    name: 'Carrd',
    href: '/carrd-integration',
    icon: siCarrd,
  },
  {
    name: 'Django',
    href: '/django-integration',
    icon: siDjango,
    iconClassName: 'dark:text-[#44B78B]',
  },
  {
    name: 'Docusaurus',
    href: '/docusaurus-integration',
    icon: siDocusaurus,
  },
  {
    name: 'Drupal',
    href: '/drupal-integration',
    icon: siDrupal,
  },
  {
    name: 'Flask',
    href: '/flask-integration',
    icon: siFlask,
  },
  {
    name: 'Framer',
    href: '/framer-integration',
    icon: siFramer,
  },
  {
    name: 'Gatsby',
    href: '/gatsby-integration',
    icon: siGatsby,
  },
  {
    name: 'Ghost',
    href: '/ghost-integration',
    icon: siGhost,
    iconClassName: 'dark:text-white',
  },
  {
    name: 'Search Console',
    href: '/integrations/google-search-console',
    customIcon: GoogleGIcon,
  },
  {
    name: 'GTM',
    href: '/gtm-integration',
    icon: siGoogletagmanager,
  },
  {
    name: 'Hugo',
    href: '/hugo-integration',
    icon: siHugo,
  },
  {
    name: 'Jekyll',
    href: '/jekyll-integration',
    icon: siJekyll,
  },
  {
    name: 'Laravel',
    href: '/laravel-integration',
    icon: siLaravel,
  },
  {
    name: 'Next.js',
    href: '/nextjs-integration',
    icon: siNextdotjs,
    iconClassName: 'dark:text-white',
  },
  {
    name: 'Nuxt',
    href: '/nuxt-integration',
    icon: siNuxt,
  },
  {
    name: 'React',
    href: '/react-integration',
    icon: siReact,
  },
  {
    name: 'Remix',
    href: '/remix-integration',
    icon: siRemix,
    iconClassName: 'dark:text-white',
  },
  {
    name: 'Ruby on Rails',
    href: '/ruby-on-rails-integration',
    icon: siRubyonrails,
  },
  {
    name: 'Shopify',
    href: '/shopify-integration',
    icon: siShopify,
  },
  {
    name: 'Squarespace',
    href: '/squarespace-integration',
    icon: siSquarespace,
    iconClassName: 'dark:text-white',
  },
  {
    name: 'SvelteKit',
    href: '/sveltekit-integration',
    icon: siSvelte,
  },
  {
    name: 'Vue',
    href: '/vue-integration',
    icon: siVuedotjs,
  },
  {
    name: 'Webflow',
    href: '/webflow-integration',
    icon: siWebflow,
  },
  {
    name: 'Wix',
    href: '/wix-integration',
    icon: siWix,
  },
  {
    name: 'WooCommerce',
    href: '/woocommerce-integration',
    icon: siWoocommerce,
  },
  {
    name: 'WordPress',
    href: '/wordpress-integration',
    icon: siWordpress,
  },
];

const IntegrationLogo = ({
  icon,
  className,
  style,
}: {
  icon: SimpleIcon
  className?: string
  style?: React.CSSProperties
}) => (
  <svg
    viewBox='0 0 24 24'
    className={className}
    style={style}
    aria-hidden='true'
  >
    <path fill='currentColor' d={icon.path} />
  </svg>
)

export function IntegrationsGrid() {
  return (
    <Cards className="sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {INTEGRATIONS.map((integration) => {
        const icon = integration.customIcon ? (
          <integration.customIcon
            className={cn(integration.iconClassName)}
          />
        ) : integration.icon ? (
          <IntegrationLogo
            icon={integration.icon}
            className={cn(
              'text-(--brand-color)',
              integration.iconClassName,
            )}
            style={
              {
                '--brand-color': `#${integration.icon.hex}`,
              } as React.CSSProperties
            }
          />
        ) : undefined;

        return (
          <Card
            key={integration.name}
            href={integration.href}
            title={integration.name}
            icon={icon}
          />
        );
      })}
    </Cards>
  );
}
