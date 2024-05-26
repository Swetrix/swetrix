import React from 'react'
import cx from 'clsx'

const types = {
  small: {
    pulse: 'h-2.5 w-2.5',
    base: 'h-2 w-2',
  },
  big: {
    pulse: 'h-3 w-3',
    base: 'h-2.5 w-2.5',
  },
  giant: {
    pulse: 'h-12 sm:h-20 w-12 sm:w-20',
    base: 'h-10 sm:h-16 w-10 sm:w-16',
  },
}

interface IPulsatingCircle {
  className?: string
  type: 'small' | 'big' | 'giant'
}

const PulsatingCircle = ({ className, type = 'small' }: IPulsatingCircle): JSX.Element => (
  <span className={cx('flex justify-center items-center', types[type]?.pulse, className)}>
    <span className={cx('animate-ping-slow absolute inline-flex rounded-full bg-green-400', types[type]?.pulse)} />
    <span className={cx('relative inline-flex rounded-full bg-green-500', types[type]?.base)} />
  </span>
)

export default PulsatingCircle
