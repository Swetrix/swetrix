import React from 'react'
import { useTranslation, Trans } from 'react-i18next'
import PropTypes from 'prop-types'

import Modal from 'ui/Modal'
import { Badge } from 'ui/Badge'
import Textarea from 'ui/Textarea'

interface ITrackingSnippet {
  onClose: () => void
  isOpened: boolean
  pid: string
}

const getSnippet = (pid: string) => `<script src="https://swetrix.org/swetrix.js" defer></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    swetrix.init('${pid}')
    swetrix.trackViews()
  })
</script>

<noscript>
  <img
    src="https://api.swetrix.com/log/noscript?pid=${pid}"
    alt=""
    referrerpolicy="no-referrer-when-downgrade"
  />
</noscript>`

const SCRIPT_DOCS_URL = 'https://docs.swetrix.com/install-script'

const TrackingSnippet = ({ onClose, isOpened, pid }: ITrackingSnippet): JSX.Element => {
  const { t } = useTranslation('common')

  const snippet = getSnippet(pid)

  return (
    <Modal
      onClose={onClose}
      closeText={t('common.close')}
      message={
        <div>
          <p>
            <Trans
              t={t}
              i18nKey='modals.trackingSnippet.add'
              components={{
                bsect: <Badge label='<body>' colour='slate' />,
              }}
            />
          </p>
          <Textarea className='mt-2' value={snippet} rows={17} readOnly />
          <p className='mt-4'>
            <Trans
              t={t}
              i18nKey='modals.trackingSnippet.docs'
              components={{
                pdocs: (
                  <a
                    href={SCRIPT_DOCS_URL}
                    className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                    target='_blank'
                    rel='noreferrer noopener'
                  />
                ),
              }}
            />
          </p>
        </div>
      }
      title={t('modals.trackingSnippet.title')}
      isOpened={isOpened}
    />
  )
}

TrackingSnippet.propTypes = {
  onClose: PropTypes.func.isRequired,
  isOpened: PropTypes.bool.isRequired,
}

export default TrackingSnippet
