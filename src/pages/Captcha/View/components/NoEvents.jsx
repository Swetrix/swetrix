import React, {
  memo,
} from 'react'
import { useTranslation, Trans } from 'react-i18next'
import _isEmpty from 'lodash/isEmpty'
import PropTypes from 'prop-types'

import Button from 'ui/Button'
import { DOCS_URL } from 'redux/constants'

/**
 * This component is used to display text if the data is not available.
 *
 * @param {array} filters - Active filters.
 * @param {function} resetFilters - Callback to reset all filters.
 * @param {string} pid - Project ID.
 * @returns {JSX.Element}
 */
const NoEvents = ({
  filters, resetFilters,
}) => {
  const { t } = useTranslation('common')

  return (
    <div className='flex flex-col py-6 sm:px-6 lg:px-8 mt-5'>
      <div className='max-w-7xl w-full mx-auto text-gray-900 dark:text-gray-50'>
        <h2 className='text-4xl text-center leading-tight my-3'>
          {t('project.noEvTitle')}
        </h2>
        <h2 className='text-2xl mb-8 text-center leading-snug'>
          <Trans
            t={t}
            i18nKey='project.noEvContent'
            components={{
              // eslint-disable-next-line jsx-a11y/anchor-has-content
              url: <a href={DOCS_URL} className='hover:underline text-blue-600' target='_blank' rel='noreferrer noopener' />,
            }}
          />
        </h2>
        {!_isEmpty(filters) && (
          <div className='!flex !mx-auto'>
            <Button
              onClick={resetFilters}
              className='!flex !mx-auto'
              primary
              giant
            >
              {t('project.resetFilters')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

NoEvents.propTypes = {
  filters: PropTypes.arrayOf(PropTypes.shape({
    column: PropTypes.string,
    filter: PropTypes.string,
    isExclusive: PropTypes.bool,
  })),
  resetFilters: PropTypes.func.isRequired,
}

NoEvents.defaultProps = {
  filters: [],
}

export default memo(NoEvents)
