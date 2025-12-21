import { LinkIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { getFaviconHost } from '~/utils/referrers'

const RefRow = ({ rowName }: { rowName: string | null }) => {
  const { t } = useTranslation('common')

  const { isUrl, faviconHost } = useMemo(() => {
    if (!rowName) return { isUrl: false, faviconHost: null as string | null }
    let isUrl = false
    try {
      // If it parses, we treat it as a URL for linking
      // Favicon host will be derived by the util anyway
      // from either the URL, a hostname string or a mapped group name
      new URL(rowName)
      isUrl = true
    } catch {
      isUrl = false
    }
    return { isUrl, faviconHost: getFaviconHost(rowName) }
  }, [rowName])

  const linkClassName = 'text-blue-600 hover:underline dark:text-blue-500'

  if (rowName === null) {
    return (
      <div className='scrollbar-thin hover-always-overflow flex items-center'>
        <LinkIcon className='float-left mr-1.5 size-5' strokeWidth={1.5} />
        <span className='italic'>{t('project.directNone')}</span>
      </div>
    )
  }

  return (
    <div className='scrollbar-thin hover-always-overflow flex items-center'>
      {faviconHost ? (
        <img
          className='float-left mr-1.5 size-5'
          src={`https://icons.duckduckgo.com/ip3/${faviconHost}.ico`}
          loading='lazy'
          alt=''
          aria-hidden='true'
        />
      ) : null}
      {isUrl ? (
        <a
          className={linkClassName}
          href={rowName}
          target='_blank'
          rel='noopener noreferrer nofollow'
          onClick={(e) => e.stopPropagation()}
          aria-label={`${rowName} (opens in a new tab)`}
        >
          {rowName}
        </a>
      ) : (
        <span>{rowName}</span>
      )}
    </div>
  )
}

export default RefRow
