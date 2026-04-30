import React from 'react'

import { cn } from '~/utils/generic'

type TextElement =
  | 'span'
  | 'p'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'label'
  | 'div'
type TextSize =
  | 'xxs'
  | 'xs'
  | 'sm'
  | 'base'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'
type TextWeight = 'light' | 'normal' | 'medium' | 'semibold' | 'bold'
type TextColour =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'success'
  | 'warning'
  | 'error'
  | 'inherit'
type Tracking = 'tight' | 'normal' | 'wide'

interface TextProps {
  children: React.ReactNode
  as?: TextElement | 'button'
  size?: TextSize
  weight?: TextWeight
  colour?: TextColour
  tracking?: Tracking
  truncate?: boolean
  code?: boolean
  className?: string
  [key: string]: unknown
}

const sizeClasses: Record<TextSize, string> = {
  xxs: 'text-[10px]',
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
}

const weightClasses: Record<TextWeight, string> = {
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
}

const colourClasses: Record<TextColour, string> = {
  primary: 'text-gray-900 dark:text-gray-50',
  secondary: 'text-gray-700 dark:text-gray-200',
  muted: 'text-gray-500 dark:text-gray-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400',
  inherit: '',
}

const trackingClasses: Record<Tracking, string> = {
  tight: 'tracking-tight',
  normal: 'tracking-normal',
  wide: 'tracking-wide',
}

export const Text = ({
  children,
  as: Component = 'span',
  size = 'base',
  weight = 'normal',
  colour = 'primary',
  tracking = 'normal',
  truncate,
  code,
  className,
  ...props
}: TextProps) => (
  <Component
    className={cn(
      sizeClasses[size],
      weightClasses[weight],
      colourClasses[colour],
      trackingClasses[tracking],
      { truncate },
      code &&
        'rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[0.92em] ring-1 ring-gray-200/70 ring-inset dark:bg-slate-900 dark:ring-slate-700/60',
      className,
    )}
    {...props}
  >
    {children}
  </Component>
)
