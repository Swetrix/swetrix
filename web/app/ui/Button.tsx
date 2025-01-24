/* eslint-disable react/button-has-type */
import React, { memo } from 'react'
import { Button as HeadlessButton } from '@headlessui/react'
import cx from 'clsx'
import Spin from './icons/Spin'

interface ButtonProps extends React.ComponentPropsWithoutRef<typeof HeadlessButton> {
  text?: string
  children?: React.ReactNode
  primary?: boolean
  secondary?: boolean
  danger?: boolean
  white?: boolean
  small?: boolean
  regular?: boolean
  large?: boolean
  giant?: boolean
  loading?: boolean
  semiSmall?: boolean
  semiDanger?: boolean
  focus?: boolean
  noBorder?: boolean
  title?: string
}

const Button = ({
  text,
  children,
  primary,
  secondary,
  danger,
  white,
  small,
  regular,
  large,
  giant,
  type = 'button',
  className,
  loading,
  semiSmall,
  semiDanger,
  noBorder,
  focus = true,
  disabled,
  ...props
}: ButtonProps) => (
  <HeadlessButton
    {...props}
    disabled={disabled || loading}
    type={type}
    className={cx(
      'relative inline-flex select-none items-center rounded-md border font-medium leading-4',
      {
        'shadow-xs border-transparent bg-slate-900 text-gray-50 hover:bg-slate-700 dark:border-slate-700/50 dark:bg-slate-800 dark:hover:bg-slate-700':
          primary,
        'border-transparent bg-slate-300 text-slate-900 hover:bg-slate-200': secondary,
        'border-transparent bg-white text-gray-700 hover:bg-gray-50': white,
        'border-transparent bg-red-500 text-gray-50 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700': danger,
        'border-1 border-red-600 text-red-500 hover:text-red-600 dark:border-red-500 dark:text-red-300 dark:hover:text-red-400':
          semiDanger,
        'border-none text-gray-700 focus:border-none focus:ring-0 focus:ring-offset-0 dark:text-white': noBorder,
        'px-2.5 py-1.5 text-xs': small,
        'px-2.5 py-1.5 text-sm': semiSmall,
        'px-4 py-2 text-sm': large,
        'px-6 py-3 text-base': giant,
        'px-3 py-2 text-sm': regular,
        'cursor-not-allowed': loading,
        'focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2': focus,
      },
      className,
    )}
  >
    {loading && <Spin alwaysLight />}
    {text || children}
  </HeadlessButton>
)

export default memo(Button)
