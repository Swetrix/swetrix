import {
  Checkbox as HeadlessCheckbox,
  Description,
  Field,
  Label,
} from '@headlessui/react'
import { CheckIcon } from '@heroicons/react/24/outline'
import cx from 'clsx'
import React, { memo } from 'react'

interface CheckboxProps {
  label: React.ReactNode
  hint?: React.ReactNode
  name?: string
  onChange?: (checked: boolean) => void
  checked?: boolean
  disabled?: boolean
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
  classes,
}: CheckboxProps) => (
  <Field disabled={disabled}>
    <div className={cx('flex items-center gap-2', classes?.label)}>
      <HeadlessCheckbox
        name={name}
        checked={checked}
        onChange={onChange}
        className='group size-4 shrink-0 cursor-pointer rounded-sm bg-white ring-1 ring-gray-200 transition-colors duration-100 ease-out ring-inset data-[checked]:bg-slate-900 data-[checked]:ring-slate-900 dark:bg-white/10 dark:ring-white/15 dark:data-[checked]:bg-white dark:data-[checked]:ring-white/15'
      >
        <CheckIcon className='pointer-events-none size-4 scale-90 text-white opacity-0 transition-all duration-100 group-data-[checked]:scale-100 group-data-[checked]:opacity-100 dark:text-black' />
      </HeadlessCheckbox>
      <Label className='cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-200'>
        {label}
      </Label>
    </div>
    {hint ? (
      <Description
        className={cx(
          'mt-1 text-sm text-gray-500 dark:text-gray-300',
          classes?.hint,
        )}
      >
        {hint}
      </Description>
    ) : null}
  </Field>
)

export default memo(Checkbox)
