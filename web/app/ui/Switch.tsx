import cx from 'clsx'
import { useId } from 'react'

import { Text } from '~/ui/Text'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  label?: string
  id?: string
}

export const Switch = ({ checked, onChange, disabled = false, className, label, id }: SwitchProps) => {
  const generatedId = useId()
  const switchId = id || generatedId

  return (
    <div className={cx('inline-flex items-center', className)}>
      <button
        id={switchId}
        type='button'
        role='switch'
        aria-checked={checked}
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!disabled) {
            onChange(!checked)
          }
        }}
        className={cx(
          'relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75',
          {
            'bg-slate-900 dark:bg-slate-500': checked,
            'bg-gray-300 dark:bg-slate-600': !checked,
            'cursor-not-allowed opacity-50': disabled,
          },
        )}
      >
        <span
          aria-hidden='true'
          className={cx(
            'pointer-events-none inline-block size-3 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
            {
              'translate-x-3': checked,
              'translate-x-0': !checked,
            },
          )}
        />
      </button>
      {label ? (
        <Text
          as='label'
          size='sm'
          colour='primary'
          htmlFor={switchId}
          className={cx('ml-2', {
            'cursor-pointer': !disabled,
            'cursor-not-allowed opacity-50': disabled,
          })}
        >
          {label}
        </Text>
      ) : null}
    </div>
  )
}
