import React, { memo } from 'react'
import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import PropTypes from 'prop-types'
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
  rows,
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
      <div className='mt-1 relative'>
        <textarea
          rows={rows}
          name={identifier}
          id={identifier}
          className={cx(
            'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:text-gray-50 dark:placeholder-gray-400 dark:border-slate-800/25 dark:bg-slate-800 rounded-md',
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
          <div className='absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none'>
            <ExclamationCircleIcon className='h-5 w-5 text-red-500' aria-hidden />
          </div>
        )}
      </div>
      <p className='mt-2 text-sm text-gray-500 dark:text-gray-300 whitespace-pre-line' id={`${identifier}-optional`}>
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

Textarea.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  label: PropTypes.string,
  hint: PropTypes.string,
  placeholder: PropTypes.string,
  onChange: PropTypes.func,
  id: PropTypes.string,
  type: PropTypes.string,
  className: PropTypes.string,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  name: PropTypes.string,
  disabled: PropTypes.bool,
  isBeta: PropTypes.bool,
  readOnly: PropTypes.bool,
  rows: PropTypes.number,
}

Textarea.defaultProps = {
  label: '',
  hint: '',
  placeholder: '',
  onChange: () => {},
  id: '',
  type: '',
  className: '',
  error: null,
  name: '',
  disabled: false,
  isBeta: false,
  readOnly: false,
  rows: 4,
}

export default memo(Textarea)
