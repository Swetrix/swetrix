import {
  Description,
  Field,
  Input as HeadlessInput,
  Label,
} from '@headlessui/react'
import cx from 'clsx'
import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react'
import React, { memo, useState } from 'react'
import { Text } from './Text'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode
  labelCorner?: React.ReactNode
  hint?: React.ReactNode
  leadingIcon?: React.ReactNode
  className?: string
  error?: string | null
  disabled?: boolean
  readOnly?: boolean
  classes?: {
    input?: string
    leadingIcon?: string
  }
}

// TODO: Merge className and classes

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      labelCorner,
      hint,
      leadingIcon,
      className,
      error,
      disabled,
      readOnly,
      classes,
      ...rest
    },
    ref,
  ) => {
    const isError = Boolean(error)
    const type = rest.type || 'text'
    const isPassword = type === 'password'
    const hasLeadingIcon = Boolean(leadingIcon)
    const [showPassword, setShowPassword] = useState(false)

    const { type: _type, ...restWithoutType } = rest

    const inputElement = (
      <HeadlessInput
        ref={ref}
        className={cx(
          'block w-full rounded-md border-0 bg-white px-3 py-2 text-sm text-gray-900 ring-1 transition-shadow duration-150 ease-out ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-slate-900 focus:outline-hidden dark:bg-slate-950 dark:text-gray-50 dark:placeholder:text-gray-500 dark:focus:ring-slate-300',
          {
            'ring-red-500 placeholder:text-red-300 focus:ring-red-500 dark:ring-red-500/80 dark:focus:ring-red-400':
              isError,
            'ring-gray-300 hover:ring-gray-400 dark:ring-slate-700/80 dark:hover:ring-slate-600':
              !isError && !disabled && !readOnly,
            'cursor-not-allowed bg-gray-50 text-gray-500 ring-gray-200 dark:bg-slate-900 dark:text-gray-400 dark:ring-slate-800':
              disabled,
            'cursor-default bg-gray-50 text-gray-700 ring-gray-200 dark:bg-slate-900/60 dark:text-gray-300 dark:ring-slate-800':
              readOnly && !disabled,
            'pl-10': hasLeadingIcon,
            'pr-10': isPassword,
          },
          classes?.input,
        )}
        disabled={disabled}
        readOnly={readOnly}
        invalid={isError}
        aria-invalid={isError || undefined}
        {...restWithoutType}
        autoComplete={
          rest.autoComplete ?? (isPassword ? 'current-password' : undefined)
        }
        type={isPassword && showPassword ? 'text' : type}
      />
    )

    const inputWithAdornments =
      hasLeadingIcon || isPassword ? (
        <div className='relative'>
          {hasLeadingIcon ? (
            <div
              aria-hidden='true'
              className={cx(
                'pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500',
                classes?.leadingIcon,
              )}
            >
              {leadingIcon}
            </div>
          ) : null}
          {inputElement}
          {isPassword ? (
            <button
              type='button'
              onClick={() => {
                if (disabled) return
                setShowPassword(!showPassword)
              }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              disabled={disabled}
              aria-disabled={disabled || undefined}
              tabIndex={disabled ? -1 : 0}
              className='absolute inset-y-0 right-0 my-1 mr-1 flex items-center rounded-md px-2 text-gray-400 transition-colors hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:text-gray-400 dark:text-gray-500 dark:hover:text-gray-200 dark:focus-visible:ring-slate-300 dark:disabled:hover:text-gray-500'
            >
              {showPassword ? (
                <EyeSlashIcon className='size-4.5' />
              ) : (
                <EyeIcon className='size-4.5' />
              )}
            </button>
          ) : null}
        </div>
      ) : (
        inputElement
      )

    return (
      <Field as='div' className={cx('flex flex-col gap-1', className)}>
        {label || labelCorner ? (
          <div className='flex items-center justify-between gap-x-2'>
            {label ? (
              <Label>
                <Text
                  as='span'
                  className='flex leading-tight whitespace-pre-line'
                  size='sm'
                  weight='medium'
                  colour='primary'
                >
                  {label}
                </Text>
              </Label>
            ) : (
              <span />
            )}
            {labelCorner ? (
              <span className='text-sm'>{labelCorner}</span>
            ) : null}
          </div>
        ) : null}
        {hint ? (
          <Description as='div'>
            <Text
              as='span'
              className='block leading-tight whitespace-pre-line'
              size='sm'
              colour='secondary'
            >
              {hint}
            </Text>
          </Description>
        ) : null}
        {inputWithAdornments}
        {isError ? (
          <Description as='div' role='alert'>
            <Text as='span' className='block' size='sm' colour='error'>
              {error}
            </Text>
          </Description>
        ) : null}
      </Field>
    )
  },
)

Input.displayName = 'Input'

export default memo(Input)
