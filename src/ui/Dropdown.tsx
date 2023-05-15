import React, { memo, Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import cx from 'clsx'
import _map from 'lodash/map'
import _isEmpty from 'lodash/isEmpty'
import PropTypes from 'prop-types'

// Define the prop types for the component
interface IDropdown {
  title: string | number | React.ReactNode,
  desc?: string | number | React.ReactNode,
  className?: string,
  /* (array): An array of items to be displayed in the dropdown menu. */
  items: any[],
  /* (function): A function that returns the label for each item in the dropdown menu. */
  labelExtractor: (item: any) => string | number | React.ReactNode,
  /* (function): A function that returns the key for each item in the dropdown menu. */
  keyExtractor: (item: any) => string | number | React.ReactNode,
  /* (function): A function that is called when an item is selected. */
  onSelect: (item: any, e?: React.MouseEvent<HTMLElement>) => void | null,
  aside?: boolean,
  buttonClassName?: string,
  selectItemClassName?: string,
  menuItemsClassName?: string,
}

const Dropdown = ({
  title, desc, className, items, labelExtractor, keyExtractor, onSelect, aside, buttonClassName, selectItemClassName, menuItemsClassName,
}: IDropdown): JSX.Element => (
  <Menu as='div' className={cx('relative inline-block text-left', className)}>
    {({ open }) => (
      <>
        {!_isEmpty(desc) && (
          <p className='mb-2 text-sm text-gray-900'>{desc}</p>
        )}
        <div>
          <Menu.Button
            className={cx(buttonClassName || 'inline-flex w-full rounded-md border border-gray-300 shadow-sm px-3 md:px-4 py-2 bg-white text-sm font-medium text-gray-700 dark:text-gray-50 dark:border-gray-800 dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500', {
              'justify-between': aside,
              'justify-center': !aside,
            })}
          >
            {title}
            <ChevronDownIcon className='-mr-1 ml-2 h-5 w-5' aria-hidden='true' />
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
          <Menu.Items static className={cx('z-50 origin-top-right absolute right-0 mt-2 w-40 min-w-max rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 focus:outline-none', menuItemsClassName)}>
            <div className='py-1'>
              {_map(items, item => (
                <Menu.Item key={keyExtractor ? keyExtractor(item) : item}>
                  <span
                    className={selectItemClassName || 'text-gray-700 dark:text-gray-50 dark:border-gray-800 dark:bg-slate-800 block px-4 py-2 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700'}
                    role='menuitem'
                    // @ts-ignore
                    tabIndex='-1'
                    id='menu-item-0'
                    onClick={(e: React.MouseEvent<HTMLElement>) => onSelect(item, e)}
                  >
                    {labelExtractor ? labelExtractor(item) : item}
                  </span>
                </Menu.Item>
              ))}
            </div>
          </Menu.Items>
        </Transition>
      </>
    )}
  </Menu>
)

Dropdown.propTypes = {
  title: PropTypes.oneOfType([
    PropTypes.string, PropTypes.node,
  ]).isRequired,
  onSelect: PropTypes.func.isRequired,
  items: PropTypes.arrayOf(PropTypes.oneOfType([
    PropTypes.string, PropTypes.object,
  ])),
  className: PropTypes.string,
  buttonClassName: PropTypes.string,
  selectItemClassName: PropTypes.string,
  labelExtractor: PropTypes.func,
  keyExtractor: PropTypes.func,
  aside: PropTypes.bool,
  desc: PropTypes.string,
  menuItemsClassName: PropTypes.string,
}

Dropdown.defaultProps = {
  className: '',
  buttonClassName: '',
  selectItemClassName: '',
  labelExtractor: null,
  keyExtractor: null,
  aside: false,
  desc: '',
  items: [],
  menuItemsClassName: '',
}

export default memo(Dropdown)
