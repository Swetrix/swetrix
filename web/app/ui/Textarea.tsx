import {
  Description,
  Field,
  Label,
  Textarea as HeadlessTextarea,
} from '@headlessui/react'
import _isEmpty from 'lodash/isEmpty'
import React, { forwardRef, memo } from 'react'

import { cn } from '~/utils/generic'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string | number
  label?: string
  hint?: string
  classes?: {
    container?: string
    textarea?: string
  }
  error?: string | boolean
}

const Textarea = memo(
  forwardRef<HTMLTextAreaElement, TextareaProps>(
    (
      {
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
        ...rest
      },
      ref,
    ) => {
      const isError = !_isEmpty(error)

      return (
        <Field as='div' className={classes?.container}>
          {label ? (
            <Label className='flex text-sm font-medium text-gray-900 dark:text-gray-200'>
              {label}
            </Label>
          ) : null}
          <HeadlessTextarea
            ref={ref}
            rows={rows}
            name={name}
            className={cn(
              'w-full rounded-md border-0 bg-white ring-1 ring-inset focus:ring-slate-900 sm:text-sm dark:bg-slate-950 dark:text-gray-50 dark:placeholder-gray-400 dark:focus:ring-slate-300',
              {
                'text-red-900 placeholder-red-300 ring-red-600': isError,
                'ring-gray-300 dark:ring-slate-700/80': !isError,
                'cursor-not-allowed bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400':
                  disabled,
              },
              classes?.textarea,
            )}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            invalid={isError}
            {...rest}
          />
          {isError ? (
            <p className='mt-2 text-sm text-red-600 dark:text-red-500'>
              {error}
            </p>
          ) : null}
          {hint ? (
            <Description className='mt-2 text-sm whitespace-pre-line text-gray-500 dark:text-gray-300'>
              {hint}
            </Description>
          ) : null}
        </Field>
      )
    },
  ),
)

export default Textarea
