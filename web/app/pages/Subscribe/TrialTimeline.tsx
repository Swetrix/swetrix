import {
  BellRingingIcon,
  CreditCardIcon,
  type Icon,
  RocketLaunchIcon,
} from '@phosphor-icons/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { TRIAL_DAYS } from '~/lib/constants'
import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'

const DAY_MS = 24 * 60 * 60 * 1000
const REMINDER_LEAD_DAYS = 2

interface TrialStep {
  key: string
  icon: Icon
  accent: boolean
  dateLabel: string
  isDate: boolean
  title: string
  desc: string
}

const StepIcon = ({
  icon: IconComponent,
  accent,
}: Pick<TrialStep, 'icon' | 'accent'>) => (
  <span
    className={cn(
      'relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-white ring-1 dark:bg-slate-900',
      accent
        ? 'text-emerald-600 ring-emerald-500/30 dark:text-emerald-400 dark:ring-emerald-400/30'
        : 'text-gray-500 ring-gray-200 dark:text-gray-400 dark:ring-white/10',
    )}
  >
    <IconComponent className='size-[18px]' aria-hidden='true' />
  </span>
)

const StepText = ({
  step,
  align,
}: {
  step: TrialStep
  align: 'center' | 'start'
}) => (
  <div
    className={cn(
      'flex flex-col',
      align === 'center' ? 'items-center text-center' : 'items-start text-left',
    )}
  >
    <Text
      as='span'
      size='xs'
      weight='medium'
      colour='muted'
      suppressHydrationWarning={step.isDate}
    >
      {step.dateLabel}
    </Text>
    <Text as='p' size='sm' weight='semibold' colour='primary' className='mt-1'>
      {step.title}
    </Text>
    <Text
      as='p'
      size='xs'
      colour='muted'
      className={cn('mt-1 text-pretty', align === 'center' && 'max-w-[24ch]')}
    >
      {step.desc}
    </Text>
  </div>
)

export const TrialTimeline = () => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  const { reminderDate, endDate } = useMemo(() => {
    const now = Date.now()
    const formatter = new Intl.DateTimeFormat(language, {
      month: 'short',
      day: 'numeric',
    })

    return {
      reminderDate: formatter.format(
        new Date(now + (TRIAL_DAYS - REMINDER_LEAD_DAYS) * DAY_MS),
      ),
      endDate: formatter.format(new Date(now + TRIAL_DAYS * DAY_MS)),
    }
  }, [language])

  const steps: TrialStep[] = [
    {
      key: 'start',
      icon: RocketLaunchIcon,
      accent: true,
      dateLabel: t('checkout.trial.today'),
      isDate: false,
      title: t('checkout.trial.step1Title'),
      desc: t('checkout.trial.step1Desc'),
    },
    {
      key: 'reminder',
      icon: BellRingingIcon,
      accent: false,
      dateLabel: reminderDate,
      isDate: true,
      title: t('checkout.trial.step2Title'),
      desc: t('checkout.trial.step2Desc'),
    },
    {
      key: 'end',
      icon: CreditCardIcon,
      accent: false,
      dateLabel: endDate,
      isDate: true,
      title: t('checkout.trial.step3Title'),
      desc: t('checkout.trial.step3Desc'),
    },
  ]

  return (
    <section className='mx-auto w-full max-w-4xl px-4 pt-12 sm:px-6 lg:px-8'>
      <div className='rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 dark:border-white/10 dark:bg-slate-900'>
        <Text
          as='h2'
          size='base'
          weight='semibold'
          colour='secondary'
          className='text-center'
        >
          {t('checkout.trial.title')}
        </Text>

        {/* Horizontal timeline (sm and up) */}
        <ol className='relative mx-auto mt-8 hidden max-w-3xl grid-cols-3 sm:grid'>
          <span
            aria-hidden='true'
            className='absolute top-5 right-[16.666%] left-[16.666%] h-px bg-gray-200 dark:bg-white/10'
          />
          {steps.map((step, index) => (
            <li
              key={step.key}
              className='trial-step flex flex-col items-center px-3'
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <StepIcon icon={step.icon} accent={step.accent} />
              <div className='mt-3'>
                <StepText step={step} align='center' />
              </div>
            </li>
          ))}
        </ol>

        {/* Vertical timeline (mobile) */}
        <ol className='mt-7 sm:hidden'>
          {steps.map((step, index) => (
            <li
              key={step.key}
              className='trial-step relative flex gap-4 pb-7 last:pb-0'
              style={{ animationDelay: `${index * 70}ms` }}
            >
              {index < steps.length - 1 ? (
                <span
                  aria-hidden='true'
                  className='absolute top-10 bottom-0 left-5 w-px -translate-x-1/2 bg-gray-200 dark:bg-white/10'
                />
              ) : null}
              <StepIcon icon={step.icon} accent={step.accent} />
              <div className='pt-0.5'>
                <StepText step={step} align='start' />
              </div>
            </li>
          ))}
        </ol>

        <Text
          as='p'
          size='sm'
          colour='secondary'
          className='mt-6 border-t border-gray-100 pt-5 text-center text-pretty dark:border-white/5'
        >
          {t('checkout.trial.footer')}
        </Text>
      </div>
    </section>
  )
}
