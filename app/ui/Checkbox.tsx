import React, { memo } from 'react'
import cx from 'clsx'

interface ICheckbox {
  label: string | JSX.Element
  hint?: string | JSX.Element
  id?: string
  name?: string
  className?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  checked?: boolean
  hintClassName?: string
  disabled?: boolean
}

const Checkbox = ({
  label,
  hint,
  id,
  name,
  className,
  onChange,
  checked,
  hintClassName,
  disabled,
}: ICheckbox): JSX.Element => {
  const identifier = id || name

  return (
    <div
      className={cx(
        'relative flex items-start whitespace-pre-line',
        {
          'cursor-not-allowed': disabled,
        },
        className,
      )}
    >
      <div className='flex items-center h-5'>
        <input
          id={identifier}
          aria-describedby={identifier}
          name={name}
          disabled={disabled}
          type='checkbox'
          checked={checked}
          onChange={onChange}
          className={cx(
            'focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 dark:border-slate-800 dark:bg-slate-700 dark:checked:bg-indigo-600 rounded cursor-pointer',
            { '!cursor-not-allowed': disabled, 'opacity-50': disabled },
          )}
        />
      </div>
      <div className='ml-3 text-sm'>
        <label
          htmlFor={identifier}
          className={cx('font-medium text-gray-700 dark:text-gray-200 cursor-pointer', {
            '!cursor-not-allowed': disabled,
          })}
        >
          {label}
        </label>
        {hint && (
          <p id={`${identifier}-description`} className={cx('text-gray-500 dark:text-gray-300', hintClassName)}>
            {hint}
          </p>
        )}
      </div>
    </div>
  )
}

export default memo(Checkbox)
