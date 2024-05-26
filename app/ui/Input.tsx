import React, { memo } from 'react'
import { Description, Field, Input as HeadlessInput, Label } from '@headlessui/react'
import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import Beta from 'ui/Beta'

interface IInput {
  label?: string | JSX.Element
  hint?: string | JSX.Element
  placeholder?: string
  type?: string
  name?: string
  className?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string | null | boolean
  value?: string | number
  disabled?: boolean
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  isBeta?: boolean
}

const Input = ({
  label,
  hint,
  placeholder,
  type = 'text',
  name,
  className,
  onChange,
  error,
  value,
  disabled,
  onKeyDown,
  isBeta,
}: IInput): JSX.Element => {
  const isError = !_isEmpty(error)

  return (
    <Field as='div' className={className}>
      <Label className='mb-1 flex text-sm font-medium text-gray-700 dark:text-gray-200'>
        {label}
        {isBeta && (
          <div className='ml-5'>
            <Beta />
          </div>
        )}
      </Label>
      <HeadlessInput
        type={type}
        value={value}
        name={name}
        onChange={onChange}
        onKeyDown={onKeyDown}
        className={cx(
          'block w-full rounded-md border-gray-300 shadow-sm dark:border-slate-800/25 dark:bg-slate-800 dark:text-gray-50 dark:placeholder-gray-400 sm:text-sm',
          {
            'text-red-900 placeholder-red-300 ring-1 ring-red-600': isError,
            'cursor-text': disabled,
          },
        )}
        placeholder={placeholder}
        disabled={disabled}
        invalid={isError}
      />
      {isError && <p className='mt-2 text-sm text-red-600 dark:text-red-500'>{error}</p>}
      {hint && (
        <Description className='mt-2 whitespace-pre-line text-sm text-gray-500 dark:text-gray-300'>{hint}</Description>
      )}
    </Field>
  )
}

export default memo(Input)
