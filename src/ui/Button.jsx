import React, { memo } from 'react'
import cx from 'classnames'
import PropTypes from 'prop-types'

import Spin from './icons/Spin'

const Button = ({
  text, children, primary, secondary, danger, onClick, white, small, regular, large, giant, type, className, loading,
}) => (
  <button
    type={type}
    onClick={onClick}
    className={cx('inline-flex items-center border border-transparent leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500', {
      'shadow-sm text-white bg-indigo-600 hover:bg-indigo-700': primary,
      'text-indigo-700 bg-indigo-100 hover:bg-indigo-200': secondary,
      'text-gray-700 bg-white hover:bg-gray-50': white,
      'text-white bg-red-500 hover:bg-red-600': danger,
      'px-2.5 py-1.5 text-xs': small,
      'px-4 py-2 text-sm': large,
      'px-6 py-3 text-base': giant,
      'px-3 py-2 text-sm': regular,
      'cursor-not-allowed': loading,
    }, className)}
  >
    {loading && (
      <Spin />
    )}
    {text || children}
  </button>
)

Button.propTypes = {
  text: PropTypes.string,
  children: PropTypes.node,
  onClick: PropTypes.func,
  primary: PropTypes.bool,
  secondary: PropTypes.bool,
  white: PropTypes.bool,
  danger: PropTypes.bool,
  small: PropTypes.bool,
  regular: PropTypes.bool,
  large: PropTypes.bool,
  giant: PropTypes.bool,
  type: PropTypes.string,
  className: PropTypes.string,
  loading: PropTypes.bool,
}

Button.defaultProps = {
  text: null,
  onClick: () => { },
  primary: false,
  secondary: false,
  white: false,
  small: false,
  regular: false,
  large: false,
  danger: false,
  giant: false,
  loading: false,
  type: 'button',
  className: '',
}

export default memo(Button)
