import { ExternalLinkIcon, LinkIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { getFaviconHost } from '~/utils/referrers'

const RefRow = ({ rowName }: { rowName: string | null }) => {
  const { t } = useTranslation('common')

  const { isUrl, faviconHost, displayRowName } = useMemo(() => {
    if (!rowName)
      return {
        isUrl: false,
        faviconHost: null as string | null,
        displayRowName: '',
      }
    let isUrl = false
    try {
      new URL(rowName)
      isUrl = true
    } catch {
      isUrl = false
    }

    const displayRowName = rowName
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')

    return { isUrl, faviconHost: getFaviconHost(rowName), displayRowName }
  }, [rowName])

  if (rowName === null) {
    return (
      <div className='scrollbar-thin hover-always-overflow flex items-center'>
        <LinkIcon className='float-left mr-1.5 size-5' strokeWidth={1.5} />
        <span className='italic'>{t('project.directNone')}</span>
      </div>
    )
  }

  return (
    <div className='scrollbar-thin hover-always-overflow flex min-w-0 items-center'>
      {faviconHost ? (
        <img
          className='float-left mr-1.5 size-5'
          src={`https://icons.duckduckgo.com/ip3/${faviconHost}.ico`}
          loading='lazy'
          alt=''
          aria-hidden='true'
        />
      ) : null}
      <span className='truncate text-sm text-gray-900 dark:text-gray-100'>
        {displayRowName}
      </span>
      {isUrl ? (
        <a
          href={rowName}
          target='_blank'
          rel='noopener noreferrer nofollow'
          onClick={(e) => e.stopPropagation()}
          aria-label={`${rowName} (opens in a new tab)`}
          className='ml-1 shrink-0 rounded-md p-1 text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-700'
        >
          <ExternalLinkIcon
            className='size-3.5 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100'
            strokeWidth={2}
          />
        </a>
      ) : null}
    </div>
  )
}

export default RefRow
