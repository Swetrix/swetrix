/* eslint-disable react/button-has-type */
import React, { memo } from 'react'
import cx from 'clsx'
import PropTypes from 'prop-types'
// import { useSelector } from 'react-redux'
// import { THEME_TYPE } from 'redux/constants'
import Spin from './icons/Spin'
import './ButtonChristmas.css'

const Button = ({
  text, children, primary, secondary, danger, onClick, white, small, regular, large, giant, type, className, loading, semiSmall, semiDanger, noBorder, focus,
}: {
  text?: string,
  children?: JSX.Element,
  primary?: boolean,
  secondary?: boolean,
  danger?: boolean,
  onClick?: () => void,
  white?: boolean,
  small?: boolean,
  regular?: boolean,
  large?: boolean,
  giant?: boolean,
  type?: 'button' | 'submit' | 'reset',
  className?: string,
  loading?: boolean,
  semiSmall?: boolean,
  semiDanger?: boolean,
  focus?: boolean,
  noBorder?: boolean,
}): JSX.Element => {
  // const themeType = useSelector((state) => state.ui.theme.type)

  return (
    <button
      type={type}
      onClick={onClick}
      className={cx('relative inline-flex select-none items-center border leading-4 font-medium rounded-md', {
        'shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 border-transparent': primary,
        'text-indigo-700 bg-indigo-100 hover:bg-indigo-200 border-transparent': secondary,
        'text-gray-700 bg-white hover:bg-gray-50 border-transparent': white,
        'text-white bg-red-500 hover:bg-red-600 border-transparent': danger,
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
      {/* {themeType === THEME_TYPE.christmas ? (
        <span className={cx('inline-flex items-center', {
          button3: text,
          button2: semiSmall || regular || large || giant,
        })}
        >
          {loading && (
            <Spin />
          )}
          {text || children}
        </span>
      ) : (
        <>
          {loading && (
          <Spin />
          )}
          {text || children}
        </>
      )} */}
      {loading && (
      <Spin />
      )}
      {text || children}
    </button>
  )
}

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
}

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
}

export default memo(Button)
