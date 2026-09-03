import {
  BugIcon,
  CursorClickIcon,
  GaugeIcon,
  MonitorPlayIcon,
  PlayIcon,
  type Icon,
} from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

import { useTheme } from '~/providers/ThemeProvider'
import { Text } from '~/ui/Text'

interface FeatureCard {
  key: 'traffic' | 'performance' | 'errors' | 'sessions'
  icon: Icon
  imageLight?: string
  imageDark?: string
}

const FEATURES: FeatureCard[] = [
  {
    key: 'traffic',
    icon: CursorClickIcon,
    imageLight: '/assets/screenshot_light.png',
    imageDark: '/assets/screenshot_dark.png',
  },
  {
    key: 'performance',
    icon: GaugeIcon,
    imageLight: '/assets/screenshot_perf_light.png',
    imageDark: '/assets/screenshot_perf_dark.png',
  },
  {
    key: 'errors',
    icon: BugIcon,
    imageLight: '/assets/screenshot_errors_light.png',
    imageDark: '/assets/screenshot_errors_dark.png',
  },
  {
    key: 'sessions',
    icon: MonitorPlayIcon,
  },
]

const SessionPreview = () => (
  <div
    aria-hidden='true'
    className='flex h-full items-center justify-center bg-slate-100 px-6 dark:bg-slate-950'
  >
    <div className='w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-[0_16px_40px_rgba(15,23,42,0.12)] ring-1 ring-gray-200 dark:bg-slate-900 dark:shadow-[0_16px_40px_rgba(0,0,0,0.35)] dark:ring-white/10'>
      <div className='flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-white/10'>
        <div className='flex items-center gap-1.5'>
          <span className='size-1.5 rounded-full bg-red-400' />
          <span className='size-1.5 rounded-full bg-amber-400' />
          <span className='size-1.5 rounded-full bg-emerald-400' />
        </div>
        <span className='text-[9px] font-medium text-gray-400 dark:text-slate-500'>
          00:42 / 02:18
        </span>
      </div>
      <div className='relative aspect-[16/7] bg-gray-50 dark:bg-slate-950/70'>
        <div className='absolute top-3 left-3 h-2 w-20 rounded-sm bg-gray-200 dark:bg-slate-700' />
        <div className='absolute top-7 left-3 h-1.5 w-28 rounded-sm bg-gray-200/80 dark:bg-slate-800' />
        <div className='absolute right-4 bottom-4 left-3 grid grid-cols-3 gap-2'>
          <span className='h-8 rounded-md bg-indigo-100 ring-1 ring-indigo-200 dark:bg-indigo-500/10 dark:ring-indigo-400/20' />
          <span className='h-8 rounded-md bg-white ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-white/10' />
          <span className='h-8 rounded-md bg-white ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-white/10' />
        </div>
        <CursorClickIcon
          weight='fill'
          className='absolute top-9 left-[42%] size-5 rotate-[-12deg] text-indigo-600 drop-shadow-sm dark:text-indigo-300'
        />
      </div>
      <div className='flex items-center gap-2 px-3 py-2.5'>
        <span className='grid size-6 shrink-0 place-items-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900'>
          <PlayIcon weight='fill' className='size-2.5 translate-x-px' />
        </span>
        <div className='h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700'>
          <div className='h-full w-[38%] rounded-full bg-indigo-500' />
        </div>
        <span className='size-1.5 rounded-full bg-pink-400' />
        <span className='size-1.5 rounded-full bg-amber-400' />
        <span className='size-1.5 rounded-full bg-cyan-400' />
      </div>
    </div>
  </div>
)

export const SubscribeFeatures = () => {
  const { t } = useTranslation('common')
  const { theme } = useTheme()

  return (
    <section>
      <div className='max-w-2xl'>
        <Text as='h2' size='2xl' weight='bold' tracking='tight'>
          {t('checkout.features.title')}
        </Text>
        <Text
          as='p'
          size='base'
          colour='secondary'
          className='mt-2 max-w-2xl leading-relaxed text-pretty'
        >
          {t('checkout.features.subtitle')}
        </Text>
      </div>

      <div className='mt-6 grid gap-4 sm:grid-cols-2'>
        {FEATURES.map((feature) => {
          const FeatureIcon = feature.icon
          const imageSrc =
            theme === 'dark' ? feature.imageDark : feature.imageLight

          return (
            <article
              key={feature.key}
              className='group overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200 transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)] motion-reduce:transform-none dark:bg-slate-900 dark:ring-white/10 dark:hover:shadow-[0_18px_45px_rgba(0,0,0,0.25)]'
            >
              <div className='aspect-[16/9] overflow-hidden border-b border-gray-100 bg-gray-100 dark:border-white/10 dark:bg-slate-950'>
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={t(`checkout.features.cards.${feature.key}.alt`)}
                    width={1167}
                    height={835}
                    loading='lazy'
                    className='h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.015] motion-reduce:transform-none'
                  />
                ) : (
                  <SessionPreview />
                )}
              </div>
              <div className='p-5 sm:p-6'>
                <div className='flex items-center gap-2.5'>
                  <span className='grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300'>
                    <FeatureIcon weight='duotone' className='size-4.5' />
                  </span>
                  <Text as='h3' size='lg' weight='semibold' tracking='tight'>
                    {t(`checkout.features.cards.${feature.key}.title`)}
                  </Text>
                </div>
                <Text
                  as='p'
                  size='sm'
                  colour='secondary'
                  className='mt-3 leading-relaxed text-pretty'
                >
                  {t(`checkout.features.cards.${feature.key}.description`)}
                </Text>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
