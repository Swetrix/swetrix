import React, { memo } from 'react'
import { Description, Field, Label, Textarea as HeadlessTextarea } from '@headlessui/react'
import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'

interface ITextarea {
  value: string | number
  label?: string
  hint?: string
  placeholder?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  className?: string
  error?: string | boolean
  name?: string
  disabled?: boolean
  readOnly?: boolean
  rows?: number
}

const Textarea = ({
  label,
  hint,
  placeholder,
  name,
  className,
  onChange,
  error,
  value,
  disabled,
  readOnly,
  rows = 4,
}: ITextarea) => {
  const isError = !_isEmpty(error)

  return (
    <Field as='div' className={className}>
      {label && <Label className='flex text-sm font-medium text-gray-700 dark:text-gray-200'>{label}</Label>}
      <HeadlessTextarea
        rows={rows}
        name={name}
        className={cx(
          'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-800/25 dark:bg-slate-800 dark:text-gray-50 dark:placeholder-gray-400 sm:text-sm',
          {
            'text-red-900 placeholder-red-300 ring-1 ring-red-600': isError,
            'cursor-text': disabled,
          },
        )}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        invalid={isError}
      />
      {isError && <p className='mt-2 text-sm text-red-600 dark:text-red-500'>{error}</p>}
      {hint && (
        <Description className='mt-2 whitespace-pre-line text-sm text-gray-500 dark:text-gray-300'>{hint}</Description>
      )}
    </Field>
  )
}

export default memo(Textarea)
