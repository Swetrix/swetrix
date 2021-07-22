import React from 'react'
import cx from 'classnames'
import PropTypes from 'prop-types'

const propTypes = {
  label: PropTypes.string.isRequired,
  className: PropTypes.string,
}

const defaultProps = {
  label: PropTypes.string.isRequired,
  className: '',
}

const ActivePin = ({ label, className }) => (
  <p className={cx('px-2 inline-flex text-sm leading-5 font-normal rounded-full bg-green-100 text-green-800', className)}>
    {label}
  </p>
)

const InactivePin = ({ label, className }) => (
  <p className={cx('px-2 inline-flex text-sm leading-5 font-normal rounded-full bg-red-100 text-red-800', className)}>
    {label}
  </p>
)

const WarningPin = ({ label, className }) => (
  <p className={cx('px-2 inline-flex text-sm leading-5 font-normal rounded-full bg-yellow-100 text-yellow-600', className)}>
    {label}
  </p>
)

ActivePin.propTypes = propTypes
ActivePin.defaultProps = defaultProps

WarningPin.propTypes = propTypes
WarningPin.defaultProps = defaultProps

InactivePin.propTypes = propTypes
InactivePin.defaultProps = defaultProps

export {
  ActivePin,
  InactivePin,
  WarningPin,
}
