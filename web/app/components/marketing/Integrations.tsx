import { ArrowRightIcon } from '@phosphor-icons/react'
import type { ComponentType, CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
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
} from 'simple-icons'

import GoogleGIcon from '~/ui/icons/GoogleG'
import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'

type IntegrationCategory = 'framework' | 'cms' | 'backend' | 'google'

const FEATURED_INTEGRATIONS: {
  name: string
  category: IntegrationCategory
  href: string
  icon?: SimpleIcon
  customIcon?: ComponentType<{ className?: string }>
  iconClassName?: string
}[] = [
  {
    name: 'Angular',
    category: 'framework',
    href: 'https://swetrix.com/docs/angular-integration',
    icon: siAngular,
    iconClassName: 'text-[#DD0031]',
  },
  {
    name: 'Astro',
    category: 'framework',
    href: 'https://swetrix.com/docs/astro-integration',
    icon: siAstro,
  },
  {
    name: 'BigCommerce',
    category: 'cms',
    href: 'https://swetrix.com/docs/bigcommerce-integration',
    icon: siBigcommerce,
    iconClassName: 'dark:text-white',
  },
  {
    name: 'Carrd',
    category: 'cms',
    href: 'https://swetrix.com/docs/carrd-integration',
    icon: siCarrd,
  },
  {
    name: 'Django',
    category: 'backend',
    href: 'https://swetrix.com/docs/django-integration',
    icon: siDjango,
    iconClassName: 'dark:text-[#44B78B]',
  },
  {
    name: 'Docusaurus',
    category: 'framework',
    href: 'https://swetrix.com/docs/docusaurus-integration',
    icon: siDocusaurus,
  },
  {
    name: 'Drupal',
    category: 'cms',
    href: 'https://swetrix.com/docs/drupal-integration',
    icon: siDrupal,
  },
  {
    name: 'Flask',
    category: 'backend',
    href: 'https://swetrix.com/docs/flask-integration',
    icon: siFlask,
  },
  {
    name: 'Framer',
    category: 'cms',
    href: 'https://swetrix.com/docs/framer-integration',
    icon: siFramer,
  },
  {
    name: 'Gatsby',
    category: 'framework',
    href: 'https://swetrix.com/docs/gatsby-integration',
    icon: siGatsby,
  },
  {
    name: 'Ghost',
    category: 'cms',
    href: 'https://swetrix.com/docs/ghost-integration',
    icon: siGhost,
    iconClassName: 'dark:text-white',
  },
  {
    name: 'Search Console',
    category: 'google',
    href: 'https://swetrix.com/docs/integrations/google-search-console',
    customIcon: GoogleGIcon,
  },
  {
    name: 'GTM',
    category: 'google',
    href: 'https://swetrix.com/docs/gtm-integration',
    icon: siGoogletagmanager,
  },
  {
    name: 'Hugo',
    category: 'framework',
    href: 'https://swetrix.com/docs/hugo-integration',
    icon: siHugo,
  },
  {
    name: 'Jekyll',
    category: 'framework',
    href: 'https://swetrix.com/docs/jekyll-integration',
    icon: siJekyll,
  },
  {
    name: 'Laravel',
    category: 'backend',
    href: 'https://swetrix.com/docs/laravel-integration',
    icon: siLaravel,
  },
  {
    name: 'Next.js',
    category: 'framework',
    href: 'https://swetrix.com/docs/nextjs-integration',
    icon: siNextdotjs,
    iconClassName: 'dark:text-white',
  },
  {
    name: 'Nuxt',
    category: 'framework',
    href: 'https://swetrix.com/docs/nuxt-integration',
    icon: siNuxt,
  },
  {
    name: 'React',
    category: 'framework',
    href: 'https://swetrix.com/docs/react-integration',
    icon: siReact,
  },
  {
    name: 'Remix',
    category: 'framework',
    href: 'https://swetrix.com/docs/remix-integration',
    icon: siRemix,
    iconClassName: 'dark:text-white',
  },
  {
    name: 'Ruby on Rails',
    category: 'backend',
    href: 'https://swetrix.com/docs/ruby-on-rails-integration',
    icon: siRubyonrails,
  },
  {
    name: 'Shopify',
    category: 'cms',
    href: 'https://swetrix.com/docs/shopify-integration',
    icon: siShopify,
  },
  {
    name: 'Squarespace',
    category: 'cms',
    href: 'https://swetrix.com/docs/squarespace-integration',
    icon: siSquarespace,
    iconClassName: 'dark:text-white',
  },
  {
    name: 'SvelteKit',
    category: 'framework',
    href: 'https://swetrix.com/docs/sveltekit-integration',
    icon: siSvelte,
  },
  {
    name: 'Vue',
    category: 'framework',
    href: 'https://swetrix.com/docs/vue-integration',
    icon: siVuedotjs,
  },
  {
    name: 'Webflow',
    category: 'cms',
    href: 'https://swetrix.com/docs/webflow-integration',
    icon: siWebflow,
  },
  {
    name: 'Wix',
    category: 'cms',
    href: 'https://swetrix.com/docs/wix-integration',
    icon: siWix,
  },
  {
    name: 'WooCommerce',
    category: 'cms',
    href: 'https://swetrix.com/docs/woocommerce-integration',
    icon: siWoocommerce,
  },
  {
    name: 'WordPress',
    category: 'cms',
    href: 'https://swetrix.com/docs/wordpress-integration',
    icon: siWordpress,
  },
]

const TOTAL_INTEGRATION_GUIDES = 50

const IntegrationLogo = ({
  icon,
  className,
  style,
}: {
  icon: SimpleIcon
  className?: string
  style?: CSSProperties
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

const Integrations = () => {
  const { t } = useTranslation('common')
  const moreIntegrationsCount = Math.max(
    TOTAL_INTEGRATION_GUIDES - FEATURED_INTEGRATIONS.length,
    0,
  )

  return (
    <section className='py-24 sm:py-32'>
      <div className='mx-auto max-w-7xl px-6 lg:px-8'>
        <div className='mx-auto max-w-2xl text-center'>
          <Text
            as='h2'
            size='3xl'
            weight='bold'
            tracking='tight'
            className='sm:text-4xl'
            colour='primary'
          >
            {t('main.integrations.title')}
          </Text>
          <Text as='p' size='lg' colour='secondary' className='mt-6 leading-8'>
            {t('main.integrations.description')}
          </Text>
        </div>

        <div className='mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-3 lg:max-w-none lg:grid-cols-6'>
          {FEATURED_INTEGRATIONS.map((integration) => (
            <a
              key={integration.name}
              href={integration.href}
              target='_blank'
              rel='noopener noreferrer'
              className={cn(
                'group relative flex flex-col items-center justify-center gap-4 rounded-xl p-6 transition-all',
                'border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-slate-900 dark:hover:border-slate-800 dark:hover:bg-slate-900/50',
              )}
            >
              {integration.customIcon ? (
                <integration.customIcon
                  className={cn('size-8', integration.iconClassName)}
                />
              ) : integration.icon ? (
                <IntegrationLogo
                  icon={integration.icon}
                  className={cn(
                    'size-8 text-(--brand-color)',
                    integration.iconClassName,
                  )}
                  style={
                    {
                      '--brand-color': `#${integration.icon.hex}`,
                    } as CSSProperties
                  }
                />
              ) : null}
              <Text as='div' size='sm' weight='semibold' colour='secondary'>
                {integration.name}
              </Text>
            </a>
          ))}
          <a
            href='https://swetrix.com/docs/integrations'
            target='_blank'
            rel='noopener noreferrer'
            className={cn(
              'relative flex flex-col items-center justify-center gap-4 rounded-xl p-6 transition-all',
              'border-2 border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-900/50',
            )}
          >
            <ArrowRightIcon className='size-8 text-gray-900 dark:text-gray-50' />
            <Text as='div' size='sm' weight='semibold' colour='secondary'>
              {t('main.integrations.andMore', { count: moreIntegrationsCount })}
            </Text>
          </a>
        </div>
      </div>
    </section>
  )
}

export default Integrations
