import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import {
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import cx from 'clsx'
import React, { memo } from 'react'

import Beta from '~/ui/Beta'

import Spin from './icons/Spin'

interface ModalProps {
  className?: string
  type?: 'error' | 'success' | 'info' | 'warning' | 'confirmed'
  title?: string
  message: React.ReactNode | string
  isOpened: boolean
  onClose: () => void
  onSubmit?: () => void
  closeText?: string
  submitText?: string
  submitDisabled?: boolean
  submitType?: 'regular' | 'danger'
  size?: 'regular' | 'large'
  customButtons?: React.ReactNode
  isBeta?: boolean
  isLoading?: boolean
  overflowVisible?: boolean
}

const Modal = ({
  className,
  type,
  title,
  message,
  isOpened,
  onClose,
  onSubmit,
  closeText,
  submitText,
  submitType = 'regular',
  size = 'regular',
  customButtons,
  isBeta,
  isLoading,
  submitDisabled,
  overflowVisible,
}: ModalProps) => (
  <Dialog className={cx('relative z-10', className)} open={isOpened} onClose={onClose}>
    <DialogBackdrop
      transition
      className='fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in'
    />

    <div className='fixed inset-0 z-10 w-screen overflow-y-auto'>
      <div className='flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0'>
        <DialogPanel
          transition
          className={cx(
            'inline-block transform rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom transition-all sm:my-8 sm:px-5 sm:py-4 sm:align-middle dark:bg-slate-900',
            'transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in',
            {
              'sm:w-full sm:max-w-lg': size === 'regular',
              'w-full max-w-5xl': size === 'large',
              'overflow-visible': overflowVisible,
              'overflow-hidden': !overflowVisible,
            },
          )}
        >
          <div className='sm:flex sm:items-start'>
            {type === 'success' ? (
              <div className='mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 sm:mr-3 sm:h-10 sm:w-10'>
                <CheckIcon className='h-6 w-6 text-green-600' aria-hidden='true' />
              </div>
            ) : null}
            {type === 'error' ? (
              <div className='mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 sm:mr-3 sm:h-10 sm:w-10'>
                <ExclamationTriangleIcon className='h-6 w-6 text-red-600' aria-hidden='true' />
              </div>
            ) : null}
            {type === 'info' ? (
              <div className='mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-center sm:mr-3 sm:h-10 sm:w-10'>
                <InformationCircleIcon className='h-6 w-6 text-blue-600' aria-hidden='true' />
              </div>
            ) : null}
            {type === 'warning' ? (
              <div className='mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 sm:mr-3 sm:h-10 sm:w-10'>
                <ExclamationTriangleIcon className='h-6 w-6 text-amber-600' aria-hidden='true' />
              </div>
            ) : null}
            {type === 'confirmed' ? (
              <div className='mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 sm:mr-3 sm:h-10 sm:w-10'>
                <UserGroupIcon className='h-6 w-6 text-green-600' aria-hidden='true' />
              </div>
            ) : null}
            <div className='mt-3 w-full text-center sm:mt-0 sm:text-left'>
              {title ? (
                <DialogTitle
                  as='h3'
                  className={cx('flex items-center text-lg leading-6 font-medium text-gray-900 dark:text-gray-50', {
                    'justify-between': !closeText,
                    'justify-center sm:justify-start': closeText,
                  })}
                >
                  <div>
                    {title}
                    {isBeta ? <Beta className='ml-10' /> : null}
                  </div>
                  {!closeText ? (
                    <XMarkIcon
                      className='size-6 cursor-pointer stroke-2 text-gray-700 hover:text-gray-500 dark:text-gray-200 dark:hover:text-gray-300'
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onClose?.()
                      }}
                    />
                  ) : null}
                </DialogTitle>
              ) : null}
              <div className='mt-2 text-sm whitespace-pre-line text-gray-600 dark:text-gray-200'>{message}</div>
            </div>
          </div>
          <div className='px-4 py-3 font-mono sm:flex sm:flex-row-reverse sm:px-0 sm:pb-0'>
            {customButtons}
            {submitText ? (
              <button
                type='button'
                className={cx(
                  'inline-flex w-full justify-center rounded-md px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm',
                  {
                    'bg-indigo-600': submitType === 'regular',
                    'bg-red-600': submitType === 'danger',
                    'cursor-not-allowed opacity-70': submitDisabled,
                    'hover:bg-indigo-700': submitType === 'regular' && !submitDisabled,
                    'hover:bg-red-700': submitType === 'danger' && !submitDisabled,
                  },
                )}
                onClick={onSubmit}
              >
                {isLoading ? <Spin alwaysLight /> : null}
                {submitText}
              </button>
            ) : null}
            {closeText ? (
              <button
                type='button'
                className='mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:border-none dark:border-gray-600 dark:bg-slate-800 dark:text-gray-50 dark:hover:border-gray-600 dark:hover:bg-gray-700'
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onClose?.()
                }}
              >
                {closeText}
              </button>
            ) : null}
          </div>
        </DialogPanel>
      </div>
    </div>
  </Dialog>
)

export default memo(Modal)
