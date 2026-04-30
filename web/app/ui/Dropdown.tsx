import {
  Menu,
  MenuButton,
  MenuItems,
  MenuItem,
  Transition,
} from '@headlessui/react'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import React, { memo, Fragment, Key } from 'react'

import { cn } from '~/utils/generic'
import { CaretDownIcon } from '@phosphor-icons/react'

import Spin from './icons/Spin'

interface DropdownProps<T> {
  title: string | number | React.ReactNode
  desc?: string | number | React.ReactNode
  className?: string
  items: T[]
  labelExtractor?: (
    item: T,
    close: () => void,
  ) => string | number | React.ReactNode
  keyExtractor?: (item: T, close: () => void) => Key
  onSelect: (
    item: T,
    e: React.MouseEvent<HTMLElement>,
    close: () => void,
  ) => void | null
  aside?: boolean
  buttonClassName?: string
  selectItemClassName?: string
  menuItemsClassName?: string
  header?: React.ReactNode
  chevron?: 'regular' | 'mini' | null
  headless?: boolean
  disabled?: boolean
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  loading?: boolean
  position?: 'up' | 'down'
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
  position = 'down',
}: DropdownProps<T>) {
  return (
    <Menu as='div' className={cn('relative inline-block text-left', className)}>
      {({ open, close }) => (
        <>
          {!_isEmpty(desc) ? (
            <p className='mb-2 text-sm text-gray-900 dark:text-gray-200'>
              {desc}
            </p>
          ) : null}
          <MenuButton
            onClick={onClick}
            disabled={disabled}
            className={cn(
              'transition-[background-color,color,box-shadow] duration-150 ease-out',
              {
                'justify-between': aside,
                'justify-center': !aside,
                'inline-flex w-full rounded-md border-0 bg-white px-3 py-2 text-sm font-medium ring-1 ring-gray-300 ring-inset hover:bg-gray-50 hover:ring-gray-400 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden md:px-4 dark:bg-slate-950 dark:text-gray-50 dark:ring-slate-700/80 dark:hover:bg-slate-900 dark:hover:ring-slate-600 dark:focus-visible:ring-slate-300':
                  !headless,
                'group inline-flex w-full px-3 py-2 text-sm font-medium outline-hidden md:px-4':
                  headless,
                'text-gray-700 dark:text-gray-50': !disabled,
                'cursor-not-allowed text-gray-500 opacity-60 dark:text-gray-400':
                  disabled,
              },
              buttonClassName,
            )}
          >
            <span className='truncate'>{title}</span>
            {chevron === 'regular' ? (
              <CaretDownIcon
                className={cn(
                  'ml-2 size-4 shrink-0 transform-gpu transition-transform duration-200 ease-out',
                  {
                    'rotate-180': open,
                  },
                )}
                aria-hidden='true'
              />
            ) : null}
            {chevron === 'mini' ? (
              <CaretDownIcon
                className={cn(
                  'ml-1 size-4 shrink-0 transform-gpu transition-transform duration-200 ease-out',
                  {
                    'rotate-180': open,
                  },
                )}
                aria-hidden='true'
              />
            ) : null}
          </MenuButton>

          <Transition
            show={open}
            as={Fragment}
            enter='transition ease-out duration-150'
            enterFrom='transform opacity-0 scale-95 -translate-y-0.5'
            enterTo='transform opacity-100 scale-100 translate-y-0'
            leave='transition ease-in duration-100'
            leaveFrom='transform opacity-100 scale-100 translate-y-0'
            leaveTo='transform opacity-0 scale-95 -translate-y-0.5'
          >
            <MenuItems
              anchor={{
                to: position === 'down' ? 'bottom end' : 'top end',
                offset: 6,
              }}
              modal={false}
              className={cn(
                'z-50 w-40 min-w-max rounded-lg bg-white p-1 shadow-lg ring-1 ring-gray-200/80 focus:outline-hidden dark:bg-slate-900 dark:ring-slate-700/60',
                menuItemsClassName,
              )}
            >
              {header ? (
                <>
                  <p className='px-2 pt-1.5 pb-1 text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400'>
                    {header}
                  </p>
                  <div className='mb-1 h-px bg-gray-100 dark:bg-slate-800' />
                </>
              ) : null}
              {loading ? (
                <div className='flex items-center justify-center px-4 py-3'>
                  <Spin className='mr-0! ml-0!' />
                  <span className='sr-only'>Loading...</span>
                </div>
              ) : (
                _map(items, (item) => (
                  <MenuItem
                    key={
                      keyExtractor ? keyExtractor(item, close) : (item as Key)
                    }
                  >
                    <span
                      className={cn(
                        'block cursor-pointer rounded-md px-2 py-1.5 text-sm text-gray-700 transition-colors duration-100 ease-out hover:bg-gray-100 hover:text-gray-900 data-focus:bg-gray-100 data-focus:text-gray-900 dark:text-gray-50 dark:hover:bg-slate-800 dark:hover:text-white dark:data-focus:bg-slate-800 dark:data-focus:text-white',
                        selectItemClassName,
                      )}
                      role='menuitem'
                      tabIndex={0}
                      onClick={(e: React.MouseEvent<HTMLElement>) =>
                        onSelect(item, e, close)
                      }
                    >
                      {labelExtractor
                        ? labelExtractor(item, close)
                        : (item as React.ReactNode)}
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
