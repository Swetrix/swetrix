import React from 'react'

import { cn } from '~/utils/generic'

type TextElement = 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label' | 'div'
type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
type TextWeight = 'light' | 'normal' | 'medium' | 'semibold' | 'bold'
type TextColour = 'primary' | 'secondary' | 'muted' | 'success' | 'warning' | 'error' | 'inherit'

export interface TextProps {
  children: React.ReactNode
  as?: TextElement
  size?: TextSize
  weight?: TextWeight
  colour?: TextColour
  truncate?: boolean
  className?: string
  [key: string]: unknown
}

const sizeClasses: Record<TextSize, string> = {
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
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-500',
  error: 'text-red-600 dark:text-red-400',
  inherit: '',
}

export const Text = ({
  children,
  as: Component = 'span',
  size = 'base',
  weight = 'normal',
  colour = 'primary',
  truncate,
  className,
  ...props
}: TextProps) => (
  <Component
    className={cn(sizeClasses[size], weightClasses[weight], colourClasses[colour], { truncate }, className)}
    {...props}
  >
    {children}
  </Component>
)
