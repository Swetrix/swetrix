import {
  BellRingingIcon,
  BugIcon,
  CaretUpIcon,
  CaretDownIcon,
  ChartLineIcon,
  CursorClickIcon,
  FlagIcon,
  FlaskIcon,
  FunnelIcon,
  GaugeIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  CookieIcon,
  PlayIcon,
  RobotIcon,
  ShieldCheckIcon,
  UserListIcon,
  VideoCameraIcon,
  WarningOctagonIcon,
} from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'

import { ScrollReveal } from './ScrollReveal'

const WEB_ANALYTICS_FEATURES = [
  { icon: CookieIcon, key: 'privacy', className: 'text-indigo-500' },
  { icon: ChartLineIcon, key: 'traffic', className: 'text-blue-500' },
  { icon: MagnifyingGlassIcon, key: 'seoGeo', className: 'text-emerald-500' },
  { icon: CursorClickIcon, key: 'events', className: 'text-purple-500' },
  { icon: MegaphoneIcon, key: 'campaigns', className: 'text-blue-500' },
  { icon: BellRingingIcon, key: 'alerts', className: 'text-amber-500' },
  { icon: RobotIcon, key: 'botBlocking', className: 'text-slate-500' },
  { icon: GaugeIcon, key: 'perf', className: 'text-amber-500' },
] as const

const PRODUCT_ANALYTICS_FEATURES = [
  { icon: BugIcon, key: 'errors', className: 'text-red-500' },
  { icon: UserListIcon, key: 'sessions', className: 'text-indigo-500' },
  { icon: VideoCameraIcon, key: 'replays', className: 'text-sky-500' },
  { icon: FunnelIcon, key: 'funnels', className: 'text-emerald-500' },
  { icon: FlaskIcon, key: 'experiments', className: 'text-violet-500' },
  { icon: ShieldCheckIcon, key: 'captcha', className: 'text-teal-500' },
] as const

type FeatureConfig =
  | (typeof WEB_ANALYTICS_FEATURES)[number]
  | (typeof PRODUCT_ANALYTICS_FEATURES)[number]

const DashboardMockup = () => (
  <div
    className='relative mx-auto h-[440px] w-full max-w-lg select-none'
    aria-hidden
  >
    <div className='absolute -top-4 -right-4 w-[290px] rotate-2 rounded-2xl bg-white p-5 ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800'>
      <div className='mb-1 flex items-center justify-between'>
        <Text
          size='xxs'
          weight='semibold'
          colour='secondary'
          tracking='wide'
          className='uppercase'
        >
          Pageviews
        </Text>
        <div className='flex items-center gap-1.5'>
          <Text size='xl' weight='bold'>
            24.5k
          </Text>
          <Text
            size='xxs'
            weight='medium'
            colour='success'
            className='flex items-center'
          >
            <CaretUpIcon weight='fill' className='size-3' />
            12%
          </Text>
        </div>
      </div>
      <svg
        viewBox='0 0 260 90'
        className='mt-2 w-full'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
      >
        <defs>
          <linearGradient id='mockChartGrad' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0%' stopColor='rgb(99 102 241)' stopOpacity='0.25' />
            <stop
              offset='100%'
              stopColor='rgb(99 102 241)'
              stopOpacity='0.01'
            />
          </linearGradient>
        </defs>
        <path
          d='M0,72 C15,68 30,58 52,54 C74,50 88,62 110,44 C132,26 148,34 170,22 C192,10 210,16 230,12 L260,8 L260,90 L0,90 Z'
          fill='url(#mockChartGrad)'
        />
        <path
          d='M0,72 C15,68 30,58 52,54 C74,50 88,62 110,44 C132,26 148,34 170,22 C192,10 210,16 230,12 L260,8'
          stroke='rgb(99 102 241)'
          strokeWidth='2'
          strokeLinecap='round'
        />
        <circle
          cx='170'
          cy='22'
          r='3.5'
          fill='white'
          stroke='rgb(99 102 241)'
          strokeWidth='2'
        />
      </svg>
      <div className='mt-1 flex justify-between'>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <Text key={d} size='xxs' colour='secondary'>
            {d}
          </Text>
        ))}
      </div>
    </div>

    <div className='absolute top-6 left-0 w-[270px] -rotate-3 rounded-2xl bg-white p-5 ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800'>
      <Text as='h3' size='lg' weight='bold'>
        Events
      </Text>
      <div className='mt-2 mb-1.5 flex items-center justify-between px-1'>
        <Text size='xxs' weight='medium' colour='secondary'>
          Event
        </Text>
        <Text size='xxs' weight='medium' colour='secondary'>
          Quantity
        </Text>
      </div>
      <div className='space-y-0.5'>
        {[
          { name: 'SIGNUP', count: 97, pct: 56, barW: 100 },
          { name: 'AI_CHAT_CREATED', count: 12, pct: 7, barW: 42 },
          { name: 'PURCHASE', count: 7, pct: 4, barW: 28 },
          { name: 'NEWSLETTER_SUB', count: 4, pct: 2, barW: 18 },
          { name: 'PROJECT_CREATED', count: 2, pct: 1, barW: 10 },
        ].map(({ name, count, pct, barW }) => (
          <div
            key={name}
            className='relative flex items-center justify-between rounded-sm px-1 py-1.5'
          >
            <div
              className='absolute inset-0 rounded-sm bg-blue-50 dark:bg-blue-900/30'
              style={{ width: `${barW}%` }}
            />
            <Text size='xs' className='relative z-10'>
              {name}
            </Text>
            <span className='relative z-10'>
              <Text size='xs' weight='medium'>
                {count}
              </Text>
              <Text size='xs' colour='secondary' className='mx-1.5'>
                |
              </Text>
              <Text size='xs' colour='secondary'>
                {pct}%
              </Text>
            </span>
          </div>
        ))}
      </div>
    </div>

    <div className='absolute bottom-0 left-6 w-[220px] rotate-1 rounded-2xl bg-white p-4 ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800'>
      <div className='space-y-2.5'>
        {[
          { label: 'Unique visitors', value: '125k', up: true },
          { label: 'Total pageviews', value: '85.1k', up: true },
          { label: 'Avg. session', value: '3m 24s', up: true },
          { label: 'Bounce rate', value: '42%', up: false },
        ].map(({ label, value, up }) => (
          <div key={label} className='flex items-center justify-between'>
            <Text size='xs' colour='secondary'>
              {label}
            </Text>
            <div className='flex items-center gap-1.5'>
              <Text size='sm' weight='semibold'>
                {value}
              </Text>
              {up ? (
                <CaretUpIcon
                  weight='fill'
                  className='size-3 text-emerald-500'
                />
              ) : (
                <CaretDownIcon weight='fill' className='size-3 text-red-500' />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className='absolute right-0 bottom-12 w-[220px] -rotate-1 rounded-2xl bg-white p-4 ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800'>
      <Text as='h3' size='lg' weight='bold' className='mb-2'>
        Pages
      </Text>
      <div className='mb-1 flex items-center justify-between px-1'>
        <Text size='xs' weight='medium' colour='secondary'>
          Page
        </Text>
        <Text size='xs' weight='medium' colour='secondary'>
          Visitors
        </Text>
      </div>
      <div className='space-y-0.5'>
        {[
          { page: '/', count: 512, barW: 100 },
          { page: '/pricing', count: 407, barW: 79 },
          { page: '/dashboard', count: 128, barW: 25 },
          { page: '/blog', count: 65, barW: 13 },
        ].map(({ page, count, barW }) => (
          <div
            key={page}
            className='relative flex h-7 items-center justify-between rounded-sm px-1'
          >
            <div
              className='absolute inset-0 rounded-sm bg-blue-50 dark:bg-blue-900/30'
              style={{ width: `${barW}%` }}
            />
            <Text size='xs' className='relative z-10'>
              {page}
            </Text>
            <Text size='xs' weight='medium' className='relative z-10'>
              {count}
            </Text>
          </div>
        ))}
      </div>
    </div>
  </div>
)

const ProductAnalyticsMockup = () => (
  <div
    className='relative mx-auto h-[520px] w-full max-w-lg select-none'
    aria-hidden
  >
    <div className='absolute top-8 right-0 left-8 rounded-2xl bg-white p-4 ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <div className='flex size-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 ring-1 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20'>
            <VideoCameraIcon weight='duotone' className='size-5' />
          </div>
          <div>
            <Text as='h3' size='sm' weight='semibold'>
              Session replay
            </Text>
            <Text as='p' size='xxs' colour='secondary'>
              Checkout flow, 02:14
            </Text>
          </div>
        </div>
        <div className='flex items-center gap-1 rounded-md bg-gray-900 px-2 py-1 text-white dark:bg-gray-50 dark:text-slate-900'>
          <PlayIcon weight='fill' className='size-3' />
          <Text size='xxs' colour='inherit' weight='medium'>
            Watch
          </Text>
        </div>
      </div>

      <div className='mt-4 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
        <div className='grid grid-cols-3 gap-2'>
          <div className='col-span-2 h-20 rounded-lg bg-white p-2 ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800'>
            <div className='h-2 w-16 rounded-full bg-gray-200 dark:bg-slate-700' />
            <div className='mt-3 space-y-1.5'>
              <div className='h-2 rounded-full bg-gray-100 dark:bg-slate-800' />
              <div className='h-2 w-4/5 rounded-full bg-gray-100 dark:bg-slate-800' />
              <div className='h-2 w-3/5 rounded-full bg-gray-100 dark:bg-slate-800' />
            </div>
          </div>
          <div className='h-20 rounded-lg bg-white p-2 ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800'>
            <div className='h-2 w-10 rounded-full bg-gray-200 dark:bg-slate-700' />
            <div className='mt-3 grid grid-cols-2 gap-1'>
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className='h-4 rounded-sm bg-sky-100 dark:bg-sky-500/20'
                />
              ))}
            </div>
          </div>
        </div>
        <div className='mt-3 flex items-center gap-2'>
          <div className='h-1.5 flex-1 rounded-full bg-sky-500' />
          <div className='h-1.5 w-16 rounded-full bg-gray-200 dark:bg-slate-700' />
          <div className='h-1.5 w-10 rounded-full bg-gray-200 dark:bg-slate-700' />
        </div>
      </div>
    </div>

    <div className='absolute top-0 left-0 w-[245px] -rotate-2 rounded-2xl bg-white p-4 ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800'>
      <div className='flex items-center gap-2'>
        <WarningOctagonIcon weight='duotone' className='size-5 text-red-500' />
        <Text as='h3' size='sm' weight='semibold'>
          Error tracking
        </Text>
      </div>
      <div className='mt-3 space-y-2'>
        {[
          { label: 'TypeError', meta: '18 users', tone: 'bg-red-500' },
          { label: 'Payment failed', meta: '6 users', tone: 'bg-amber-500' },
          { label: 'API timeout', meta: '3 users', tone: 'bg-slate-400' },
        ].map(({ label, meta, tone }) => (
          <div
            key={label}
            className='flex items-center justify-between rounded-lg bg-gray-50 px-2.5 py-2 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'
          >
            <div className='flex min-w-0 items-center gap-2'>
              <div className={cn('size-2 rounded-full', tone)} />
              <Text size='xs' weight='medium' truncate>
                {label}
              </Text>
            </div>
            <Text size='xxs' colour='secondary' className='shrink-0'>
              {meta}
            </Text>
          </div>
        ))}
      </div>
    </div>

    <div className='absolute right-2 bottom-20 w-[270px] rotate-2 rounded-2xl bg-white p-4 ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <FlaskIcon weight='duotone' className='size-5 text-violet-500' />
          <Text as='h3' size='sm' weight='semibold'>
            Experiments
          </Text>
        </div>
        <div className='flex items-center gap-1 text-emerald-600 dark:text-emerald-400'>
          <CaretUpIcon weight='fill' className='size-3' />
          <Text size='xxs' colour='inherit' weight='medium'>
            7.8%
          </Text>
        </div>
      </div>
      <div className='mt-3 space-y-3'>
        {[
          { label: 'New onboarding', value: '64%', width: 64 },
          { label: 'Pricing banner', value: '28%', width: 28 },
          { label: 'Fast checkout', value: '12%', width: 12 },
        ].map(({ label, value, width }) => (
          <div key={label}>
            <div className='mb-1 flex items-center justify-between'>
              <Text size='xs' colour='secondary'>
                {label}
              </Text>
              <Text size='xs' weight='medium'>
                {value}
              </Text>
            </div>
            <div className='h-1.5 rounded-full bg-gray-100 dark:bg-slate-800'>
              <div
                className='h-full rounded-full bg-violet-500'
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className='mt-4 flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-2 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
        <FlagIcon weight='duotone' className='size-4 text-slate-500' />
        <Text size='xs' colour='secondary'>
          Feature flag rollout synced
        </Text>
      </div>
    </div>

    <div className='absolute bottom-0 left-4 w-[255px] -rotate-1 rounded-2xl bg-white p-4 ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800'>
      <div className='flex items-center gap-2'>
        <FunnelIcon weight='duotone' className='size-5 text-emerald-500' />
        <Text as='h3' size='sm' weight='semibold'>
          Funnel health
        </Text>
      </div>
      <div className='mt-3 space-y-2'>
        {[
          { label: 'Visit', value: '100%', width: 100 },
          { label: 'Signup', value: '42%', width: 42 },
          { label: 'Activation', value: '31%', width: 31 },
        ].map(({ label, value, width }) => (
          <div key={label} className='grid grid-cols-[64px_1fr_36px] gap-2'>
            <Text size='xxs' colour='secondary'>
              {label}
            </Text>
            <div className='mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-slate-800'>
              <div
                className='h-full rounded-full bg-emerald-500'
                style={{ width: `${width}%` }}
              />
            </div>
            <Text size='xxs' weight='medium'>
              {value}
            </Text>
          </div>
        ))}
      </div>
      <div className='mt-4 flex items-center gap-2 rounded-lg bg-teal-50 px-2.5 py-2 ring-1 ring-teal-100 dark:bg-teal-500/10 dark:ring-teal-500/20'>
        <ShieldCheckIcon weight='duotone' className='size-4 text-teal-600' />
        <Text size='xs' colour='secondary'>
          CAPTCHA passed without puzzles
        </Text>
      </div>
    </div>
  </div>
)

const FeatureList = ({ features }: { features: readonly FeatureConfig[] }) => {
  const { t } = useTranslation('common')

  return (
    <div className='mt-8 grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2'>
      {features.map(({ icon: Icon, key, className }) => (
        <div key={key}>
          <div className='flex items-center gap-2'>
            <Icon
              weight='duotone'
              className={cn('size-5 shrink-0', className)}
              aria-hidden='true'
            />
            <Text as='h4' weight='semibold'>
              {t(`main.featuresAlt.${key}.title`)}
            </Text>
          </div>
          <Text
            as='p'
            size='sm'
            colour='secondary'
            className='mt-1 pl-7 leading-relaxed'
          >
            {t(`main.featuresAlt.${key}.desc`)}
          </Text>
        </div>
      ))}
    </div>
  )
}

const FeatureGroup = ({
  headingKey,
  descriptionKey,
  features,
}: {
  headingKey: string
  descriptionKey: string
  features: readonly FeatureConfig[]
}) => {
  const { t } = useTranslation('common')

  return (
    <div>
      <Text as='h3' size='2xl' weight='bold' tracking='tight'>
        {t(`main.featuresAlt.${headingKey}`)}
      </Text>
      <Text
        as='p'
        size='base'
        colour='secondary'
        className='mt-3 max-w-2xl leading-relaxed'
      >
        {t(`main.featuresAlt.${descriptionKey}`)}
      </Text>
      <FeatureList features={features} />
    </div>
  )
}

export const FeaturesGrid = () => {
  const { t } = useTranslation('common')

  return (
    <section className='relative mx-auto max-w-7xl px-4 py-16 sm:py-20 lg:px-8'>
      <div className='mx-auto max-w-3xl text-center'>
        <Text
          as='h2'
          size='3xl'
          weight='bold'
          tracking='tight'
          className='sm:text-4xl'
        >
          {t('main.featuresAlt.heading')}
        </Text>
      </div>

      <div className='mt-14 space-y-20 sm:mt-16 lg:space-y-24'>
        <div className='grid items-center gap-10 lg:grid-cols-2 lg:gap-16'>
          <ScrollReveal className='order-2 lg:order-1'>
            <DashboardMockup />
          </ScrollReveal>
          <div className='order-1 lg:order-2'>
            <FeatureGroup
              headingKey='webHeading'
              descriptionKey='webDescription'
              features={WEB_ANALYTICS_FEATURES}
            />
          </div>
        </div>

        <div className='grid items-center gap-10 lg:grid-cols-2 lg:gap-16'>
          <FeatureGroup
            headingKey='productHeading'
            descriptionKey='productDescription'
            features={PRODUCT_ANALYTICS_FEATURES}
          />
          <ScrollReveal>
            <ProductAnalyticsMockup />
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
