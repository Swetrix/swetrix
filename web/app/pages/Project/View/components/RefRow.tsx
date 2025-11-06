import { LinkIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { REFERRER_MAP, extractHostname } from '~/utils/referrers'

const RefRow = ({ rowName }: { rowName: string }) => {
  const { t } = useTranslation('common')

  const { isUrl, faviconHost } = useMemo(() => {
    // Try parse as URL
    try {
      const urlObj = new URL(rowName as string)
      return { isUrl: true, faviconHost: urlObj.hostname }
    } catch {
      // Not a full URL. Try to resolve a hostname for grouped names/domains
      const hostFromValue = extractHostname(rowName as string)
      if (hostFromValue) {
        return { isUrl: false, faviconHost: hostFromValue }
      }

      // Try map canonical name → representative domain (first literal domain pattern)
      const mapping = REFERRER_MAP.find((m) => (rowName || '').toLowerCase() === m.name.toLowerCase())
      if (mapping) {
        const literal =
          mapping.patterns.find((p) => !['[', ']', '{', '}', '*'].some((c) => p.includes(c))) || mapping.patterns[0]
        const safe = literal.replace(/\[[^\]]+\]/g, 'com') // e.g., google.[a-z]{2,3} -> google.com
        return { isUrl: false, faviconHost: safe }
      }

      return { isUrl: false, faviconHost: null as any }
    }
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
