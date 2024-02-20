import React, { memo } from 'react'
import _isEmpty from 'lodash/isEmpty'
import PropTypes from 'prop-types'

/**
 * Component that renders a link row in the 'Referrer' panel.
 *
 * @param {string} rowName - A link itself (e.g. https://google.com) to render in the row.
 * @returns {JSX.Element}
 */
const RefRow = ({ rowName }: { rowName: string }): JSX.Element => {
  let isUrl: boolean = true
  let url: URL | null = null

  try {
    url = new URL(rowName) as URL
  } catch {
    isUrl = false
  }

  return (
    <div className='overflow-auto'>
      {isUrl && !_isEmpty(url?.hostname) && (
        <img
          className='w-5 h-5 mr-1.5 float-left'
          src={`https://icons.duckduckgo.com/ip3/${url?.hostname}.ico`}
          alt=''
          aria-hidden='true'
        />
      )}
      {isUrl ? (
        <a
          className='flex label hover:underline text-blue-600 dark:text-blue-500'
          href={rowName}
          target='_blank'
          rel='noopener noreferrer nofollow'
          onClick={(e) => e.stopPropagation()}
          aria-label={`${rowName} (opens in a new tab)`}
        >
          {rowName}
        </a>
      ) : (
        <span className='flex label hover:underline text-blue-600 dark:text-blue-500'>{rowName}</span>
      )}
    </div>
  )
}

RefRow.propTypes = {
  rowName: PropTypes.string.isRequired,
}

export default memo(RefRow)
