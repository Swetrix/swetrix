import React, { memo } from 'react'
import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import { ExclamationCircleIcon } from '@heroicons/react/24/solid'
import Beta from 'ui/Beta'

interface ITextarea {
  value: string | number
  label?: string
  hint?: string
  placeholder?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  id?: string
  type?: string
  className?: string
  error?: string | boolean
  name?: string
  disabled?: boolean
  isBeta?: boolean
  readOnly?: boolean
  rows?: number
}

const Textarea = ({
  label,
  hint,
  placeholder,
  type,
  id,
  name,
  className,
  onChange,
  error,
  value,
  disabled,
  isBeta,
  readOnly,
  rows = 4,
}: ITextarea) => {
  const identifier = `textarea-${id || name || type}`
  const isError = !_isEmpty(error)

  return (
    <div className={className}>
      {label && (
        <label htmlFor={identifier} className='flex text-sm font-medium text-gray-700 dark:text-gray-200'>
          {label}
          {isBeta && (
            <div className='ml-5'>
              <Beta />
            </div>
          )}
        </label>
      )}
      <div className='relative mt-1'>
        <textarea
          rows={rows}
          name={identifier}
          id={identifier}
          className={cx(
            'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-800/25 dark:bg-slate-800 dark:text-gray-50 dark:placeholder-gray-400 sm:text-sm',
            {
              'border-red-300 text-red-900 placeholder-red-300': isError,
              'cursor-text': disabled,
            },
          )}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
        />
        {isError && (
          <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3'>
            <ExclamationCircleIcon className='h-5 w-5 text-red-500' aria-hidden />
          </div>
        )}
      </div>
      <p className='mt-2 whitespace-pre-line text-sm text-gray-500 dark:text-gray-300' id={`${identifier}-optional`}>
        {hint}
      </p>
      {isError && (
        <p className='mt-2 text-sm text-red-600 dark:text-red-500' id='email-error'>
          {error}
        </p>
      )}
    </div>
  )
}

export default memo(Textarea)
