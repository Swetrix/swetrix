import {
  CodeIcon,
  PackageIcon,
  TagIcon,
  SquaresFourIcon,
  ArrowSquareOutIcon,
  CopyIcon,
  CheckIcon,
  SparkleIcon,
} from '@phosphor-icons/react'
import type { CSSProperties } from 'react'
import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  siAngular,
  siAstro,
  siBigcommerce,
  siCarrd,
  siDjango,
  siDocusaurus,
  siDotnet,
  siDrupal,
  siEleventy,
  siExpress,
  siFastapi,
  siFastify,
  siFlask,
  siFramer,
  siGatsby,
  siGhost,
  siGitbook,
  siHexo,
  siHtmx,
  siHugo,
  siJekyll,
  siJoomla,
  siLaravel,
  siNestjs,
  siNextdotjs,
  siNextra,
  siNuxt,
  siPreact,
  siPrestashop,
  siQwik,
  siReact,
  siRemix,
  siRubyonrails,
  siShopify,
  siSolid,
  siSquarespace,
  siSvelte,
  siVitepress,
  siVuedotjs,
  siWebflow,
  siWix,
  siWoocommerce,
  siWordpress,
  type SimpleIcon,
} from 'simple-icons'

import {
  API_URL,
  DOCS_URL,
  INTEGRATIONS_URL,
  isSelfhosted,
} from '~/lib/constants'
import { Badge } from '~/ui/Badge'
import CodeBlock from '~/ui/CodeBlock'
import CopyButton from '~/ui/CopyButton'
import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'

const API_URL_WITHOUT_TRAILING_SLASH = API_URL.endsWith('/')
  ? API_URL.slice(0, -1)
  : API_URL

const getSnippet = (pid: string) => {
  if (isSelfhosted) {
    return `<script src="https://swetrix.org/swetrix.js" defer></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
  swetrix.init('${pid}', {
    apiURL: '${API_URL_WITHOUT_TRAILING_SLASH}/v1/log',
  })
  swetrix.trackViews()
})
</script>

<noscript>
<img
  src="${API_URL_WITHOUT_TRAILING_SLASH}/log/noscript?pid=${pid}"
  alt=""
  referrerpolicy="no-referrer-when-downgrade"
/>
</noscript>`
  }

  return `<script src="https://swetrix.org/swetrix.js" defer></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
  swetrix.init('${pid}')
  swetrix.trackViews()
})
</script>

<noscript>
<img
  src="https://api.swetrix.com/log/noscript?pid=${pid}"
  alt=""
  referrerpolicy="no-referrer-when-downgrade"
/>
</noscript>`
}

type TrackingTab = 'script' | 'npm' | 'gtm' | 'ai' | 'platforms'

const TRACKING_TABS: {
  id: TrackingTab
  labelKey: string
  icon: React.ElementType
}[] = [
  {
    id: 'script',
    labelKey: 'onboarding.installTracking.tabs.script',
    icon: CodeIcon,
  },
  {
    id: 'npm',
    labelKey: 'onboarding.installTracking.tabs.npm',
    icon: PackageIcon,
  },
  {
    id: 'gtm',
    labelKey: 'onboarding.installTracking.tabs.tagManager',
    icon: TagIcon,
  },
  {
    id: 'ai',
    labelKey: 'onboarding.installTracking.tabs.ai',
    icon: SparkleIcon,
  },
  {
    id: 'platforms',
    labelKey: 'onboarding.installTracking.tabs.platforms',
    icon: SquaresFourIcon,
  },
]

const PLATFORM_INTEGRATIONS: {
  name: string
  href: string
  icon: SimpleIcon
  iconClassName?: string
}[] = [
  {
    name: 'WordPress',
    href: 'https://swetrix.com/docs/wordpress-integration',
    icon: siWordpress,
  },
  {
    name: 'Shopify',
    href: 'https://swetrix.com/docs/shopify-integration',
    icon: siShopify,
  },
  {
    name: 'Webflow',
    href: 'https://swetrix.com/docs/webflow-integration',
    icon: siWebflow,
  },
  {
    name: 'Wix',
    href: 'https://swetrix.com/docs/wix-integration',
    icon: siWix,
  },
  {
    name: 'Squarespace',
    href: 'https://swetrix.com/docs/squarespace-integration',
    icon: siSquarespace,
    iconClassName: 'dark:text-white',
  },
  {
    name: 'Ghost',
    href: 'https://swetrix.com/docs/ghost-integration',
    icon: siGhost,
    iconClassName: 'dark:text-white',
  },
  {
    name: 'Framer',
    href: 'https://swetrix.com/docs/framer-integration',
    icon: siFramer,
  },
  {
    name: 'Drupal',
    href: 'https://swetrix.com/docs/drupal-integration',
    icon: siDrupal,
  },
  {
    name: 'Joomla',
    href: 'https://swetrix.com/docs/joomla-integration',
    icon: siJoomla,
  },
  {
    name: 'BigCommerce',
    href: 'https://swetrix.com/docs/bigcommerce-integration',
    icon: siBigcommerce,
    iconClassName: 'dark:text-white',
  },
  {
    name: 'WooCommerce',
    href: 'https://swetrix.com/docs/woocommerce-integration',
    icon: siWoocommerce,
  },
  {
    name: 'PrestaShop',
    href: 'https://swetrix.com/docs/prestashop-integration',
    icon: siPrestashop,
  },
  {
    name: 'Carrd',
    href: 'https://swetrix.com/docs/carrd-integration',
    icon: siCarrd,
  },
  {
    name: 'React',
    href: 'https://swetrix.com/docs/react-integration',
    icon: siReact,
  },
  {
    name: 'Next.js',
    href: 'https://swetrix.com/docs/nextjs-integration',
    icon: siNextdotjs,
    iconClassName: 'dark:text-white',
  },
  {
    name: 'Vue',
    href: 'https://swetrix.com/docs/vue-integration',
    icon: siVuedotjs,
  },
  {
    name: 'Nuxt',
    href: 'https://swetrix.com/docs/nuxt-integration',
    icon: siNuxt,
  },
  {
    name: 'Angular',
    href: 'https://swetrix.com/docs/angular-integration',
    icon: siAngular,
    iconClassName: 'text-[#DD0031]',
  },
  {
    name: 'SvelteKit',
    href: 'https://swetrix.com/docs/sveltekit-integration',
    icon: siSvelte,
  },
  {
    name: 'Remix',
    href: 'https://swetrix.com/docs/remix-integration',
    icon: siRemix,
    iconClassName: 'dark:text-white',
  },
  {
    name: 'Gatsby',
    href: 'https://swetrix.com/docs/gatsby-integration',
    icon: siGatsby,
  },
  {
    name: 'Astro',
    href: 'https://swetrix.com/docs/astro-integration',
    icon: siAstro,
  },
  {
    name: 'Preact',
    href: 'https://swetrix.com/docs/preact-integration',
    icon: siPreact,
  },
  {
    name: 'Qwik',
    href: 'https://swetrix.com/docs/qwik-integration',
    icon: siQwik,
  },
  {
    name: 'Solid.js',
    href: 'https://swetrix.com/docs/solidjs-integration',
    icon: siSolid,
  },
  {
    name: 'htmx',
    href: 'https://swetrix.com/docs/htmx-integration',
    icon: siHtmx,
    iconClassName: 'dark:text-white',
  },
  {
    name: 'Docusaurus',
    href: 'https://swetrix.com/docs/docusaurus-integration',
    icon: siDocusaurus,
  },
  {
    name: 'Hugo',
    href: 'https://swetrix.com/docs/hugo-integration',
    icon: siHugo,
  },
  {
    name: 'Jekyll',
    href: 'https://swetrix.com/docs/jekyll-integration',
    icon: siJekyll,
  },
  {
    name: 'Eleventy',
    href: 'https://swetrix.com/docs/eleventy-integration',
    icon: siEleventy,
    iconClassName: 'dark:text-white',
  },
  {
    name: 'VitePress',
    href: 'https://swetrix.com/docs/vitepress-integration',
    icon: siVitepress,
  },
  {
    name: 'Nextra',
    href: 'https://swetrix.com/docs/nextra-integration',
    icon: siNextra,
  },
  {
    name: 'Hexo',
    href: 'https://swetrix.com/docs/hexo-integration',
    icon: siHexo,
  },
  {
    name: 'GitBook',
    href: 'https://swetrix.com/docs/gitbook-integration',
    icon: siGitbook,
  },
  {
    name: 'Laravel',
    href: 'https://swetrix.com/docs/laravel-integration',
    icon: siLaravel,
  },
  {
    name: 'Django',
    href: 'https://swetrix.com/docs/django-integration',
    icon: siDjango,
    iconClassName: 'dark:text-[#44B78B]',
  },
  {
    name: 'Flask',
    href: 'https://swetrix.com/docs/flask-integration',
    icon: siFlask,
  },
  {
    name: 'Ruby on Rails',
    href: 'https://swetrix.com/docs/ruby-on-rails-integration',
    icon: siRubyonrails,
  },
  {
    name: 'Express',
    href: 'https://swetrix.com/docs/express-integration',
    icon: siExpress,
    iconClassName: 'dark:text-white',
  },
  {
    name: 'NestJS',
    href: 'https://swetrix.com/docs/nestjs-integration',
    icon: siNestjs,
  },
  {
    name: 'Fastify',
    href: 'https://swetrix.com/docs/fastify-integration',
    icon: siFastify,
    iconClassName: 'dark:text-white',
  },
  {
    name: 'FastAPI',
    href: 'https://swetrix.com/docs/fastapi-integration',
    icon: siFastapi,
  },
  {
    name: 'ASP.NET',
    href: 'https://swetrix.com/docs/aspnet-integration',
    icon: siDotnet,
  },
]

const PlatformIcon = ({
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

const getNpmSnippet = (pid: string) =>
  `import * as Swetrix from 'swetrix'

Swetrix.init('${pid}'${isSelfhosted ? `, {\n  apiURL: '${API_URL_WITHOUT_TRAILING_SLASH}/v1/log',\n}` : ''})
Swetrix.trackViews()`

const getGtmSnippet = (pid: string) =>
  `<script>
  (function () {
    var el = document.createElement("script");
    el.src = "https://swetrix.org/swetrix.js";
    el.onload = function () {
      swetrix.init("${pid}"${isSelfhosted ? `, {\n        apiURL: "${API_URL_WITHOUT_TRAILING_SLASH}/v1/log",\n      }` : ''});
      swetrix.trackViews();
    };
    document.head.appendChild(el);
  })();
</script>`

const getCspInstruction = () => {
  if (isSelfhosted) {
    return `If a Content Security Policy exists, preserve the current policy and add https://swetrix.org to script-src when using the script tag. Add the Swetrix API origin used by apiURL (${API_URL_WITHOUT_TRAILING_SLASH}) to connect-src, and to img-src if you keep the noscript pixel.`
  }

  return 'If a Content Security Policy exists, preserve the current policy and add https://swetrix.org to script-src when using the script tag. Add https://api.swetrix.com to connect-src, and to img-src if you keep the noscript pixel.'
}

const getAiInstallPrompt = (
  pid: string,
) => `Install Swetrix analytics in this codebase.

Use these exact Swetrix values:
- Project ID: "${pid}"
- Browser script URL: "https://swetrix.org/swetrix.js"

Goal:
- Track page views on every public page.
- Install Swetrix in the shared/root location so tracking runs once across the whole site.
- Keep the Project ID exactly as provided.
- Do not add another analytics provider.
- Do not send personal data to Swetrix in custom event names or metadata.

First inspect the codebase and choose the least invasive setup for the framework.
If Swetrix is already installed, update the existing setup instead of adding a duplicate.

For plain HTML or server-rendered templates, place this inside the shared <body> template, footer, or base layout so it appears on every page:

\`\`\`html
${getSnippet(pid)}
\`\`\`

For JavaScript frameworks, prefer the official npm package:

\`\`\`bash
npm install swetrix
\`\`\`

Then initialize Swetrix once in the browser-only root entry, app shell, or layout:

\`\`\`ts
${getNpmSnippet(pid)}
\`\`\`

Framework placement guide:
- Next.js App Router: create a client Analytics component, call Swetrix from useEffect, and render it from app/layout.tsx. Add the noscript pixel in the root layout body if possible.
- Next.js Pages Router: initialize in pages/_app.tsx and put the noscript pixel in pages/_document.tsx.
- React with Vite or CRA: initialize in src/main.tsx or src/index.tsx. Add the noscript pixel to index.html.
- Remix: create app/components/Analytics.tsx and render it from app/root.tsx inside <body>.
- Vue, Nuxt, SvelteKit, Astro, Gatsby, Qwik, and Solid: initialize once from the client-side root layout, plugin, or entry component.
- WordPress, Shopify, Webflow, Wix, Squarespace, Ghost, and similar builders: use the global custom code, theme header, footer, or integration area so the snippet appears on every page.

Implementation requirements:
- Call init before trackViews.
- Call trackViews once from the root/shared location. It automatically tracks supported client-side route changes.
- Use the matching namespace: swetrix.* for script-tag installs, Swetrix.* for npm imports.
- Keep the noscript image pixel where the framework or platform supports it.
- If enabling automatic browser error monitoring, call trackErrors after trackViews.
- For custom events, use track({ ev: "EVENT_NAME", meta: { key: "value" } }) with short event names and non-PII metadata only. Never include email, full name, phone number, payment data, auth tokens, or raw user IDs.
- If an event location is ambiguous, do not invent tracking. Summarize the suggested event locations instead.
- Do not enable devMode in production code. Swetrix ignores localhost by default.
- ${getCspInstruction()}

Useful references:
- Install guide: https://swetrix.com/docs/install-script
- Framework guides: https://swetrix.com/docs/integrations
- Script API reference: https://swetrix.com/docs/swetrix-js-reference

After installing:
- Search the source for "swetrix" and this Project ID.
- Visit a deployed page, or temporarily enable devMode only for local verification, and confirm pageviews appear in the Swetrix dashboard within about a minute.
- Return a short summary of changed files and where Swetrix initializes.`

const PROMPT_PREVIEW_LINES = 12

const getPromptPreview = (prompt: string) => {
  const lines = prompt.split('\n')

  if (lines.length <= PROMPT_PREVIEW_LINES) {
    return prompt
  }

  return lines.slice(0, PROMPT_PREVIEW_LINES).join('\n')
}

const CopyableField = ({ value }: { value: string }) => {
  const { t } = useTranslation('common')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('common.failedToCopy'))
    }
  }

  return (
    <div className='flex items-center justify-between rounded-lg bg-white px-4 py-3 font-mono text-sm ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-700'>
      <span className='truncate text-gray-900 dark:text-gray-100'>{value}</span>
      <button
        type='button'
        onClick={handleCopy}
        className='ml-3 flex shrink-0 items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
      >
        {copied ? (
          <>
            <CheckIcon className='size-4 text-emerald-500' />
            <span className='text-emerald-600 dark:text-emerald-400'>
              {t('common.copied')}
            </span>
          </>
        ) : (
          <>
            <CopyIcon className='size-4' />
            {t('common.copy')}
          </>
        )}
      </button>
    </div>
  )
}

const AiInstallTab = ({ projectId }: { projectId: string }) => {
  const { t } = useTranslation('common')
  const prompt = getAiInstallPrompt(projectId)
  const preview = getPromptPreview(prompt)
  const isTruncated = preview !== prompt

  return (
    <div>
      <div className='mb-4 flex items-center gap-3'>
        <div className='flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700'>
          <SparkleIcon className='size-5 text-gray-700 dark:text-gray-200' />
        </div>
        <div>
          <Text as='h3' size='sm' weight='semibold'>
            {t('onboarding.installTracking.ai.title')}
          </Text>
          <Text as='p' size='xs' colour='secondary'>
            {t('onboarding.installTracking.ai.desc')}
          </Text>
        </div>
      </div>

      <div className='relative'>
        <pre className='overflow-hidden rounded-lg bg-white p-4 pr-12 font-mono text-xs leading-relaxed whitespace-pre-wrap text-gray-800 ring-1 ring-gray-200 dark:bg-slate-950 dark:text-gray-200 dark:ring-slate-800'>
          {preview}
        </pre>
        {isTruncated ? (
          <div className='pointer-events-none absolute inset-x-px bottom-px h-24 rounded-b-lg bg-linear-to-t from-white via-white/90 to-transparent dark:from-slate-950 dark:via-slate-950/90' />
        ) : null}
        <CopyButton value={prompt} className='absolute top-2.5 right-2.5' />
      </div>
    </div>
  )
}

interface TrackingSetupProps {
  projectId: string
  showAiInstallPrompt?: boolean
}

const TrackingSetup = ({
  projectId,
  showAiInstallPrompt,
}: TrackingSetupProps) => {
  const { t } = useTranslation('common')
  const [activeTab, setActiveTab] = useState<TrackingTab>('script')
  const tabs = showAiInstallPrompt
    ? TRACKING_TABS
    : TRACKING_TABS.filter((tab) => tab.id !== 'ai')

  return (
    <div>
      <div className='mb-4 flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-slate-900'>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type='button'
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all',
                isActive
                  ? 'bg-white text-gray-900 ring-1 ring-gray-200 ring-inset dark:bg-slate-800 dark:text-gray-100 dark:ring-slate-800'
                  : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200',
              )}
            >
              <Icon
                className='size-4 shrink-0'
                weight={isActive ? 'bold' : 'regular'}
              />
              <span className='hidden sm:inline'>{t(tab.labelKey)}</span>
            </button>
          )
        })}
      </div>

      <div className='rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-slate-700 dark:bg-slate-950'>
        {activeTab === 'script' && (
          <div>
            <div className='mb-4 flex items-center gap-3'>
              <div className='flex size-10 items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700'>
                <CodeIcon className='size-5 text-gray-700 dark:text-gray-200' />
              </div>
              <div>
                <Text as='h3' size='sm' weight='semibold'>
                  {t('onboarding.installTracking.websiteInstallation')}
                </Text>
                <Text as='p' size='xs' colour='secondary'>
                  <Trans
                    t={t}
                    i18nKey='modals.trackingSnippet.add'
                    components={{
                      bsect: <Badge label='<body>' colour='slate' />,
                    }}
                  />
                </Text>
              </div>
            </div>

            <CodeBlock code={getSnippet(projectId)} />
          </div>
        )}

        {activeTab === 'npm' && (
          <div>
            <div className='mb-4 flex items-center gap-3'>
              <div className='flex size-10 items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700'>
                <PackageIcon className='size-5 text-gray-700 dark:text-gray-200' />
              </div>
              <div>
                <Text as='h3' size='sm' weight='semibold'>
                  {t('onboarding.installTracking.npm.title')}
                </Text>
                <Text as='p' size='xs' colour='secondary'>
                  {t('onboarding.installTracking.npm.desc')}
                </Text>
              </div>
            </div>

            <div className='space-y-4'>
              <div>
                <Text as='p' size='xs' weight='semibold' className='mb-2'>
                  {t('onboarding.installTracking.npm.step1')}
                </Text>
                <CodeBlock code='npm install swetrix' />
              </div>
              <div>
                <Text as='p' size='xs' weight='semibold' className='mb-2'>
                  {t('onboarding.installTracking.npm.step2')}
                </Text>
                <CodeBlock code={getNpmSnippet(projectId)} />
              </div>
            </div>

            <Text as='p' size='xs' colour='secondary' className='mt-4'>
              <Trans
                t={t}
                i18nKey='onboarding.installTracking.npm.entryFileHint'
                components={{
                  codeA: (
                    <code className='rounded bg-gray-200 px-1 py-0.5 dark:bg-slate-800' />
                  ),
                  codeB: (
                    <code className='rounded bg-gray-200 px-1 py-0.5 dark:bg-slate-800' />
                  ),
                  url: (
                    <a
                      href={`${DOCS_URL}/install-script`}
                      aria-label={t(
                        'ariaLabels.openTrackingSetupDocumentation',
                      )}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='font-medium underline decoration-dashed hover:decoration-solid'
                    />
                  ),
                }}
              />
            </Text>
          </div>
        )}

        {activeTab === 'gtm' && (
          <div>
            <div className='mb-4 flex items-center gap-3'>
              <div className='flex size-10 items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700'>
                <TagIcon className='size-5 text-gray-700 dark:text-gray-200' />
              </div>
              <div>
                <Text as='h3' size='sm' weight='semibold'>
                  {t('onboarding.installTracking.gtm.title')}
                </Text>
                <Text as='p' size='xs' colour='secondary'>
                  {t('onboarding.installTracking.gtm.desc')}
                </Text>
              </div>
            </div>

            <div className='space-y-4'>
              <div>
                <Text as='p' size='xs' weight='semibold' className='mb-2'>
                  {t('onboarding.installTracking.gtm.step1')}
                </Text>
                <CopyableField value={projectId} />
              </div>

              <div>
                <Text as='p' size='xs' weight='semibold' className='mb-2'>
                  {t('onboarding.installTracking.gtm.step2')}
                </Text>
                <CodeBlock code={getGtmSnippet(projectId)} />
              </div>

              <div>
                <Text as='p' size='xs' weight='semibold' className='mb-2'>
                  {t('onboarding.installTracking.gtm.step3')}
                </Text>
              </div>
            </div>

            <Text as='p' size='xs' colour='secondary' className='mt-4'>
              <a
                href={`${DOCS_URL}/gtm-integration`}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center gap-1 font-medium underline decoration-dashed hover:decoration-solid'
              >
                {t('onboarding.installTracking.gtm.viewGuide')}
                <ArrowSquareOutIcon className='size-3.5' />
              </a>
            </Text>
          </div>
        )}

        {activeTab === 'ai' && <AiInstallTab projectId={projectId} />}

        {activeTab === 'platforms' && (
          <div>
            <div className='mb-4 flex items-center gap-3'>
              <div className='flex size-10 items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700'>
                <SquaresFourIcon className='size-5 text-gray-700 dark:text-gray-200' />
              </div>
              <div>
                <Text as='h3' size='sm' weight='semibold'>
                  {t('onboarding.installTracking.platforms.title')}
                </Text>
                <Text as='p' size='xs' colour='secondary'>
                  {t('onboarding.installTracking.platforms.desc')}
                </Text>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
              {PLATFORM_INTEGRATIONS.map((integration) => (
                <a
                  key={integration.name}
                  href={integration.href}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center gap-2.5 rounded-lg bg-white px-3 py-2.5 ring-1 ring-gray-200 transition-all hover:bg-gray-50 hover:ring-gray-300 dark:bg-slate-950 dark:ring-slate-800 dark:hover:bg-slate-900 dark:hover:ring-slate-700'
                >
                  <PlatformIcon
                    icon={integration.icon}
                    className={cn(
                      'size-4 shrink-0 text-(--brand-color)',
                      integration.iconClassName,
                    )}
                    style={
                      {
                        '--brand-color': `#${integration.icon.hex}`,
                      } as CSSProperties
                    }
                  />
                  <Text as='span' size='xs' weight='medium'>
                    {integration.name}
                  </Text>
                </a>
              ))}
            </div>

            <Text as='p' size='xs' colour='secondary' className='mt-4'>
              <a
                href={INTEGRATIONS_URL}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center gap-1 font-medium underline decoration-dashed hover:decoration-solid'
              >
                {t('onboarding.installTracking.platforms.viewAll')}
                <ArrowSquareOutIcon className='size-3.5' />
              </a>
            </Text>
          </div>
        )}
      </div>
    </div>
  )
}

export default TrackingSetup
