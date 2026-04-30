import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react'
import {
  CheckCircleIcon,
  WarningOctagonIcon,
  InfoIcon,
  UsersIcon,
  XIcon,
} from '@phosphor-icons/react'
import React, { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '~/utils/generic'

import Button from './Button'

interface ModalProps {
  className?: string
  type?: 'error' | 'success' | 'info' | 'warning' | 'confirmed'
  title?: React.ReactNode
  message: React.ReactNode | string
  isOpened: boolean
  onClose: () => void
  onSubmit?: () => void
  closeText?: string
  submitText?: string
  submitDisabled?: boolean
  submitType?: 'regular' | 'danger'
  size?: 'regular' | 'medium' | 'large'
  customButtons?: React.ReactNode
  isLoading?: boolean
  overflowVisible?: boolean
}

const TYPE_ICONS: Record<
  NonNullable<ModalProps['type']>,
  { Icon: React.ElementType; iconClass: string; tintClass: string }
> = {
  success: {
    Icon: CheckCircleIcon,
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    tintClass: 'bg-emerald-100/70 dark:bg-emerald-500/10',
  },
  error: {
    Icon: WarningOctagonIcon,
    iconClass: 'text-red-600 dark:text-red-400',
    tintClass: 'bg-red-100/70 dark:bg-red-500/10',
  },
  info: {
    Icon: InfoIcon,
    iconClass: 'text-sky-600 dark:text-sky-400',
    tintClass: 'bg-sky-100/70 dark:bg-sky-500/10',
  },
  warning: {
    Icon: WarningOctagonIcon,
    iconClass: 'text-amber-600 dark:text-amber-400',
    tintClass: 'bg-amber-100/70 dark:bg-amber-500/10',
  },
  confirmed: {
    Icon: UsersIcon,
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    tintClass: 'bg-emerald-100/70 dark:bg-emerald-500/10',
  },
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
  isLoading,
  submitDisabled,
  overflowVisible,
}: ModalProps) => {
  const { t } = useTranslation()
  const typeMeta = type ? TYPE_ICONS[type] : null

  return (
    <Dialog
      className={cn('relative z-40', className)}
      open={isOpened}
      onClose={onClose}
    >
      <DialogBackdrop
        transition
        className='fixed inset-0 bg-gray-900/40 backdrop-blur-[2px] transition-opacity duration-200 data-closed:opacity-0 data-enter:ease-out data-leave:ease-in dark:bg-black/60'
      />

      <div className='fixed inset-0 z-10 w-screen overflow-y-auto'>
        <div className='flex min-h-full items-center justify-center p-4 text-center sm:p-0'>
          <DialogPanel
            transition
            className={cn(
              'inline-block w-full transform rounded-xl bg-white px-5 pt-5 pb-4 text-left align-bottom shadow-2xl ring-1 ring-gray-200/80 transition-all sm:my-8 sm:align-middle dark:bg-slate-950 dark:ring-slate-700/60',
              'duration-200 data-closed:translate-y-2 data-closed:scale-[0.98] data-closed:opacity-0 data-enter:ease-out data-leave:ease-in',
              {
                'sm:max-w-lg': size === 'regular',
                'sm:max-w-2xl': size === 'medium',
                'sm:max-w-5xl': size === 'large',
                'overflow-visible': overflowVisible,
                'overflow-hidden': !overflowVisible,
              },
            )}
          >
            <div className='sm:flex sm:items-start'>
              {typeMeta ? (
                <div
                  className={cn(
                    'mx-auto mb-3 flex size-10 shrink-0 items-center justify-center rounded-lg sm:mx-0 sm:mr-3 sm:mb-0 sm:size-9',
                    typeMeta.tintClass,
                  )}
                >
                  <typeMeta.Icon
                    className={cn('size-5', typeMeta.iconClass)}
                    weight='duotone'
                    aria-hidden='true'
                  />
                </div>
              ) : null}
              <div className='w-full text-center sm:text-left'>
                {title ? (
                  <DialogTitle
                    as='h3'
                    className={cn(
                      'flex items-center text-base leading-6 font-semibold text-gray-900 dark:text-gray-50',
                      {
                        'justify-between': !closeText,
                        'justify-center sm:justify-start': closeText,
                      },
                    )}
                  >
                    <div className='min-w-0'>{title}</div>
                    {!closeText ? (
                      <button
                        type='button'
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onClose?.()
                        }}
                        aria-label={t('common.close')}
                        className='ml-2 inline-flex shrink-0 items-center justify-center rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:focus-visible:ring-slate-300'
                      >
                        <XIcon className='size-4.5' />
                      </button>
                    ) : null}
                  </DialogTitle>
                ) : null}
                <div className='mt-2 text-sm whitespace-pre-line text-gray-600 dark:text-gray-300'>
                  {message}
                </div>
              </div>
            </div>
            <div className='mt-5 flex flex-col-reverse gap-2 sm:mt-4 sm:flex-row sm:justify-end'>
              {closeText ? (
                <Button
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onClose?.()
                  }}
                  secondary
                  large
                  className='w-full justify-center sm:w-auto'
                >
                  {closeText}
                </Button>
              ) : null}
              {submitText ? (
                <Button
                  onClick={onSubmit}
                  disabled={submitDisabled}
                  loading={isLoading}
                  primary={submitType === 'regular'}
                  danger={submitType === 'danger'}
                  large
                  className='w-full justify-center sm:w-auto'
                >
                  {submitText}
                </Button>
              ) : null}
              {customButtons}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  )
}

export default memo(Modal)
