import {
  BugIcon,
  CaretUpIcon,
  CaretDownIcon,
  CodeIcon,
  CursorClickIcon,
  GaugeIcon,
  MegaphoneIcon,
  ShieldCheckIcon,
  TerminalWindowIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'

const FEATURES = [
  { icon: ShieldCheckIcon, key: 'privacy' },
  { icon: CursorClickIcon, key: 'events' },
  { icon: MegaphoneIcon, key: 'campaigns' },
  { icon: GaugeIcon, key: 'perf' },
  { icon: BugIcon, key: 'errors' },
  { icon: UsersThreeIcon, key: 'sessions' },
  { icon: CodeIcon, key: 'opensource' },
  { icon: TerminalWindowIcon, key: 'devs' },
] as const

const DashboardMockup = () => (
  <div
    className='relative mx-auto h-[440px] w-full max-w-lg select-none'
    aria-hidden
  >
    {/* Chart card */}
    <div className='absolute -top-4 -right-4 w-[290px] rotate-2 rounded-2xl bg-white p-5 shadow-md ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800/20'>
      <div className='mb-1 flex items-center justify-between'>
        <Text
          size='xxs'
          weight='semibold'
          colour='muted'
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
          <Text key={d} size='xxs' colour='muted'>
            {d}
          </Text>
        ))}
      </div>
    </div>

    {/* Events card */}
    <div className='absolute top-6 left-0 w-[270px] -rotate-3 rounded-2xl bg-white p-5 shadow-md ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800/20'>
      <Text as='h3' size='lg' weight='bold'>
        Events
      </Text>
      <div className='mt-2 mb-1.5 flex items-center justify-between px-1'>
        <Text size='xxs' weight='medium' colour='muted'>
          Event
        </Text>
        <Text size='xxs' weight='medium' colour='muted'>
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
              className='absolute inset-0 rounded-sm bg-blue-50 dark:bg-blue-900/10'
              style={{ width: `${barW}%` }}
            />
            <Text size='xs' className='relative z-10'>
              {name}
            </Text>
            <span className='relative z-10'>
              <Text size='xs' weight='medium'>
                {count}
              </Text>
              <Text size='xs' colour='muted' className='mx-1.5'>
                |
              </Text>
              <Text size='xs' colour='muted'>
                {pct}%
              </Text>
            </span>
          </div>
        ))}
      </div>
    </div>

    {/* Metrics card */}
    <div className='absolute bottom-0 left-6 w-[220px] rotate-1 rounded-2xl bg-white p-4 shadow-md ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800/20'>
      <div className='space-y-2.5'>
        {[
          { label: 'Unique visitors', value: '125k', up: true },
          { label: 'Total pageviews', value: '85.1k', up: true },
          { label: 'Avg. session', value: '3m 24s', up: true },
          { label: 'Bounce rate', value: '42%', up: false },
        ].map(({ label, value, up }) => (
          <div key={label} className='flex items-center justify-between'>
            <Text size='xs' colour='muted'>
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

    {/* Top pages card */}
    <div className='absolute right-0 bottom-12 w-[220px] -rotate-1 rounded-2xl bg-white p-4 shadow-md ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800/20'>
      <Text as='h3' size='lg' weight='bold' className='mb-2'>
        Pages
      </Text>
      <div className='mb-1 flex items-center justify-between px-1'>
        <Text size='xs' weight='medium' colour='muted'>
          Page
        </Text>
        <Text size='xs' weight='medium' colour='muted'>
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

interface FeaturesGridProps {
  classes?: {
    container?: string
    subContainer?: string
  }
}

export const FeaturesGrid = ({ classes }: FeaturesGridProps) => {
  const { t } = useTranslation('common')

  return (
    <section
      className={cn(
        'relative mx-auto max-w-7xl px-4 py-14 lg:px-8',
        classes?.container,
      )}
    >
      <div
        className={cn(
          'grid items-center gap-10 lg:grid-cols-2 lg:gap-16',
          classes?.subContainer,
        )}
      >
        <DashboardMockup />
        <div>
          <Text
            as='h2'
            size='3xl'
            weight='bold'
            tracking='tight'
            className='sm:text-4xl'
          >
            {t('main.featuresAlt.heading')}
          </Text>
          <div className='mt-8 grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2'>
            {FEATURES.map(({ icon: Icon, key }) => (
              <div key={key}>
                <div className='flex items-center gap-2'>
                  <Icon
                    weight='duotone'
                    className='size-5 shrink-0 text-indigo-600 dark:text-indigo-400'
                  />
                  <Text as='h3' weight='semibold'>
                    {t(`main.featuresAlt.${key}.title`)}
                  </Text>
                </div>
                <Text
                  as='p'
                  size='sm'
                  colour='muted'
                  className='mt-1 pl-7 leading-relaxed'
                >
                  {t(`main.featuresAlt.${key}.desc`)}
                </Text>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
