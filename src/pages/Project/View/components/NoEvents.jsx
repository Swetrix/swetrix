import React, { memo, useEffect } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { Link } from 'react-router-dom'
import Prism from 'prismjs'
import _isEmpty from 'lodash/isEmpty'
import PropTypes from 'prop-types'

import Code from 'ui/Code'
import Button from 'ui/Button'
import { getUMDBuildExample } from 'pages/Docs/examples'
import routes from 'routes'

/**
 * This component is used to display text if the data is not available.
 *
 * @param {array} filters - Active filters.
 * @param {function} resetFilters - Callback to reset all filters.
 * @param {string} pid - Project ID.
 * @returns {JSX.Element}
 */
const NoEvents = ({
  filters, resetFilters, pid,
}) => {
  const { t } = useTranslation('common')
  const umdBuildExample = getUMDBuildExample(pid)

  useEffect(() => {
    Prism.highlightAll()
  }, [])

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
              url: <Link to={routes.docs} className='hover:underline text-blue-600' />,
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
        {_isEmpty(filters) && (
          <>
            <hr className='mt-3 mb-2 border-gray-200 dark:border-gray-600' />
            <h2 className='text-2xl mb-2 text-center leading-snug'>
              {t('project.codeExample')}
            </h2>
            <Code text={umdBuildExample} language='html' />
          </>
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
  pid: PropTypes.string.isRequired,
}

NoEvents.defaultProps = {
  filters: [],
}

export default memo(NoEvents)
