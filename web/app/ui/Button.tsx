import { Button as HeadlessButton } from '@headlessui/react'
import React, { memo } from 'react'

import { cn } from '~/utils/generic'

import Spin from './icons/Spin'

interface ButtonProps extends React.ComponentPropsWithoutRef<
  typeof HeadlessButton
> {
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
  ghost?: boolean
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
  ghost,
  ...props
}: ButtonProps) => (
  <HeadlessButton
    {...props}
    disabled={disabled || loading}
    type={type}
    className={cn(
      'relative inline-flex items-center rounded-md border leading-4 font-medium transition-all select-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
      {
        'border-transparent bg-slate-900 text-gray-50 shadow-xs hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white':
          primary,
        'border-transparent bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600':
          secondary,
        'border-transparent bg-white text-gray-700 hover:bg-gray-50 dark:bg-slate-800 dark:text-gray-100 dark:ring-1 dark:ring-slate-700 dark:hover:bg-slate-700':
          white,
        'border-transparent bg-red-500 text-gray-50 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500':
          danger,
        'border border-red-500 text-red-600 hover:bg-red-500 hover:text-white dark:border-red-400 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white':
          semiDanger,
        'border-transparent bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-gray-100':
          ghost,
        'border-none text-gray-700 focus:border-none focus:ring-0 focus:ring-offset-0 dark:text-gray-200':
          noBorder,
        'px-2.5 py-1.5 text-xs': small,
        'px-2.5 py-1.5 text-sm': semiSmall,
        'px-4 py-2 text-sm': large,
        'px-6 py-3 text-base': giant,
        'px-3 py-2 text-sm': regular,
        'focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 focus:outline-hidden dark:focus:ring-slate-300 dark:focus:ring-offset-slate-900':
          focus,
      },
      className,
    )}
  >
    {loading ? <Spin alwaysLight /> : null}
    {text || children}
  </HeadlessButton>
)

export default memo(Button)
