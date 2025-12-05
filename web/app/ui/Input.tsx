import { Description, Field, Input as HeadlessInput, Label } from '@headlessui/react'
import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import React, { memo } from 'react'

interface InputProps {
  label?: React.ReactNode
  hint?: React.ReactNode
  className?: string
  error?: string | null | boolean
  disabled?: boolean
  hintPosition?: 'top' | 'bottom'
  classes?: {
    input?: string
  }
}

// TODO: Merge className and classes

const Input = ({
  label,
  hint,
  className,
  error,
  disabled,
  classes,
  hintPosition = 'bottom',
  ...rest
}: InputProps & React.InputHTMLAttributes<HTMLInputElement>) => {
  const isError = !_isEmpty(error)
  const type = rest.type || 'text'

  return (
    <Field as='div' className={className}>
      {label ? <Label className='mb-1 flex text-sm font-medium text-gray-900 dark:text-gray-200'>{label}</Label> : null}
      {hint && hintPosition === 'top' ? (
        <Description className='mt-1 text-sm whitespace-pre-line text-gray-500 dark:text-gray-300'>{hint}</Description>
      ) : null}
      <HeadlessInput
        type={type}
        className={cx(
          'w-full rounded-md border-0 ring-1 ring-inset focus:ring-indigo-500 sm:text-sm dark:bg-slate-800 dark:text-gray-50 dark:placeholder-gray-400',
          {
            'text-red-900 placeholder-red-300 ring-red-600': isError,
            'ring-gray-300 dark:ring-slate-800/50': !isError,
            'cursor-text': disabled,
          },
          classes?.input,
        )}
        disabled={disabled}
        invalid={isError}
        {...rest}
      />
      {isError ? <p className='mt-2 text-sm text-red-600 dark:text-red-500'>{error}</p> : null}
      {hint && hintPosition === 'bottom' ? (
        <Description className='mt-2 text-sm whitespace-pre-line text-gray-500 dark:text-gray-300'>{hint}</Description>
      ) : null}
    </Field>
  )
}

export default memo(Input)
