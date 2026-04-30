import { Button as HeadlessButton } from '@headlessui/react'
import React, { memo } from 'react'

import { cn } from '~/utils/generic'

import Spin from './icons/Spin'

/**
 * Visual style of the button.
 *
 * - `primary`        — Filled slate. Default. Use for the main action.
 * - `secondary`      — Bordered light grey card. Use for inline secondary actions.
 * - `white`          — White surface card with a subtle shadow. Use on grey backgrounds.
 * - `ghost`          — No surface. Use for tertiary actions where chrome would be noise.
 * - `danger`         — Filled red. Use for destructive actions (delete, etc.).
 * - `danger-outline` — Outlined red. Use for destructive actions in a quieter context.
 * - `icon`           — Square, square-padded, quiet. Reveals a card on hover. Pair with an
 *                      icon child sized `size-5` (or `size-4` for compact toolbars).
 *                      Always set `aria-label` for accessibility.
 */
type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'white'
  | 'ghost'
  | 'danger'
  | 'danger-outline'
  | 'icon'

/**
 * Padding + text scale.
 *
 * - `xs` — `px-2.5 py-1.5 text-xs` (smallest)
 * - `sm` — `px-2.5 py-1.5 text-sm`
 * - `md` — `px-3 py-2 text-sm` (default)
 * - `lg` — `px-4 py-2 text-sm`
 * - `xl` — `px-6 py-3 text-base` (largest)
 *
 * Ignored when `variant='icon'` (icon buttons use square padding + `text-sm`).
 */
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends Omit<
  React.ComponentPropsWithoutRef<typeof HeadlessButton>,
  'children'
> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  /**
   * Whether to render a focus ring on keyboard focus. Defaults to `true`.
   * Set to `false` for compact toolbar buttons embedded in a list where the ring would be visual noise.
   */
  focus?: boolean
  /** Native HTML `title` (tooltip on hover). Prefer the `Tooltip` primitive for richer content. */
  title?: string
  children?: React.ReactNode
}

/**
 * Class strings for each button variant. Exported so that 3rd-party render-as components
 * like `<PopoverButton as={...}>` can match the look without nesting two buttons.
 */
const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'border-transparent bg-slate-900 text-gray-50 shadow-xs hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white',
  secondary:
    'border-gray-300 bg-gray-50 text-slate-900 hover:bg-slate-200/70 dark:border-slate-700/80 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900',
  white:
    'border-transparent bg-white text-gray-700 shadow-xs hover:bg-gray-50 dark:bg-slate-900 dark:text-gray-100 dark:ring-1 dark:ring-slate-700 dark:hover:bg-slate-800',
  ghost:
    'border-transparent bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-900 dark:hover:text-gray-100',
  danger:
    'border-transparent bg-red-500 text-gray-50 shadow-xs hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500',
  'danger-outline':
    'border-red-500 text-red-600 hover:bg-red-50 dark:border-red-400/70 dark:text-red-400 dark:hover:bg-red-500/15',
  icon: 'border-transparent bg-transparent p-2 text-sm text-gray-700 hover:border-gray-300 hover:bg-white dark:text-gray-200 dark:hover:border-slate-700/80 dark:hover:bg-slate-900',
}

const BUTTON_SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1.5 text-xs',
  sm: 'px-2.5 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-2 text-sm',
  xl: 'px-6 py-3 text-base',
}

interface ButtonClassesOptions {
  variant?: ButtonVariant
  size?: ButtonSize
  focus?: boolean
  className?: string
}

/**
 * Returns the merged class string for a Button. Use this when you need the same
 * styling on a non-Button element (e.g., `<PopoverButton as='div' className={buttonClasses({variant: 'icon'})}>`).
 */
export const buttonClasses = ({
  variant = 'primary',
  size = 'md',
  focus = true,
  className,
}: ButtonClassesOptions = {}) => {
  const isIcon = variant === 'icon'
  return cn(
    'relative inline-flex items-center rounded-md border leading-4 font-medium select-none',
    'transition-[background-color,color,box-shadow,transform] duration-150 ease-out',
    'active:scale-[0.985] active:duration-75',
    focus &&
      'focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-hidden dark:focus-visible:ring-slate-300 dark:focus-visible:ring-offset-slate-950',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
    BUTTON_VARIANT_CLASSES[variant],
    !isIcon && BUTTON_SIZE_CLASSES[size],
    className,
  )
}

const Button = ({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  loading,
  disabled,
  focus = true,
  children,
  ...props
}: ButtonProps) => (
  <HeadlessButton
    {...props}
    disabled={disabled || loading}
    type={type}
    className={buttonClasses({ variant, size, focus, className })}
  >
    {loading ? <Spin inherit /> : null}
    {children}
  </HeadlessButton>
)

export default memo(Button)
