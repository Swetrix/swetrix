import { Menu, MenuButton, MenuItems, MenuItem, Transition } from '@headlessui/react'
import { ChevronDownIcon as ChevronDownIconMini } from '@heroicons/react/20/solid'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import React, { memo, Fragment, Key } from 'react'

import Spin from './icons/Spin'

interface DropdownProps<T> {
  title: string | number | React.ReactNode
  desc?: string | number | React.ReactNode
  className?: string
  items: T[]
  labelExtractor?: (item: T, close: () => void) => string | number | React.ReactNode
  keyExtractor?: (item: T, close: () => void) => Key
  onSelect: (item: T, e: React.MouseEvent<HTMLElement>, close: () => void) => void | null
  aside?: boolean
  buttonClassName?: string
  selectItemClassName?: string
  menuItemsClassName?: string
  header?: React.ReactNode
  chevron?: 'regular' | 'mini'
  headless?: boolean
  disabled?: boolean
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  loading?: boolean
}

function Dropdown<T>({
  title,
  desc,
  className,
  items,
  labelExtractor,
  keyExtractor,
  onSelect,
  aside,
  buttonClassName,
  selectItemClassName,
  menuItemsClassName,
  header,
  chevron = 'regular',
  headless,
  disabled,
  onClick,
  loading,
}: DropdownProps<T>) {
  return (
    <Menu as='div' className={cx('relative inline-block text-left', className)}>
      {({ open, close }) => (
        <>
          {!_isEmpty(desc) ? <p className='mb-2 text-sm text-gray-900'>{desc}</p> : null}
          <MenuButton
            onClick={onClick}
            disabled={disabled}
            className={cx(buttonClassName, {
              'justify-between': aside,
              'justify-center': !aside,
              'inline-flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-100 focus:outline-hidden md:px-4 dark:border-gray-800 dark:bg-slate-800 dark:hover:bg-slate-700':
                !headless,
              'group inline-flex w-full px-3 py-2 text-sm font-medium outline-hidden md:px-4': headless,
              'text-gray-700 dark:text-gray-50': !disabled,
              'cursor-not-allowed text-gray-500 dark:text-gray-400': disabled,
            })}
          >
            {title}
            {chevron === 'regular' ? (
              <ChevronDownIcon
                className={cx('-mr-1 ml-2 h-5 w-5 transform-gpu transition-transform', {
                  'group-hover:text-gray-500': headless,
                  'rotate-180': open,
                })}
                aria-hidden='true'
              />
            ) : null}
            {chevron === 'mini' ? (
              <ChevronDownIconMini
                className={cx('-mr-1 ml-1 h-5 w-5 transform-gpu transition-transform', {
                  'group-hover:text-gray-500': headless,
                  'rotate-180': open,
                })}
                aria-hidden='true'
              />
            ) : null}
          </MenuButton>

          <Transition
            show={open}
            as={Fragment}
            enter='transition ease-out duration-100'
            enterFrom='transform opacity-0 scale-95'
            enterTo='transform opacity-100 scale-100'
            leave='transition ease-in duration-75'
            leaveFrom='transform opacity-100 scale-100'
            leaveTo='transform opacity-0 scale-95'
          >
            <MenuItems
              static
              className={cx(
                'absolute right-0 z-50 mt-2 w-40 min-w-max origin-top-right rounded-md bg-white ring-1 ring-black/10 focus:outline-hidden dark:bg-slate-800',
                menuItemsClassName,
                {
                  'divide-y divide-gray-100 dark:divide-gray-600': header,
                },
              )}
            >
              {header ? (
                <p className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-50'>{header}</p>
              ) : null}
              {loading ? (
                <div className='px-4 py-2'>
                  <Spin className='!ml-0' />
                  <span className='sr-only'>Loading...</span>
                </div>
              ) : (
                _map(items, (item, index) => (
                  <MenuItem key={keyExtractor ? keyExtractor(item, close) : (item as Key)}>
                    <span
                      className={cx(
                        selectItemClassName ||
                          'block cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:border-gray-800 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700',
                        {
                          'rounded-t-md': index === 0 && !header,
                          'rounded-b-md': index === items.length - 1,
                        },
                      )}
                      role='menuitem'
                      tabIndex={0}
                      onClick={(e: React.MouseEvent<HTMLElement>) => onSelect(item, e, close)}
                    >
                      {labelExtractor ? labelExtractor(item, close) : (item as React.ReactNode)}
                    </span>
                  </MenuItem>
                ))
              )}
            </MenuItems>
          </Transition>
        </>
      )}
    </Menu>
  )
}

export default memo(Dropdown) as typeof Dropdown
