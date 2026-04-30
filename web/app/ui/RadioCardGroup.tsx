import { Field, Label, Radio, RadioGroup } from '@headlessui/react'
import _map from 'lodash/map'
import { Fragment, type ReactNode } from 'react'

import { cn } from '~/utils/generic'

interface RadioCardOption<T extends string> {
  value: T
  label: ReactNode
  description?: ReactNode
}

interface RadioCardGroupProps<T extends string> {
  /** Field name. Used by `name` prop on the underlying `RadioGroup`. */
  name?: string
  label?: ReactNode
  hint?: ReactNode
  options: RadioCardOption<T>[]
  value: T | null
  onChange: (value: T) => void
  error?: string | boolean | null
  disabled?: boolean
  className?: string
  /** When true, options stack with shared borders. Otherwise each card stands alone. */
  joined?: boolean
}

const RadioDot = ({ checked }: { checked: boolean }) => (
  <span
    aria-hidden='true'
    className={cn(
      'relative grid size-4 shrink-0 place-items-center rounded-full ring-1 transition-colors duration-150 ease-out',
      checked
        ? 'bg-slate-900 ring-slate-900 dark:bg-slate-100 dark:ring-slate-100'
        : 'ring-gray-300 group-hover:ring-gray-400 dark:ring-slate-700/80 dark:group-hover:ring-slate-600',
    )}
  >
    <span
      className={cn(
        'size-1.5 rounded-full bg-white transition-transform duration-150 ease-out dark:bg-slate-900',
        checked ? 'scale-100' : 'scale-0',
      )}
    />
  </span>
)

export function RadioCardGroup<T extends string>({
  name,
  label,
  hint,
  options,
  value,
  onChange,
  error,
  disabled,
  className,
  joined = true,
}: RadioCardGroupProps<T>) {
  const isError = !!error
  const total = options.length

  return (
    <Field as='div' className={className} disabled={disabled}>
      {label ? (
        <Label className='mb-1 block text-sm font-medium text-gray-900 dark:text-gray-200'>
          {label}
        </Label>
      ) : null}
      <RadioGroup
        name={name}
        value={value ?? undefined}
        onChange={onChange}
        className={cn(
          'rounded-md',
          joined ? '-space-y-px' : 'flex flex-col gap-2',
          isError && 'ring-1 ring-red-500 dark:ring-red-500/80',
        )}
      >
        {_map(options, (option, index) => {
          const isFirst = index === 0
          const isLast = index === total - 1

          return (
            <Radio key={option.value} value={option.value} as={Fragment}>
              {({ checked, focus }) => (
                <label
                  className={cn(
                    'group relative flex cursor-pointer items-start gap-3 border p-4 transition-[background-color,box-shadow] duration-150 ease-out',
                    joined
                      ? cn(
                          isFirst && 'rounded-t-md',
                          isLast && 'rounded-b-md',
                          !isFirst && !isLast && 'rounded-none',
                        )
                      : 'rounded-md',
                    checked
                      ? 'z-10 border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60'
                      : 'border-gray-200 hover:border-gray-300 dark:border-slate-700/80 dark:hover:border-slate-700',
                    focus &&
                      'z-10 ring-2 ring-slate-900 ring-offset-1 dark:ring-slate-300 dark:ring-offset-slate-950',
                    disabled && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <span className='mt-0.5'>
                    <RadioDot checked={checked} />
                  </span>
                  <span className='flex min-w-0 flex-col'>
                    <span
                      className={cn(
                        'block text-sm font-medium',
                        checked
                          ? 'text-slate-900 dark:text-white'
                          : 'text-gray-700 dark:text-gray-200',
                      )}
                    >
                      {option.label}
                    </span>
                    {option.description ? (
                      <span
                        className={cn(
                          'mt-0.5 block text-sm',
                          checked
                            ? 'text-slate-700 dark:text-slate-300'
                            : 'text-gray-500 dark:text-gray-400',
                        )}
                      >
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                </label>
              )}
            </Radio>
          )
        })}
      </RadioGroup>
      {isError && typeof error === 'string' ? (
        <p
          className='mt-1.5 text-sm text-red-600 dark:text-red-400'
          role='alert'
        >
          {error}
        </p>
      ) : null}
      {hint ? (
        <p className='mt-1.5 text-sm whitespace-pre-line text-gray-500 dark:text-gray-400'>
          {hint}
        </p>
      ) : null}
    </Field>
  )
}
