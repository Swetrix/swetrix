import React, { memo } from 'react'
import PropTypes from 'prop-types'
import { QuestionMarkCircleIcon } from '@heroicons/react/solid'
import cx from 'clsx'

const Tooltip = ({ text, className }) => (
  <div class={cx('w-5 h-5 relative flex flex-col items-center group', className)}>
    <QuestionMarkCircleIcon className='w-5 h-5 text-gray-700  dark:text-gray-300' />
    <div class='absolute bottom-0 flex-col items-center hidden mb-6 group-hover:flex'>
      <span class='opacity-95 relative w-60 z-10 p-2 text-xs leading-none text-white whitespace-no-wrap bg-gray-700 shadow-lg rounded-md'>
        {text}
      </span>
      <div class='w-3 h-3 -mt-2 rotate-45 bg-gray-700 opacity-95'></div>
    </div>
  </div>
)

Tooltip.propTypes = {
  text: PropTypes.oneOfType([
    PropTypes.string, PropTypes.number, PropTypes.node,
  ]).isRequired,
  className: PropTypes.string,
}

Tooltip.defaultProps = {
  className: '',
}

export default memo(Tooltip)
