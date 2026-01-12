import { useTranslation, Trans } from 'react-i18next'

import { API_URL, isSelfhosted } from '~/lib/constants'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { Badge } from '~/ui/Badge'
import Modal from '~/ui/Modal'
import Textarea from '~/ui/Textarea'

const API_URL_WITHOUT_TRAILING_SLASH = API_URL.endsWith('/')
  ? API_URL.slice(0, -1)
  : API_URL

interface TrackingSnippetProps {
  onClose: () => void
  isOpened: boolean
}

export const getSnippet = (pid: string) => {
  if (isSelfhosted) {
    return `<script src="https://swetrix.org/swetrix.js" defer></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    swetrix.init('${pid}', {
      apiURL: '${API_URL_WITHOUT_TRAILING_SLASH}/log',
    })
    swetrix.trackViews()
  })
</script>

<noscript>
  <img
    src="${API_URL_WITHOUT_TRAILING_SLASH}/log/noscript?pid=${pid}"
    alt=""
    referrerpolicy="no-referrer-when-downgrade"
  />
</noscript>`
  }

  return `<script src="https://swetrix.org/swetrix.js" defer></script>
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
}

const SCRIPT_DOCS_URL = 'https://docs.swetrix.com/install-script'

const TrackingSnippet = ({ onClose, isOpened }: TrackingSnippetProps) => {
  const { id } = useCurrentProject()
  const { t } = useTranslation('common')

  const snippet = getSnippet(id)

  return (
    <Modal
      onClose={onClose}
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
          <Textarea
            classes={{
              container: 'mt-2 font-mono',
            }}
            value={snippet}
            rows={17}
            readOnly
          />
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

export default TrackingSnippet
