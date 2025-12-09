import cx from 'clsx'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  label?: string
  id?: string
}

export const Switch = ({ checked, onChange, disabled = false, className, label, id }: SwitchProps) => {
  const switchId = id || `switch-${Math.random().toString(36).substr(2, 9)}`

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
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75',
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
            'pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
            {
              'translate-x-5': checked,
              'translate-x-0': !checked,
            },
          )}
        />
      </button>
      {label ? (
        <label
          htmlFor={switchId}
          className={cx('ml-2 text-sm text-gray-900 dark:text-gray-100', {
            'cursor-pointer': !disabled,
            'cursor-not-allowed opacity-50': disabled,
          })}
        >
          {label}
        </label>
      ) : null}
    </div>
  )
}
