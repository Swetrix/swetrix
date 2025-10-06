import cx from 'clsx'

const types = {
  small: {
    pulse: 'size-2.5',
    base: 'size-2',
  },
  big: {
    pulse: 'size-3',
    base: 'size-2.5',
  },
  giant: {
    pulse: 'size-6',
    base: 'size-5',
  },
}

interface PulsatingCircleProps {
  className?: string
  type: 'small' | 'big' | 'giant'
}

const PulsatingCircle = ({ className, type = 'small' }: PulsatingCircleProps) => (
  <span className={cx('flex items-center justify-center', types[type]?.pulse, className)}>
    <span className={cx('animate-ping-slow absolute inline-flex rounded-full bg-green-400', types[type]?.pulse)} />
    <span className={cx('relative inline-flex rounded-full bg-green-500', types[type]?.base)} />
  </span>
)

export default PulsatingCircle
