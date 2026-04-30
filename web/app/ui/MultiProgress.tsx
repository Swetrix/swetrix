import cx from 'clsx'
import _map from 'lodash/map'
import { memo } from 'react'

import { useTheme } from '~/providers/ThemeProvider'

interface Progress {
  value: number
  lightColour: string
  darkColour: string
}

interface MultiProgressProps {
  progress: Progress[]
  className?: string
}

const MultiProgress = ({ progress, className }: MultiProgressProps) => {
  const { theme } = useTheme()

  return (
    <div className='relative'>
      <div
        className={cx(
          'flex h-2.5 overflow-hidden rounded-full bg-gray-200 ring-1 ring-gray-200/40 ring-inset dark:bg-slate-800 dark:ring-slate-700/30',
          className,
        )}
        role='progressbar'
      >
        {_map(progress, ({ value, lightColour, darkColour }) => (
          <div
            key={`${value}-${lightColour}-${darkColour}`}
            style={{
              width: `${value}%`,
              backgroundColor: theme === 'dark' ? darkColour : lightColour,
            }}
            className='h-full transition-[width] duration-300 ease-out'
          />
        ))}
      </div>
    </div>
  )
}

export default memo(MultiProgress)
