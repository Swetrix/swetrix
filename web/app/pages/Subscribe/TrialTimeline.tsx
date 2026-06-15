import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { TRIAL_DAYS } from '~/lib/constants'
import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'

const REMINDER_LEAD_DAYS = 2

interface TrialStep {
  key: string
  accent: boolean
  dateLabel: string
  isDate: boolean
  label: string
}

const StepDot = ({ accent }: Pick<TrialStep, 'accent'>) => (
  <span className='flex size-4 items-center justify-center'>
    <span
      className={cn(
        'relative z-10 rounded-full ring-4 ring-gray-50 dark:ring-slate-950',
        accent
          ? 'size-3 bg-emerald-500'
          : 'size-2.5 bg-gray-300 dark:bg-white/25',
      )}
    />
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
      size='sm'
      weight='semibold'
      colour='primary'
      suppressHydrationWarning={step.isDate}
    >
      {step.dateLabel}
    </Text>
    <Text
      as='p'
      size='xs'
      colour='secondary'
      className={cn('mt-1 text-pretty', align === 'center' && 'max-w-[20ch]')}
    >
      {step.label}
    </Text>
  </div>
)

export const TrialTimeline = () => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  const { reminderDate, endDate } = useMemo(() => {
    const now = new Date()
    const reminder = new Date(now)
    const end = new Date(now)
    const formatter = new Intl.DateTimeFormat(language, {
      month: 'short',
      day: 'numeric',
    })

    reminder.setDate(reminder.getDate() + TRIAL_DAYS - REMINDER_LEAD_DAYS)
    end.setDate(end.getDate() + TRIAL_DAYS)

    return {
      reminderDate: formatter.format(reminder),
      endDate: formatter.format(end),
    }
  }, [language])

  const steps: TrialStep[] = [
    {
      key: 'start',
      accent: true,
      dateLabel: t('checkout.trial.today'),
      isDate: false,
      label: t('checkout.trial.step1Label'),
    },
    {
      key: 'reminder',
      accent: false,
      dateLabel: reminderDate,
      isDate: true,
      label: t('checkout.trial.step2Label'),
    },
    {
      key: 'end',
      accent: false,
      dateLabel: endDate,
      isDate: true,
      label: t('checkout.trial.step3Label'),
    },
  ]

  return (
    <section className='mx-auto w-full max-w-4xl px-4 pt-14 sm:px-6 lg:px-8'>
      {/* Horizontal timeline (sm and up) */}
      <ol className='relative mx-auto hidden max-w-2xl grid-cols-3 sm:grid'>
        <span
          aria-hidden='true'
          className='absolute top-2 right-[16.666%] left-[16.666%] h-px bg-gray-200 dark:bg-white/10'
        />
        {steps.map((step, index) => (
          <li
            key={step.key}
            className='trial-step flex flex-col items-center px-3'
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <StepDot accent={step.accent} />
            <div className='mt-4'>
              <StepText step={step} align='center' />
            </div>
          </li>
        ))}
      </ol>

      {/* Vertical timeline (mobile) */}
      <ol className='mx-auto max-w-xs sm:hidden'>
        {steps.map((step, index) => (
          <li
            key={step.key}
            className='trial-step relative flex gap-3 pb-6 last:pb-0'
            style={{ animationDelay: `${index * 70}ms` }}
          >
            {index < steps.length - 1 ? (
              <span
                aria-hidden='true'
                className='absolute top-4 bottom-0 left-2 w-px -translate-x-1/2 bg-gray-200 dark:bg-white/10'
              />
            ) : null}
            <StepDot accent={step.accent} />
            <StepText step={step} align='start' />
          </li>
        ))}
      </ol>

      <Text
        as='p'
        size='sm'
        colour='secondary'
        className='mx-auto mt-9 max-w-md text-center text-pretty'
      >
        {t('checkout.trial.footer')}
      </Text>
    </section>
  )
}
