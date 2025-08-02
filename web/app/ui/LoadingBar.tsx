import cx from 'clsx'
import React from 'react'

interface LoadingBarProps {
  className?: string
}

const LoadingBar: React.FC<LoadingBarProps> = ({ className }) => {
  return (
    <div className={cx('fixed top-0 right-0 left-0 z-50 h-0.5 w-full overflow-hidden', className)}>
      <div
        className='absolute h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 opacity-90 shadow-sm'
        style={{
          animation: 'indeterminate1 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite',
        }}
      />

      <div
        className='absolute h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 opacity-75 shadow-sm'
        style={{
          animation: 'indeterminate2 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) infinite',
          animationDelay: '1.15s',
        }}
      />
    </div>
  )
}

export default LoadingBar
