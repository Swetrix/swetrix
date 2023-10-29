import React from 'react'
import cx from 'clsx'
import PropTypes from 'prop-types'

interface IPin {
  label: string,
  className?: string,
}

const ActivePin = ({ label, className }: IPin): JSX.Element => (
  <p className={cx('px-2 inline-flex text-sm leading-5 font-normal rounded-md bg-green-100 text-green-800 dark:text-gray-300 dark:bg-slate-600', className)}>
    {label}
  </p>
)

const InactivePin = ({ label, className }: IPin): JSX.Element => (
  <p className={cx('px-2 inline-flex text-sm leading-5 font-normal rounded-md bg-red-100 text-red-800 dark:text-gray-300 dark:bg-slate-600', className)}>
    {label}
  </p>
)

const WarningPin = ({ label, className }: IPin): JSX.Element => (
  <p className={cx('px-2 inline-flex text-sm leading-5 font-normal rounded-md bg-yellow-200 text-yellow-800 dark:text-gray-300 dark:bg-slate-600', className)}>
    {label}
  </p>
)

const CustomPin = ({ label, className }: IPin): JSX.Element => (
  <p className={cx('px-2 inline-flex text-sm leading-5 font-normal rounded-md', className)}>
    {label}
  </p>
)

const propTypes = {
  label: PropTypes.string.isRequired,
  className: PropTypes.string,
}

const defaultProps = {
  className: '',
}

ActivePin.propTypes = propTypes
ActivePin.defaultProps = defaultProps

WarningPin.propTypes = propTypes
WarningPin.defaultProps = defaultProps

InactivePin.propTypes = propTypes
InactivePin.defaultProps = defaultProps

CustomPin.propTypes = propTypes
CustomPin.defaultProps = defaultProps

export {
  ActivePin,
  InactivePin,
  WarningPin,
  CustomPin,
}
