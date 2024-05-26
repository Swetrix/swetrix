/* eslint-disable react/button-has-type */
import React, { ButtonHTMLAttributes, memo } from 'react'
import cx from 'clsx'
import Spin from './icons/Spin'

// Define the prop types for the component
interface IButton extends React.DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> {
  // (string): The text to be displayed in the button.
  text?: string
  // (node): The content to be displayed in the button.
  children?: JSX.Element | string
  primary?: boolean
  secondary?: boolean
  danger?: boolean
  // (function): The function to be called when the button is clicked.
  onClick?: () => void
  white?: boolean
  small?: boolean
  regular?: boolean
  large?: boolean
  giant?: boolean
  // (string): The type of button to be rendered.
  type?: 'button' | 'submit' | 'reset'
  // (string): Additional CSS classes to be applied to the button.
  className?: string
  // (boolean): Whether the button is in a loading state.
  loading?: boolean
  semiSmall?: boolean
  semiDanger?: boolean
  // (boolean): Whether the button is in a focus state.
  focus?: boolean
  noBorder?: boolean
  // (boolean): Whether the button is disabled.
  disabled?: boolean
}

const Button = ({
  text,
  children,
  primary,
  secondary,
  danger,
  onClick,
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
}: IButton): JSX.Element => (
  <button
    {...props}
    disabled={disabled || loading}
    type={type}
    onClick={onClick}
    className={cx(
      'relative inline-flex select-none items-center rounded-md border font-medium leading-4',
      {
        'border-transparent bg-slate-900 text-gray-50 shadow-sm hover:bg-slate-700 dark:bg-indigo-700 dark:hover:bg-indigo-800':
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
        'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2': focus,
      },
      className,
    )}
  >
    {loading && <Spin alwaysLight />}
    {text || children}
  </button>
)

export default memo(Button)
