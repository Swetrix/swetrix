import React, { memo } from 'react'
import cx from 'clsx'
import _map from 'lodash/map'

interface Progress {
  value: number
  lightColour: string
  darkColour: string
}

interface MultiProgressProps {
  progress: Progress[]
  theme: 'dark' | 'light'
  className?: string
}

const MultiProgress = ({ progress, theme, className }: MultiProgressProps) => (
  <div className='relative'>
    <div className={cx('flex h-5 overflow-hidden rounded bg-gray-200 text-xs dark:bg-slate-600', className)}>
      {_map(progress, ({ value, lightColour, darkColour }) => (
        <div
          key={`${value}-${lightColour}-${darkColour}`}
          style={{
            width: `${value}%`,
            backgroundColor: theme === 'dark' ? darkColour : lightColour,
          }}
          className='flex flex-col justify-center whitespace-nowrap text-center text-white shadow-none'
        />
      ))}
    </div>
  </div>
)

export default memo(MultiProgress)
