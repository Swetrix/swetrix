import React, { Fragment, memo } from 'react'
import PropTypes from 'prop-types'
import cx from 'clsx'
import { Dialog, Transition } from '@headlessui/react'
import {
  CheckIcon, ExclamationTriangleIcon, InformationCircleIcon, UserGroupIcon,
} from '@heroicons/react/24/outline'
import Beta from 'ui/Beta'

interface IModal {
  className?: string,
  type: 'error' | 'success' | 'info' | 'warning' | 'confirmed',
  title: string,
  message: React.ReactNode | string,
  isOpened: boolean,
  onClose: () => void,
  onSubmit?: () => void,
  closeText?: string,
  submitText?: string,
  submitType?: 'regular' | 'danger',
  size?: 'regular' | 'large',
  customButtons?: JSX.Element,
  isBeta?: boolean,
}

const Modal = ({
  className, type, title, message, isOpened, onClose, onSubmit, closeText, submitText, submitType, size, customButtons, isBeta,
}: IModal): JSX.Element => (
  <Transition.Root show={isOpened} as={Fragment}>
    <Dialog
      as='div'
      className={cx('fixed z-10 inset-0 overflow-y-auto', className)}
      open={isOpened}
      onClose={onClose}
      static
    >
      <div className='flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
        <Transition.Child
          as={Fragment}
          enter='ease-out duration-300'
          enterFrom='opacity-0'
          enterTo='opacity-100'
          leave='ease-in duration-200'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <Dialog.Overlay className='fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-opacity-55 transition-opacity' />
        </Transition.Child>

        {/* This element is to trick the browser into centering the modal contents. */}
        <span className='hidden sm:inline-block sm:align-middle sm:h-screen' aria-hidden='true'>
          &#8203;
        </span>
        <Transition.Child
          as={Fragment}
          enter='ease-out duration-300'
          enterFrom='opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95'
          enterTo='opacity-100 translate-y-0 sm:scale-100'
          leave='ease-in duration-200'
          leaveFrom='opacity-100 translate-y-0 sm:scale-100'
          leaveTo='opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95'
        >
          <div
            className={cx('inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:px-5 sm:py-4', {
              'sm:max-w-lg sm:w-full': size === 'regular',
              'max-w-5xl w-full': size === 'large',
            })}
          >
            <div className='sm:flex sm:items-start'>
              {type === 'success' && (
                <div className='sm:mr-3 mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:h-10 sm:w-10'>
                  <CheckIcon className='h-6 w-6 text-green-600' aria-hidden='true' />
                </div>
              )}
              {type === 'error' && (
                <div className='sm:mr-3 mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:h-10 sm:w-10'>
                  <ExclamationTriangleIcon className='h-6 w-6 text-red-600' aria-hidden='true' />
                </div>
              )}
              {type === 'info' && (
                <div className='sm:mr-3 mx-auto flex-shrink-0 flex items-center text-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:h-10 sm:w-10'>
                  <InformationCircleIcon className='h-6 w-6 text-blue-600' aria-hidden='true' />
                </div>
              )}
              {type === 'warning' && (
                <div className='sm:mr-3 mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 sm:h-10 sm:w-10'>
                  <ExclamationTriangleIcon className='h-6 w-6 text-amber-600' aria-hidden='true' />
                </div>
              )}
              {type === 'confirmed' && (
                <div className='sm:mr-3 mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:h-10 sm:w-10'>
                  <UserGroupIcon className='h-6 w-6 text-green-600' aria-hidden='true' />
                </div>
              )}
              <div className='mt-3 text-center sm:mt-0 sm:text-left w-full'>
                {title && (
                  <Dialog.Title as='h3' className='flex items-center text-lg leading-6 font-medium text-gray-900 dark:text-gray-50'>
                    {title}
                    {isBeta && (
                      <Beta className='ml-10' />
                    )}
                  </Dialog.Title>
                )}
                <div className='mt-2 text-sm text-gray-600 whitespace-pre-line dark:text-gray-200'>
                  {message}
                </div>
              </div>
            </div>
            <div className='px-4 py-3 sm:px-0 sm:pb-0 sm:flex sm:flex-row-reverse'>
              {customButtons}
              {submitText && (
                <button
                  type='button'
                  className={cx('w-full inline-flex justify-center rounded-md shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm', {
                    'bg-indigo-600 hover:bg-indigo-700': submitType === 'regular',
                    'bg-red-600 hover:bg-red-700': submitType === 'danger',
                  })}
                  onClick={onSubmit}
                >
                  {submitText}
                </button>
              )}
              {closeText && (
                <button
                  type='button'
                  className='mt-3 w-full inline-flex justify-center rounded-md dark:border-none border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:hover:border-gray-600 dark:hover:bg-gray-700 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm'
                  onClick={onClose}
                >
                  {closeText}
                </button>
              )}
            </div>
          </div>
        </Transition.Child>
      </div>
    </Dialog>
  </Transition.Root>
)

Modal.propTypes = {
  type: PropTypes.oneOf(['error', 'success', 'info', 'warning', 'confirmed']),
  title: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  message: PropTypes.oneOfType([
    PropTypes.string, PropTypes.node,
  ]),
  className: PropTypes.string,
  isOpened: PropTypes.bool,
  onSubmit: PropTypes.func,
  closeText: PropTypes.string,
  submitText: PropTypes.string,
  submitType: PropTypes.oneOf(['regular', 'danger']),
  size: PropTypes.oneOf(['regular', 'large']),
  customButtons: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
  isBeta: PropTypes.bool,
}

Modal.defaultProps = {
  className: '',
  message: '',
  isOpened: false,
  onSubmit: () => { },
  closeText: null,
  submitText: null,
  submitType: 'regular',
  size: 'regular',
  type: null,
  title: null,
  customButtons: null,
  isBeta: false,
}

export default memo(Modal)
