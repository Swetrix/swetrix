import cx from 'clsx'
import React from 'react'

interface LoadingBarProps {
  className?: string
}

const LoadingBar: React.FC<LoadingBarProps> = ({ className }) => {
  return (
    <div
      className={cx('relative h-1 w-full overflow-hidden rounded-full bg-gray-200/60 dark:bg-gray-700/60', className)}
    >
      {/* First indeterminate bar */}
      <div
        className='absolute h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 opacity-90 shadow-sm'
        style={{
          animation: 'indeterminate1 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite',
        }}
      />

      {/* Second indeterminate bar */}
      <div
        className='absolute h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 opacity-75 shadow-sm'
        style={{
          animation: 'indeterminate2 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) infinite',
          animationDelay: '1.15s',
        }}
      />

      {/* Subtle glow effect */}
      <div
        className='absolute h-full rounded-full bg-gradient-to-r from-indigo-400/30 via-indigo-500/40 to-indigo-600/30 blur-sm'
        style={{
          animation: 'indeterminate1 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite',
          transform: 'scaleY(1.5)',
        }}
      />
    </div>
  )
}

export default LoadingBar
