import cx from 'clsx'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoIcon } from '@phosphor-icons/react'
import Tooltip from './Tooltip'

interface PasswordStrengthProps {
  password: string
  className?: string
}

type StrengthLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong'

interface StrengthConfig {
  label: string
  color: string
  bgColor: string
  segments: number
}

const calculateStrength = (password: string): StrengthLevel => {
  if (!password) return 'empty'

  let score = 0

  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1

  if (score <= 2) return 'weak'
  if (score <= 3) return 'fair'
  if (score <= 4) return 'good'
  return 'strong'
}

const PasswordStrength = ({ password, className }: PasswordStrengthProps) => {
  const { t } = useTranslation('common')

  const strength = useMemo(() => calculateStrength(password), [password])

  const config: Record<StrengthLevel, StrengthConfig> = useMemo(
    () => ({
      empty: {
        label: '',
        color: 'bg-gray-300 dark:bg-slate-600',
        bgColor: 'bg-gray-200 dark:bg-slate-700',
        segments: 0,
      },
      weak: {
        label: t('auth.passwordStrength.weak'),
        color: 'bg-red-500',
        bgColor: 'bg-gray-200 dark:bg-slate-700',
        segments: 1,
      },
      fair: {
        label: t('auth.passwordStrength.fair'),
        color: 'bg-amber-500',
        bgColor: 'bg-gray-200 dark:bg-slate-700',
        segments: 2,
      },
      good: {
        label: t('auth.passwordStrength.good'),
        color: 'bg-yellow-500',
        bgColor: 'bg-gray-200 dark:bg-slate-700',
        segments: 3,
      },
      strong: {
        label: t('auth.passwordStrength.strong'),
        color: 'bg-emerald-500',
        bgColor: 'bg-gray-200 dark:bg-slate-700',
        segments: 4,
      },
    }),
    [t],
  )

  const currentConfig = config[strength]
  const totalSegments = 4

  return (
    <div className={cx('space-y-1.5', className)}>
      <div className='flex gap-1'>
        {Array.from({ length: totalSegments }).map((_, index) => (
          <div
            key={index}
            className={cx(
              'h-1 flex-1 rounded-full transition-colors duration-200',
              index < currentConfig.segments
                ? currentConfig.color
                : currentConfig.bgColor,
            )}
          />
        ))}
      </div>
      {strength !== 'empty' && (
        <div className='flex items-center justify-end gap-1'>
          <span
            className={cx(
              'text-xs font-medium',
              strength === 'weak' && 'text-red-600 dark:text-red-400',
              strength === 'fair' && 'text-amber-600 dark:text-amber-400',
              strength === 'good' && 'text-yellow-600 dark:text-yellow-400',
              strength === 'strong' && 'text-emerald-600 dark:text-emerald-400',
            )}
          >
            {currentConfig.label}
          </span>
          <Tooltip
            text={t('auth.passwordStrength.hint')}
            tooltipNode={
              <InfoIcon className='size-4 cursor-help text-gray-400 dark:text-gray-500' />
            }
          />
        </div>
      )}
    </div>
  )
}

export default PasswordStrength
