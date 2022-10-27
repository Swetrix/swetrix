import React, { memo } from 'react'
import _truncate from 'lodash/truncate'
import _map from 'lodash/map'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

import countries from 'utils/isoCountries'

/**
 * This component is used for showing the filter in panel
 * @returns {JSX.Element}
 */
const Filter = ({
  column, filter, isExclusive, onRemoveFilter, onChangeExclusive, tnMapping, language, t,
}) => {
  const displayColumn = tnMapping[column]
  let displayFilter = filter

  if (column === 'cc') {
    displayFilter = countries.getName(filter, language)
  }

  displayFilter = _truncate(displayFilter)

  return (
    <span className='inline-flex rounded-md items-center py-0.5 pl-2.5 pr-1 mr-2 mt-2 text-sm font-medium bg-gray-200 text-gray-800 dark:text-gray-50 dark:bg-gray-700'>
      {displayColumn}
      &nbsp;
      <span className='text-blue-400 border-blue-400 border-b-2 border-dotted cursor-pointer' onClick={() => onChangeExclusive(column, filter, !isExclusive)}>
        {t(`common.${isExclusive ? 'isNot' : 'is'}`)}
      </span>
      &nbsp;
      &quot;
      {displayFilter}
      &quot;
      <button
        onClick={() => onRemoveFilter(column, filter)}
        type='button'
        className='flex-shrink-0 ml-0.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-gray-800 hover:text-gray-900 hover:bg-gray-300 focus:bg-gray-300 focus:text-gray-900 dark:text-gray-50 dark:bg-gray-700 dark:hover:text-gray-300 dark:hover:bg-gray-800 dark:focus:bg-gray-800 dark:focus:text-gray-300 focus:outline-none '
      >
        <span className='sr-only'>Remove filter</span>
        <svg className='h-2 w-2' stroke='currentColor' fill='none' viewBox='0 0 8 8'>
          <path strokeLinecap='round' strokeWidth='1.5' d='M1 1l6 6m0-6L1 7' />
        </svg>
      </button>
    </span>
  )
}

/**
 * This component is used for rendering the filter panel.
 *
 * @param {array} filters - Active filters.
 * @param {function} onRemoveFilter - Callback to remove a filter.
 * @param {function} onChangeExclusive - Callback to change the exclusive status of a filter.
 * @param {object} tnMapping - Mapping of column names to translated names.
 * @returns {JSX.Element}
 */
const Filters = ({
  filters, onRemoveFilter, onChangeExclusive, tnMapping,
}) => {
  const { t, i18n: { language } } = useTranslation('common')

  return (
    <div className='flex justify-center md:justify-start flex-wrap -mt-2'>
      {_map(filters, (props) => {
        const { column, filter } = props
        const key = `${column}${filter}`

        return (
          <Filter key={key} onRemoveFilter={onRemoveFilter} onChangeExclusive={onChangeExclusive} language={language} t={t} tnMapping={tnMapping} {...props} />
        )
      })}
    </div>
  )
}

Filters.propTypes = {
  filters: PropTypes.arrayOf(PropTypes.shape({
    column: PropTypes.string,
    filter: PropTypes.string,
    isExclusive: PropTypes.bool,
  })),
  onRemoveFilter: PropTypes.func.isRequired,
  onChangeExclusive: PropTypes.func.isRequired,
  tnMapping: PropTypes.objectOf(PropTypes.string).isRequired,
}

Filters.defaultProps = {
  filters: [],
}

export default memo(Filters)
