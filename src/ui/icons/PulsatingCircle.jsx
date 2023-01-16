import React from 'react'
import cx from 'clsx'
import PropTypes from 'prop-types'

const types = {
  small: {
    pulse: 'h-2.5 w-2.5',
    base: 'h-2 w-2',
  },
  big: {
    pulse: 'h-3 w-3',
    base: 'h-2.5 w-2.5',
  },
}

const PulsatingCircle = ({ className, type }) => (
  <span className={cx('flex justify-center items-center', types[type]?.pulse, className)}>
    <span className={cx('animate-ping-slow absolute inline-flex rounded-full bg-green-400', types[type]?.pulse)} />
    <span className={cx('relative inline-flex rounded-full bg-green-500', types[type]?.base)} />
  </span>
)

PulsatingCircle.propTypes = {
  className: PropTypes.string,
  type: PropTypes.oneOf(['small', 'big']),
}

PulsatingCircle.defaultProps = {
  className: '',
  type: 'small',
}

export default PulsatingCircle
