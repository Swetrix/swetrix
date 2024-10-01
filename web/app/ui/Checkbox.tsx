import React, { memo } from 'react'
import { Checkbox as HeadlessCheckbox, Description, Field, Label } from '@headlessui/react'
import { CheckIcon } from '@heroicons/react/24/outline'
import cx from 'clsx'

interface ICheckbox {
  label: string | JSX.Element
  hint?: string | JSX.Element
  name?: string
  className?: string
  onChange?: (checked: boolean) => void
  checked?: boolean
  hintClassName?: string
  disabled?: boolean
}

const Checkbox = ({
  label,
  hint,
  name,
  className,
  onChange,
  checked,
  hintClassName,
  disabled,
}: ICheckbox): JSX.Element => (
  <Field className={className} disabled={disabled}>
    <div className='flex items-center gap-2'>
      <HeadlessCheckbox
        name={name}
        checked={checked}
        onChange={onChange}
        className='group size-4 rounded bg-white ring-1 ring-inset ring-gray-200 data-[checked]:bg-slate-900 data-[checked]:ring-slate-900 dark:bg-white/10 dark:ring-white/15 dark:data-[checked]:bg-white dark:data-[checked]:ring-white/15'
      >
        <CheckIcon className='hidden size-4 text-white group-data-[checked]:block dark:text-black' />
      </HeadlessCheckbox>
      <Label className='cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-200'>{label}</Label>
    </div>
    {hint && (
      <Description className={cx('mt-1 text-sm text-gray-500 dark:text-gray-300', hintClassName)}>{hint}</Description>
    )}
  </Field>
)

export default memo(Checkbox)
