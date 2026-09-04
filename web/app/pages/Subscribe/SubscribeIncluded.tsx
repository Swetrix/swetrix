import {
  BracketsAngleIcon,
  CheckCircleIcon,
  DownloadSimpleIcon,
  EnvelopeSimpleIcon,
  FlaskIcon,
  FunnelIcon,
  GlobeIcon,
  MagnifyingGlassIcon,
  MonitorPlayIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  UsersThreeIcon,
  type Icon,
} from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'

interface SubscribeIncludedProps {
  monthlyEvents: number
  isCustomEventTier: boolean
}

interface IncludedCard {
  figure: string
  label: string
  body: string
  icon: Icon
  tint: string
  placement: string
}

const MORE_INCLUDED: Array<{ key: string; icon: Icon }> = [
  { key: 'privacy', icon: ShieldCheckIcon },
  { key: 'imports', icon: DownloadSimpleIcon },
  { key: 'reports', icon: EnvelopeSimpleIcon },
  { key: 'api', icon: BracketsAngleIcon },
  { key: 'sharing', icon: GlobeIcon },
  { key: 'ownership', icon: CheckCircleIcon },
  { key: 'funnels', icon: FunnelIcon },
  { key: 'seo', icon: MagnifyingGlassIcon },
  { key: 'revenue', icon: ReceiptIcon },
  { key: 'experiments', icon: FlaskIcon },
]

export const SubscribeIncluded = ({
  monthlyEvents,
  isCustomEventTier,
}: SubscribeIncludedProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const formatNumber = (value: number) => value.toLocaleString(language)
  const replayQuota = Math.round(monthlyEvents * 0.05)

  const core: IncludedCard[] = [
    {
      figure: `${formatNumber(monthlyEvents)}${isCustomEventTier ? '+' : ''}`,
      label: t('checkout.included.cards.events.title'),
      body: t('checkout.included.cards.events.description'),
      icon: CheckCircleIcon,
      tint: 'text-indigo-500/[0.11] dark:text-indigo-300/[0.08]',
      placement: '-right-5 -bottom-9 -rotate-6',
    },
    {
      figure: '10 / 100',
      label: t('checkout.included.cards.websites.title'),
      body: t('checkout.included.cards.websites.description'),
      icon: GlobeIcon,
      tint: 'text-cyan-500/[0.12] dark:text-cyan-300/[0.08]',
      placement: '-left-6 -bottom-9 rotate-6',
    },
    {
      figure: '10 / 25',
      label: t('checkout.included.cards.members.title'),
      body: t('checkout.included.cards.members.description'),
      icon: UsersThreeIcon,
      tint: 'text-amber-500/[0.12] dark:text-amber-300/[0.08]',
      placement: '-right-4 -bottom-8 rotate-6',
    },
    {
      figure: `${formatNumber(replayQuota)}${isCustomEventTier ? '+' : ''}`,
      label: t('checkout.included.cards.replays.title'),
      body: t('checkout.included.cards.replays.description'),
      icon: MonitorPlayIcon,
      tint: 'text-pink-500/[0.1] dark:text-pink-300/[0.08]',
      placement: '-left-5 -bottom-9 -rotate-6',
    },
  ]

  return (
    <section>
      <div className='max-w-2xl'>
        <Text as='h2' size='2xl' weight='bold' tracking='tight'>
          {t('checkout.included.title')}
        </Text>
        <Text
          as='p'
          size='base'
          colour='secondary'
          className='mt-2 max-w-2xl leading-relaxed text-pretty'
        >
          {t('checkout.included.subtitle')}
        </Text>
      </div>

      <div className='mt-6 grid gap-3 sm:grid-cols-2'>
        {core.map((item) => (
          <article
            key={item.label}
            className='relative min-h-44 overflow-hidden rounded-2xl bg-white p-5 ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-white/10'
          >
            <item.icon
              weight='thin'
              aria-hidden='true'
              className={cn(
                'pointer-events-none absolute size-32',
                item.tint,
                item.placement,
              )}
            />
            <div className='relative z-10'>
              <Text
                as='p'
                size='2xl'
                weight='bold'
                tracking='tight'
                className='tabular-nums'
              >
                {item.figure}
              </Text>
              <Text as='h3' size='sm' weight='semibold' className='mt-1'>
                {item.label}
              </Text>
              <Text
                as='p'
                size='sm'
                colour='secondary'
                className='mt-3 max-w-[21rem] leading-relaxed text-pretty'
              >
                {item.body}
              </Text>
            </div>
          </article>
        ))}
      </div>

      <Text
        as='p'
        size='xs'
        weight='semibold'
        colour='secondary'
        className='mt-6'
      >
        {t('checkout.included.moreTitle')}
      </Text>
      <ul className='mt-3 grid gap-2 sm:grid-cols-2'>
        {MORE_INCLUDED.map((item) => (
          <li
            key={item.key}
            className='flex items-center gap-2.5 rounded-xl bg-white px-3.5 py-3 text-sm text-slate-900 ring-1 ring-gray-200 dark:bg-slate-900 dark:text-white dark:ring-white/10'
          >
            <item.icon
              weight='regular'
              className='size-4 shrink-0 text-slate-500 dark:text-slate-400'
            />
            {t(`checkout.included.more.${item.key}`)}
          </li>
        ))}
      </ul>
    </section>
  )
}
