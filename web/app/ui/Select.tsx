import {
  Listbox,
  Transition,
  Label,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from '@headlessui/react'
import { CheckIcon, CaretUpDownIcon } from '@phosphor-icons/react'
import cx from 'clsx'
import _map from 'lodash/map'
import React, { Fragment, Key, memo } from 'react'
import { Text } from './Text'

interface SelectProps<T> {
  title?: React.ReactNode
  description?: React.ReactNode
  label?: React.ReactNode
  hint?: React.ReactNode
  className?: string
  fieldLabelClassName?: string
  labelClassName?: string
  buttonClassName?: string
  hintClassName?: string
  capitalise?: boolean
  items: readonly T[]
  id?: string
  labelExtractor?: (item: T, index: number) => React.ReactNode
  keyExtractor?: (item: T, index: number) => string
  iconExtractor?: (item: T, index: number) => React.ReactNode | null
  descriptionExtractor?: (item: T, index: number) => React.ReactNode | null
  disabledItemExtractor?: (item: T, index: number) => boolean
  onSelect: (item: T) => void
  selectedItem?: T
  wrap?: boolean
  disabled?: boolean
}

function Select<T>({
  title,
  description,
  label,
  hint,
  className,
  items = [],
  labelExtractor,
  keyExtractor,
  iconExtractor,
  descriptionExtractor,
  disabledItemExtractor,
  onSelect,
  id,
  buttonClassName,
  capitalise,
  labelClassName,
  fieldLabelClassName,
  selectedItem,
  hintClassName,
  wrap,
  disabled,
}: SelectProps<T>) {
  const isItemSelected = (item: T): boolean => {
    if (!selectedItem) return false

    if (keyExtractor) {
      return keyExtractor(item, 0) === keyExtractor(selectedItem, 0)
    }

    return item === selectedItem
  }

  const hasDescriptions = !!descriptionExtractor
  const generatedHintId = React.useId()
  const hintId = hint ? `${id || generatedHintId}-hint` : undefined

  return (
    <Listbox
      as='div'
      className='flex flex-col gap-1'
      id={id || ''}
      value={selectedItem}
      onChange={onSelect}
      disabled={disabled}
    >
      {({ open }) => (
        <>
          {label ? (
            <Label className={cx('block', fieldLabelClassName)}>
              <Text
                as='span'
                className='flex leading-tight whitespace-pre-line'
                size='sm'
                weight='medium'
                colour='primary'
              >
                {label}
              </Text>
            </Label>
          ) : null}
          {hint ? (
            <Text
              as='span'
              id={hintId}
              className={cx(
                'block leading-tight whitespace-pre-line',
                hintClassName,
              )}
              size='sm'
              colour='secondary'
            >
              {hint}
            </Text>
          ) : null}
          <div className={cx('relative', className)}>
            <ListboxButton
              aria-describedby={hintId}
              className={cx(
                'relative w-full rounded-md border-0 bg-white py-2 pr-9 pl-3 text-left text-sm font-medium text-gray-900 ring-1 ring-gray-300 transition-[background-color,box-shadow] duration-150 ease-out ring-inset hover:ring-gray-400 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden dark:bg-slate-950 dark:text-gray-50 dark:ring-slate-700/80 dark:hover:ring-slate-600 dark:focus-visible:ring-slate-300',
                disabled &&
                  'cursor-not-allowed opacity-60 hover:ring-gray-300 dark:hover:ring-slate-700/80',
                buttonClassName,
              )}
            >
              <Text
                as='span'
                size='sm'
                weight='medium'
                colour='inherit'
                truncate={!wrap}
                className={cx('block', {
                  'wrap-break-word': wrap,
                  'first-letter:capitalize': capitalise,
                })}
              >
                {title}
              </Text>
              {description ? (
                <Text
                  as='span'
                  size='xs'
                  colour='secondary'
                  truncate={!wrap}
                  className={cx('mt-0.5 block', {
                    'wrap-break-word': wrap,
                  })}
                >
                  {description}
                </Text>
              ) : null}
              <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
                <CaretUpDownIcon
                  className='size-4 text-gray-400 dark:text-gray-500'
                  aria-hidden='true'
                />
              </span>
            </ListboxButton>

            <Transition
              show={open}
              as={Fragment}
              enter='transition ease-out duration-150'
              enterFrom='opacity-0 -translate-y-0.5'
              enterTo='opacity-100 translate-y-0'
              leave='transition ease-in duration-100'
              leaveFrom='opacity-100 translate-y-0'
              leaveTo='opacity-0 -translate-y-0.5'
            >
              <ListboxOptions
                static
                modal={false}
                className='absolute z-30 mt-1.5 max-h-72 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-gray-200/80 focus:outline-hidden dark:bg-slate-950 dark:ring-slate-700/60'
              >
                {_map(items, (item, index) => {
                  const selected = isItemSelected(item)
                  const disabled = disabledItemExtractor?.(item, index) || false
                  const itemDescription = descriptionExtractor
                    ? descriptionExtractor(item, index)
                    : null
                  return (
                    <ListboxOption
                      key={
                        keyExtractor ? keyExtractor(item, index) : (item as Key)
                      }
                      className={({ focus }) =>
                        cx(
                          'relative mx-1 cursor-pointer rounded-md pr-8 pl-3 transition-colors duration-100 ease-out select-none',
                          hasDescriptions ? 'py-2.5' : 'py-2',
                          {
                            'cursor-not-allowed text-gray-400 dark:text-slate-600':
                              disabled && !selected,
                            'bg-gray-100 dark:bg-slate-900': focus || selected,
                            'text-gray-700 dark:text-gray-50':
                              !focus && !selected && !disabled,
                            'text-gray-900 dark:text-white': focus || selected,
                          },
                        )
                      }
                      disabled={disabled}
                      value={item}
                    >
                      <>
                        {iconExtractor ? (
                          <span
                            className={cx(
                              'absolute left-2 flex items-center',
                              hasDescriptions ? 'top-2.5' : 'inset-y-0',
                            )}
                          >
                            {iconExtractor(item, index)}
                          </span>
                        ) : null}

                        <Text
                          as='span'
                          size='sm'
                          weight={selected ? 'semibold' : 'normal'}
                          colour='inherit'
                          className={cx(
                            'block wrap-break-word',
                            iconExtractor && 'pl-6',
                            {
                              'first-letter:capitalize': capitalise,
                            },
                            labelClassName,
                          )}
                        >
                          {labelExtractor
                            ? labelExtractor(item, index)
                            : (item as React.ReactNode)}
                        </Text>

                        {itemDescription ? (
                          <Text
                            as='span'
                            size='xs'
                            colour='secondary'
                            className={cx(
                              'mt-0.5 block leading-snug wrap-break-word',
                              iconExtractor && 'pl-6',
                            )}
                          >
                            {itemDescription}
                          </Text>
                        ) : null}

                        {selected ? (
                          <span
                            className={cx(
                              'absolute right-2 flex items-center text-slate-900 dark:text-slate-100',
                              hasDescriptions ? 'top-2.5' : 'inset-y-0',
                            )}
                          >
                            <CheckIcon
                              weight='bold'
                              className='size-4'
                              aria-hidden='true'
                            />
                          </span>
                        ) : null}
                      </>
                    </ListboxOption>
                  )
                })}
              </ListboxOptions>
            </Transition>
          </div>
        </>
      )}
    </Listbox>
  )
}

export default memo(Select) as typeof Select
