import cx from 'clsx'
import { useEffect, useRef, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import Spin from '~/ui/icons/Spin'

interface InfiniteScrollTriggerProps {
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
  className?: string
  disabled?: boolean
  root?: RefObject<Element | null>
  rootMargin?: string
}

const InfiniteScrollTrigger = ({
  hasMore,
  isLoading,
  onLoadMore,
  className,
  disabled = false,
  root,
  rootMargin = '240px',
}: InfiniteScrollTriggerProps) => {
  const { t } = useTranslation('common')
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const pendingRef = useRef(false)

  useEffect(() => {
    if (!isLoading) {
      pendingRef.current = false
    }
  }, [isLoading])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || disabled) {
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoading && !pendingRef.current) {
          pendingRef.current = true
          onLoadMore()
        }
      },
      {
        root: root?.current || null,
        rootMargin,
      },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [disabled, hasMore, isLoading, onLoadMore, root, rootMargin])

  if (!hasMore) {
    return null
  }

  return (
    <div
      ref={sentinelRef}
      role={isLoading ? 'status' : undefined}
      aria-live={isLoading ? 'polite' : undefined}
      className={cx(
        'flex min-h-10 items-center justify-center py-3',
        className,
      )}
    >
      <Spin
        className={cx(
          'size-5 text-gray-400 transition-opacity duration-150 ease-out dark:text-gray-500',
          !isLoading && 'opacity-0',
        )}
      />
      <span className='sr-only'>
        {isLoading ? t('common.loading') : t('project.loadMore')}
      </span>
    </div>
  )
}

export default InfiniteScrollTrigger
