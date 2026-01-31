import { ArrowSquareOutIcon } from '@phosphor-icons/react'
import { useMemo } from 'react'

interface PageLinkRowProps {
  pagePath: string | null
  websiteUrl?: string | null
}

/**
 * Renders a page path with an optional clickable link icon if websiteUrl is provided.
 * When hovered, shows an external link icon that opens the full page URL.
 */
const PageLinkRow = ({ pagePath, websiteUrl }: PageLinkRowProps) => {
  const fullUrl = useMemo(() => {
    if (!pagePath || !websiteUrl) return null

    try {
      const baseUrl = new URL(websiteUrl)
      // Construct full URL from base URL and page path
      const fullUrl = new URL(pagePath, baseUrl.origin)
      return fullUrl.toString()
    } catch {
      return null
    }
  }, [pagePath, websiteUrl])

  if (pagePath === null) {
    return null
  }

  return (
    <div className='scrollbar-thin hover-always-overflow flex min-w-0 items-center'>
      <span className='truncate text-sm text-gray-900 dark:text-gray-100'>
        {pagePath}
      </span>
      {fullUrl ? (
        <a
          href={fullUrl}
          target='_blank'
          rel='noopener noreferrer nofollow'
          onClick={(e) => e.stopPropagation()}
          aria-label={`Open ${pagePath} (opens in a new tab)`}
          className='ml-1 shrink-0 rounded-md p-1 text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-700'
        >
          <ArrowSquareOutIcon
            className='size-3.5 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100'
            strokeWidth={2}
          />
        </a>
      ) : null}
    </div>
  )
}

export default PageLinkRow
