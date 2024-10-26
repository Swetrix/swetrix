import { memo, useMemo } from 'react'

const RefRow = ({ rowName }: { rowName: string }): JSX.Element => {
  const { isUrl, url } = useMemo(() => {
    try {
      const urlObj = new URL(rowName)
      return { isUrl: true, url: urlObj }
    } catch {
      return { isUrl: false, url: null }
    }
  }, [rowName])

  const linkClassName = 'text-blue-600 hover:underline dark:text-blue-500'

  return (
    <div className='scrollbar-thin overflow-hidden hover-always:overflow-auto'>
      {isUrl && (
        <img
          className='float-left mr-1.5 size-5'
          src={`https://icons.duckduckgo.com/ip3/${url?.hostname}.ico`}
          loading='lazy'
          alt=''
          aria-hidden='true'
        />
      )}
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
        <span className={linkClassName}>{rowName}</span>
      )}
    </div>
  )
}

export default memo(RefRow)
