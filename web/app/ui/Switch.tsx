import cx from 'clsx'
import { type MouseEvent, type ReactNode, useId } from 'react'

import { Text } from '~/ui/Text'

interface SwitchProps {
  checked: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  label?: string
  id?: string
  visualOnly?: boolean
}

interface SwitchContainerProps {
  className?: string
  children: ReactNode
}

interface SwitchTrackProps {
  checked: boolean
  disabled: boolean
  interactive?: boolean
  id?: string
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
}

interface SwitchLabelProps {
  label?: string
  disabled: boolean
  interactive: boolean
  htmlFor?: string
}

const SwitchContainer = ({ className, children }: SwitchContainerProps) => {
  return (
    <div className={cx('inline-flex items-center', className)}>{children}</div>
  )
}

const SwitchTrack = ({
  checked,
  disabled,
  interactive = false,
  id,
  onClick,
}: SwitchTrackProps) => {
  const thumb = (
    <span
      aria-hidden='true'
      className={cx(
        'pointer-events-none inline-block size-3 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out',
        {
          'translate-x-3': checked,
          'translate-x-0': !checked,
          'bg-white dark:bg-slate-950': checked,
          'bg-white': !checked,
        },
      )}
    />
  )

  const baseClassName =
    'relative inline-flex h-4 w-7 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out'

  const stateClassName = cx({
    'bg-slate-900 dark:bg-slate-200': checked,
    'bg-gray-300 dark:bg-slate-600': !checked,
    'cursor-not-allowed opacity-50': disabled,
  })

  if (!interactive) {
    return (
      <span aria-hidden='true' className={cx(baseClassName, stateClassName)}>
        {thumb}
      </span>
    )
  }

  return (
    <button
      id={id}
      type='button'
      role='switch'
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        baseClassName,
        'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 dark:focus-visible:ring-slate-300 dark:focus-visible:ring-offset-slate-900',
        stateClassName,
      )}
    >
      {thumb}
    </button>
  )
}

const SwitchLabel = ({
  label,
  disabled,
  interactive,
  htmlFor,
}: SwitchLabelProps) => {
  if (!label) return null

  if (interactive) {
    return (
      <Text
        as='label'
        size='sm'
        colour='primary'
        htmlFor={htmlFor}
        className={cx('ml-2', {
          'cursor-pointer': !disabled,
          'cursor-not-allowed opacity-50': disabled,
        })}
      >
        {label}
      </Text>
    )
  }

  return (
    <Text
      as='span'
      size='sm'
      colour='primary'
      className={cx('ml-2', {
        'opacity-50': disabled,
      })}
    >
      {label}
    </Text>
  )
}

export const Switch = ({
  checked,
  onChange,
  disabled = false,
  className,
  label,
  id,
  visualOnly = false,
}: SwitchProps) => {
  const generatedId = useId()
  const switchId = id || generatedId

  if (visualOnly) {
    return (
      <SwitchContainer className={className}>
        <SwitchTrack checked={checked} disabled={disabled} />
        <SwitchLabel label={label} disabled={disabled} interactive={false} />
      </SwitchContainer>
    )
  }

  return (
    <SwitchContainer className={className}>
      <SwitchTrack
        checked={checked}
        disabled={disabled}
        interactive
        id={switchId}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (!disabled && onChange) {
            onChange(!checked)
          }
        }}
      />
      <SwitchLabel
        label={label}
        disabled={disabled}
        interactive
        htmlFor={switchId}
      />
    </SwitchContainer>
  )
}
