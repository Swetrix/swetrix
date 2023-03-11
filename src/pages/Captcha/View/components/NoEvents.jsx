import React, {
  memo, useEffect, useState, useRef,
} from 'react'
import { useTranslation, Trans } from 'react-i18next'
import Prism from 'prismjs'
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import _isEmpty from 'lodash/isEmpty'
import PropTypes from 'prop-types'

import Code from 'ui/Code'
import Button from 'ui/Button'
import { getUMDBuildExample } from 'pages/Docs/examples'
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
  filters, resetFilters, pid,
}) => {
  const { t } = useTranslation('common')
  const [copied, setCopied] = useState(false)
  const umdBuildExample = getUMDBuildExample(pid)

  const copyTimerRef = useRef(null)

  const setToClipboard = (value) => {
    if (!copied) {
      navigator.clipboard.writeText(value)
      setCopied(true)
      copyTimerRef.current = setTimeout(() => {
        setCopied(false)
      }, 2000)
    }
  }

  useEffect(() => {
    Prism.highlightAll()

    return () => {
      clearTimeout(copyTimerRef.current)
    }
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
        {_isEmpty(filters) && (
          <>
            <hr className='mt-3 mb-2 border-gray-200 dark:border-gray-600' />
            <h2 className='text-2xl mb-2 text-center leading-snug'>
              {t('project.codeExample')}
            </h2>
            <div className='relative'>
              <Code text={umdBuildExample} language='html' />
              <div className='absolute top-3 right-5'>
                <Button
                  type='button'
                  onClick={() => setToClipboard(umdBuildExample)}
                  className='opacity-80 hover:opacity-100'
                  noBorder
                >
                  <ClipboardDocumentIcon className='w-6 h-6 text-gray-100' />
                  {copied && (
                    <div className='animate-appear cursor-auto rounded p-1 absolute sm:top-0 top-0.5 right-8 text-xs text-green-500'>
                      {t('common.copied')}
                    </div>
                  )}
                </Button>
              </div>
            </div>
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
