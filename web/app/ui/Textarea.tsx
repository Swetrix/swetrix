import { Description, Field, Label, Textarea as HeadlessTextarea } from '@headlessui/react'
import _isEmpty from 'lodash/isEmpty'
import React, { memo } from 'react'

import { cn } from '~/utils/generic'

interface TextareaProps {
  value: string | number
  label?: string
  hint?: string
  placeholder?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  classes?: {
    container?: string
    textarea?: string
  }
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
  onChange,
  error,
  value,
  disabled,
  readOnly,
  rows = 4,
  classes,
}: TextareaProps) => {
  const isError = !_isEmpty(error)

  return (
    <Field as='div' className={classes?.container}>
      {label ? <Label className='flex text-sm font-medium text-gray-900 dark:text-gray-200'>{label}</Label> : null}
      <HeadlessTextarea
        rows={rows}
        name={name}
        className={cn(
          'w-full rounded-md border-0 ring-1 focus:ring-indigo-500 sm:text-sm dark:bg-slate-800 dark:text-gray-50 dark:placeholder-gray-400',
          {
            'text-red-900 placeholder-red-300 ring-red-600': isError,
            'ring-gray-300 dark:ring-slate-800/50': !isError,
            'cursor-text': disabled,
          },
          classes?.textarea,
        )}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        invalid={isError}
      />
      {isError ? <p className='mt-2 text-sm text-red-600 dark:text-red-500'>{error}</p> : null}
      {hint ? (
        <Description className='mt-2 text-sm whitespace-pre-line text-gray-500 dark:text-gray-300'>{hint}</Description>
      ) : null}
    </Field>
  )
}

export default memo(Textarea) as typeof Textarea
