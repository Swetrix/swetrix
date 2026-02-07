import {
  Checkbox as HeadlessCheckbox,
  Description,
  Field,
  Label,
} from '@headlessui/react'
import { CheckIcon } from '@phosphor-icons/react'
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
    <div className={cx('group flex items-center gap-2', classes?.label)}>
      <HeadlessCheckbox
        name={name}
        checked={checked}
        onChange={onChange}
        className='group/checkbox size-4 shrink-0 cursor-pointer rounded-sm bg-white ring-1 ring-gray-300 transition-colors duration-100 ease-out ring-inset group-hover:bg-gray-100 data-[checked]:bg-slate-900 data-[checked]:ring-slate-900 dark:bg-slate-950 dark:ring-slate-700/80 dark:group-hover:bg-slate-900/70 dark:data-[checked]:bg-slate-100 dark:data-[checked]:ring-slate-100'
      >
        <CheckIcon className='pointer-events-none size-4 scale-90 text-white opacity-0 transition-all duration-100 group-data-[checked]/checkbox:scale-100 group-data-[checked]/checkbox:opacity-100 dark:text-slate-900' />
      </HeadlessCheckbox>
      <Label className='cursor-pointer text-sm font-medium text-gray-900 transition-colors duration-100 ease-out group-hover:text-gray-950 dark:text-gray-200 dark:group-hover:text-white'>
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
