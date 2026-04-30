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
            <Label className='mb-1 flex text-sm font-medium text-gray-900 dark:text-gray-200'>
              {label}
            </Label>
          ) : null}
          <HeadlessTextarea
            ref={ref}
            rows={rows}
            name={name}
            className={cn(
              'block w-full resize-y rounded-md border-0 bg-white px-3 py-2 text-sm text-gray-900 ring-1 transition-shadow duration-150 ease-out ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-slate-900 focus:outline-hidden dark:bg-slate-950 dark:text-gray-50 dark:placeholder:text-gray-500 dark:focus:ring-slate-300',
              {
                'ring-red-500 placeholder:text-red-300 focus:ring-red-500 dark:ring-red-500/80 dark:focus:ring-red-400':
                  isError,
                'ring-gray-300 hover:ring-gray-400 dark:ring-slate-700/80 dark:hover:ring-slate-600':
                  !isError && !disabled && !readOnly,
                'cursor-not-allowed bg-gray-50 text-gray-500 ring-gray-200 dark:bg-slate-900 dark:text-gray-400 dark:ring-slate-800':
                  disabled,
                'cursor-default bg-gray-50 text-gray-700 ring-gray-200 dark:bg-slate-900/60 dark:text-gray-300 dark:ring-slate-800':
                  readOnly && !disabled,
              },
              classes?.textarea,
            )}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            invalid={isError}
            aria-invalid={isError || undefined}
            {...rest}
          />
          {isError ? (
            <p
              className='mt-1.5 text-sm text-red-600 dark:text-red-400'
              role='alert'
            >
              {error}
            </p>
          ) : null}
          {hint ? (
            <Description className='mt-1.5 text-sm whitespace-pre-line text-gray-500 dark:text-gray-400'>
              {hint}
            </Description>
          ) : null}
        </Field>
      )
    },
  ),
)

export default Textarea
