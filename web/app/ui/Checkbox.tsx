import {
  Checkbox as HeadlessCheckbox,
  Description,
  Field,
  Label,
} from '@headlessui/react'
import { CheckIcon, MinusIcon } from '@phosphor-icons/react'
import cx from 'clsx'
import React, { memo } from 'react'

interface CheckboxProps {
  label: React.ReactNode
  hint?: React.ReactNode
  name?: string
  onChange?: (checked: boolean) => void
  checked?: boolean
  disabled?: boolean
  indeterminate?: boolean
  classes?: {
    label?: string
    hint?: string
  }
}

const Checkbox = ({
  label,
  hint,
  name,
  onChange,
  checked,
  disabled,
  indeterminate,
  classes,
}: CheckboxProps) => (
  <Field disabled={disabled}>
    <div className={cx('group flex items-center gap-x-2', classes?.label)}>
      <HeadlessCheckbox
        name={name}
        checked={checked}
        indeterminate={indeterminate}
        onChange={onChange}
        className={cx(
          'group/checkbox relative size-4 shrink-0 cursor-pointer rounded-[5px] bg-white ring-1 ring-gray-300 transition-[background-color,box-shadow] duration-150 ease-out ring-inset',
          'group-hover:ring-gray-400 dark:bg-slate-950 dark:ring-slate-700/80 dark:group-hover:ring-slate-600',
          'data-checked:bg-slate-900 data-checked:ring-slate-900 dark:data-checked:bg-slate-100 dark:data-checked:ring-slate-100',
          'data-indeterminate:bg-slate-900 data-indeterminate:ring-slate-900 dark:data-indeterminate:bg-slate-100 dark:data-indeterminate:ring-slate-100',
          'focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-hidden dark:focus-visible:ring-slate-300 dark:focus-visible:ring-offset-slate-950',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {indeterminate ? (
          <MinusIcon
            weight='bold'
            className='pointer-events-none absolute inset-0 m-auto size-3 text-white dark:text-slate-900'
          />
        ) : (
          <CheckIcon
            weight='bold'
            className='pointer-events-none absolute inset-0 m-auto size-3 scale-50 text-white opacity-0 transition-[transform,opacity] duration-150 ease-out group-data-checked/checkbox:scale-100 group-data-checked/checkbox:opacity-100 dark:text-slate-900'
          />
        )}
      </HeadlessCheckbox>
      <Label className='cursor-pointer text-sm font-medium text-gray-900 transition-colors duration-150 ease-out group-hover:text-gray-950 dark:text-gray-200 dark:group-hover:text-white'>
        {label}
      </Label>
    </div>
    {hint ? (
      <Description
        className={cx(
          'mt-1 text-sm text-gray-500 dark:text-gray-400',
          classes?.hint,
        )}
      >
        {hint}
      </Description>
    ) : null}
  </Field>
)

export default memo(Checkbox)
