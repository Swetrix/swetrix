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
  /**
   * Square icon-only button. Quiet by default, reveals a border + lifts to white
   * on hover. Pair with an icon child sized `size-5` (or `size-4` for compact toolbars).
   */
  icon?: boolean
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
  icon,
  ...props
}: ButtonProps) => (
  <HeadlessButton
    {...props}
    disabled={disabled || loading}
    type={type}
    className={cn(
      'relative inline-flex items-center rounded-md border leading-4 font-medium select-none',
      'transition-[background-color,color,box-shadow,transform] duration-150 ease-out',
      'active:scale-[0.985] active:duration-75',
      'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
      {
        'border-transparent bg-slate-900 text-gray-50 shadow-xs hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white':
          primary,
        'border-gray-300 bg-gray-50 text-slate-900 hover:bg-slate-200/70 dark:border-slate-700/80 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900':
          secondary,
        'border-transparent bg-white text-gray-700 shadow-xs hover:bg-gray-50 dark:bg-slate-900 dark:text-gray-100 dark:ring-1 dark:ring-slate-700 dark:hover:bg-slate-800':
          white,
        'border-transparent bg-red-500 text-gray-50 shadow-xs hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500':
          danger,
        'border-red-500 text-red-600 hover:bg-red-50 dark:border-red-400/70 dark:text-red-400 dark:hover:bg-red-500/15':
          semiDanger,
        'border-transparent bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-900 dark:hover:text-gray-100':
          ghost,
        'border-transparent bg-gray-50 p-2 text-gray-700 hover:border-gray-300 hover:bg-white dark:bg-slate-950 dark:text-gray-200 dark:hover:border-slate-700/80 dark:hover:bg-slate-900':
          icon,
        'border-none text-gray-700 focus:border-none focus:ring-0 focus:ring-offset-0 dark:text-gray-200':
          noBorder,
        'px-2.5 py-1.5 text-xs': small && !icon,
        'px-2.5 py-1.5 text-sm': semiSmall && !icon,
        'px-4 py-2 text-sm': large && !icon,
        'px-6 py-3 text-base': giant && !icon,
        'px-3 py-2 text-sm': regular && !icon,
        'focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-hidden dark:focus-visible:ring-slate-300 dark:focus-visible:ring-offset-slate-950':
          focus,
      },
      className,
    )}
  >
    {loading ? <Spin inherit /> : null}
    {text || children}
  </HeadlessButton>
)

export default memo(Button)
