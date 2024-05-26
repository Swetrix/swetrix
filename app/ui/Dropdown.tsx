import React, { memo, Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import { ChevronDownIcon as ChevronDownIconMini } from '@heroicons/react/20/solid'
import cx from 'clsx'
import _map from 'lodash/map'
import _isEmpty from 'lodash/isEmpty'

// Define the prop types for the component
interface IDropdown {
  title: string | number | React.ReactNode
  desc?: string | number | React.ReactNode
  className?: string
  /* (array): An array of items to be displayed in the dropdown menu. */
  items: any[]
  /* (function): A function that returns the label for each item in the dropdown menu. */
  labelExtractor?: (item: any) => string | number | React.ReactNode
  /* (function): A function that returns the key for each item in the dropdown menu. */
  keyExtractor?: (item: any) => string | number | React.ReactNode
  /* (function): A function that is called when an item is selected. */
  onSelect: (item: any, e?: React.MouseEvent<HTMLElement>) => void | null
  aside?: boolean
  buttonClassName?: string
  selectItemClassName?: string
  menuItemsClassName?: string
  header?: string | JSX.Element
  chevron?: 'regular' | 'mini'
  headless?: boolean
  disabled?: boolean
}

const Dropdown = ({
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
}: IDropdown): JSX.Element => (
  <Menu as='div' className={cx('relative inline-block text-left', className)}>
    {({ open }) => (
      <>
        {!_isEmpty(desc) && <p className='mb-2 text-sm text-gray-900'>{desc}</p>}
        <div>
          <Menu.Button
            disabled={disabled}
            className={cx(buttonClassName, {
              'justify-between': aside,
              'justify-center': !aside,
              'inline-flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-100 dark:border-gray-800 dark:bg-slate-800 dark:hover:bg-slate-700 md:px-4':
                !headless,
              'group inline-flex w-full px-3 py-2 text-sm font-medium outline-none md:px-4': headless,
              'text-gray-700 dark:text-gray-50': !disabled,
              'cursor-not-allowed text-gray-500 dark:text-gray-400': disabled,
            })}
          >
            {title}
            {chevron === 'regular' && (
              <ChevronDownIcon
                className={cx('-mr-1 ml-2 h-5 w-5', {
                  'group-hover:text-gray-500': headless,
                })}
                aria-hidden='true'
              />
            )}
            {chevron === 'mini' && (
              <ChevronDownIconMini
                className={cx('-mr-1 ml-1 h-5 w-5', {
                  'group-hover:text-gray-500': headless,
                })}
                aria-hidden='true'
              />
            )}
          </Menu.Button>
        </div>

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
          <Menu.Items
            static
            className={cx(
              'absolute right-0 z-50 mt-2 w-40 min-w-max origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-slate-800',
              menuItemsClassName,
              {
                'divide-y divide-gray-100 dark:divide-gray-600': header,
              },
            )}
          >
            {header && <p className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-50'>{header}</p>}
            {_map(items, (item) => (
              <Menu.Item key={keyExtractor ? keyExtractor(item) : item}>
                <span
                  className={
                    selectItemClassName ||
                    'block cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:border-gray-800 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
                  }
                  role='menuitem'
                  tabIndex={0}
                  onClick={(e: React.MouseEvent<HTMLElement>) => onSelect(item, e)}
                >
                  {labelExtractor ? labelExtractor(item) : item}
                </span>
              </Menu.Item>
            ))}
          </Menu.Items>
        </Transition>
      </>
    )}
  </Menu>
)

export default memo(Dropdown)
