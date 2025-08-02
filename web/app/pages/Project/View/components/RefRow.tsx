import { LinkIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

const RefRow = ({ rowName }: { rowName: string }) => {
  const { t } = useTranslation('common')

  const { isUrl, url } = useMemo(() => {
    try {
      const urlObj = new URL(rowName)
      return { isUrl: true, url: urlObj }
    } catch {
      return { isUrl: false, url: null }
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
      {isUrl ? (
        <img
          className='float-left mr-1.5 size-5'
          src={`https://icons.duckduckgo.com/ip3/${url?.hostname}.ico`}
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
