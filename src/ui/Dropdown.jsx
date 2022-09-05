import React, { memo, Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import cx from 'clsx'
import _map from 'lodash/map'
import _isEmpty from 'lodash/isEmpty'
import PropTypes from 'prop-types'

const Dropdown = ({
  title, desc, className, items, labelExtractor, keyExtractor, onSelect, aside, buttonClassName, selectItemClassName,
}) => (
  <Menu as='div' className={cx('relative inline-block text-left', className)}>
    {({ open }) => (
      <>
        {!_isEmpty(desc) && (
          <p className='mb-2 text-sm text-gray-900'>{desc}</p>
        )}
        <div>
          <Menu.Button
            className={cx(buttonClassName || 'inline-flex w-full rounded-md border border-gray-300 shadow-sm px-3 md:px-4 py-2 bg-white text-sm font-medium text-gray-700 dark:text-gray-50 dark:border-gray-800 dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500', {
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
          <Menu.Items static className='z-50 origin-top-right absolute right-0 mt-2 w-40 min-w-max rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none'>
            <div className='py-1'>
              {_map(items, item => (
                <Menu.Item key={keyExtractor ? keyExtractor(item) : item}>
                  <span
                    className={selectItemClassName || 'text-gray-700 dark:text-gray-50 dark:border-gray-800 dark:bg-gray-700 block px-4 py-2 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600'}
                    role='menuitem'
                    tabIndex='-1'
                    id='menu-item-0'
                    onClick={() => onSelect(item)}
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
}

export default memo(Dropdown)
