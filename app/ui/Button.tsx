/* eslint-disable react/button-has-type */
import React, { memo } from 'react'
import cx from 'clsx'
import PropTypes from 'prop-types'
import Spin from './icons/Spin'

// Define the prop types for the component
interface IButton {
  // (string): The text to be displayed in the button.
  text?: string,
  // (node): The content to be displayed in the button.
  children?: JSX.Element | string,
  primary?: boolean,
  secondary?: boolean,
  danger?: boolean,
  // (function): The function to be called when the button is clicked.
  onClick?: () => void,
  white?: boolean,
  small?: boolean,
  regular?: boolean,
  large?: boolean,
  giant?: boolean,
  // (string): The type of button to be rendered.
  type?: 'button' | 'submit' | 'reset',
  // (string): Additional CSS classes to be applied to the button.
  className?: string,
  // (boolean): Whether the button is in a loading state.
  loading?: boolean,
  semiSmall?: boolean,
  semiDanger?: boolean,
  // (boolean): Whether the button is in a focus state.
  focus?: boolean,
  noBorder?: boolean,
  // (boolean): Whether the button is disabled.
  disabled?: boolean,
}

const Button = ({
  text, children, primary, secondary, danger, onClick, white, small, regular, large,
  giant, type, className, loading, semiSmall, semiDanger, noBorder, focus, disabled,
}: IButton): JSX.Element => (
  <button
    disabled={disabled}
    type={type}
    onClick={onClick}
    className={cx('relative inline-flex select-none items-center border leading-4 font-medium rounded-md', {
      'shadow-sm text-gray-50 bg-slate-900 hover:bg-slate-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 border-transparent': primary,
      'text-slate-900 bg-slate-300 hover:bg-slate-200 border-transparent': secondary,
      'text-gray-700 bg-white hover:bg-gray-50 border-transparent': white,
      'text-gray-50 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 border-transparent': danger,
      'text-red-500 hover:text-red-600 border-red-600 dark:text-red-300 dark:hover:text-red-400 dark:border-red-500 border-1': semiDanger,
      'focus:border-none border-none text-gray-700 dark:text-white focus:ring-0 focus:ring-offset-0': noBorder,
      'px-2.5 py-1.5 text-xs': small,
      'px-2.5 py-1.5 text-sm': semiSmall,
      'px-4 py-2 text-sm': large,
      'px-6 py-3 text-base': giant,
      'px-3 py-2 text-sm': regular,
      'cursor-not-allowed': loading,
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500': focus,
    }, className)}
  >
    {loading && (
      <Spin alwaysLight />
    )}
    {text || children}
  </button>
)

// Define the prop types for the component
Button.propTypes = {
  text: PropTypes.string,
  children: PropTypes.node,
  onClick: PropTypes.func,
  primary: PropTypes.bool,
  secondary: PropTypes.bool,
  white: PropTypes.bool,
  danger: PropTypes.bool,
  semiDanger: PropTypes.bool,
  small: PropTypes.bool,
  semiSmall: PropTypes.bool,
  regular: PropTypes.bool,
  large: PropTypes.bool,
  giant: PropTypes.bool,
  type: PropTypes.string,
  className: PropTypes.string,
  loading: PropTypes.bool,
  focus: PropTypes.bool,
  noBorder: PropTypes.bool,
  disabled: PropTypes.bool,
}

// Define the default props for the component
Button.defaultProps = {
  text: null,
  onClick: () => { },
  primary: false,
  secondary: false,
  white: false,
  small: false,
  semiSmall: false,
  regular: false,
  large: false,
  danger: false,
  semiDanger: false,
  giant: false,
  loading: false,
  type: 'button',
  className: '',
  children: null,
  focus: true,
  noBorder: false,
  disabled: false,
}

export default memo(Button)
