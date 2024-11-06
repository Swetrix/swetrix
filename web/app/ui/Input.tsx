import React, { memo } from 'react'
import { Description, Field, Input as HeadlessInput, Label } from '@headlessui/react'
import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import Beta from 'ui/Beta'

interface IInput {
  label?: string | JSX.Element
  hint?: string | JSX.Element
  className?: string
  error?: string | null | boolean
  disabled?: boolean
  isBeta?: boolean
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
  isBeta,
  classes,
  hintPosition = 'bottom',
  ...rest
}: IInput & React.InputHTMLAttributes<HTMLInputElement>): JSX.Element => {
  const isError = !_isEmpty(error)
  const type = rest.type || 'text'

  return (
    <Field as='div' className={className}>
      {label ? (
        <Label className='mb-1 flex text-sm font-medium text-gray-700 dark:text-gray-200'>
          {label}
          {isBeta && (
            <div className='ml-5'>
              <Beta />
            </div>
          )}
        </Label>
      ) : null}
      {hint && hintPosition === 'top' ? (
        <Description className='mt-1 whitespace-pre-line text-sm text-gray-500 dark:text-gray-300'>{hint}</Description>
      ) : null}
      <HeadlessInput
        type={type}
        className={cx(
          'block w-full rounded-md border-gray-300 shadow-sm dark:border-slate-800/25 dark:bg-slate-800 dark:text-gray-50 dark:placeholder-gray-400 sm:text-sm',
          {
            'text-red-900 placeholder-red-300 ring-1 ring-red-600': isError,
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
        <Description className='mt-2 whitespace-pre-line text-sm text-gray-500 dark:text-gray-300'>{hint}</Description>
      ) : null}
    </Field>
  )
}

export default memo(Input)
