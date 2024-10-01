import React, { memo } from 'react'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/solid'
import cx from 'clsx'

interface ITooltip {
  text: string | number | React.ReactNode
  className?: string
  tooltipNode?: JSX.Element
}

const Tooltip = ({ text, className, tooltipNode }: ITooltip): JSX.Element => (
  <div className={cx('group relative flex flex-col items-center', className)} data-testid='tooltip-wrapper'>
    {tooltipNode || (
      <QuestionMarkCircleIcon className='h-5 w-5 text-gray-700 dark:text-gray-300' data-testid='tooltip-icon' />
    )}
    <div className='absolute bottom-0 mb-6 hidden flex-col items-center group-hover:flex'>
      <span className='whitespace-no-wrap relative z-10 w-60 rounded-md bg-gray-700 p-2 text-xs leading-none text-white opacity-95 shadow-lg'>
        {text}
      </span>
      <div className='-mt-2 h-3 w-3 rotate-45 bg-gray-700 opacity-95' />
    </div>
  </div>
)

export default memo(Tooltip)
