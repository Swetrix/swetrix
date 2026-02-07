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
          'flex h-5 overflow-hidden rounded-sm bg-gray-200 text-xs dark:bg-slate-900',
          className,
        )}
      >
        {_map(progress, ({ value, lightColour, darkColour }) => (
          <div
            key={`${value}-${lightColour}-${darkColour}`}
            style={{
              width: `${value}%`,
              backgroundColor: theme === 'dark' ? darkColour : lightColour,
            }}
            className='flex flex-col justify-center text-center whitespace-nowrap text-white shadow-none'
          />
        ))}
      </div>
    </div>
  )
}

export default memo(MultiProgress)
