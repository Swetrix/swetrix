import { ArrowClockwiseIcon } from '@phosphor-icons/react'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '~/providers/AuthProvider'
import { cn } from '~/utils/generic'

import { useViewProjectContext } from '../ViewProject'

const AUTO_REFRESH_INTERVAL_SECONDS = 30
const REFRESH_INTERVAL_MS = AUTO_REFRESH_INTERVAL_SECONDS * 1000

interface RefreshStatsButtonProps {
  onRefresh: (isManual: boolean) => Promise<void>
}

export const RefreshStatsButton = ({ onRefresh }: RefreshStatsButtonProps) => {
  const { isLoading: authLoading } = useAuth()
  const { dataLoading } = useViewProjectContext()
  const { t } = useTranslation('common')
  const [progress, setProgress] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  // eslint-disable-next-line react-hooks/purity -- Initial timestamp is intentionally set once
  const startTimeRef = useRef(Date.now())
  const hasTriggeredRefresh = useRef(false)

  useEffect(() => {
    let animationFrameId: number
    let lastRenderedProgress = 0

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current
      const newProgress = Math.min((elapsed / REFRESH_INTERVAL_MS) * 100, 100)

      // Only update state if progress changed by at least 1% (reduces re-renders)
      if (
        Math.abs(newProgress - lastRenderedProgress) >= 1 ||
        newProgress >= 100
      ) {
        lastRenderedProgress = newProgress
        setProgress(newProgress)
      }

      // Check if we should trigger auto-refresh
      if (
        newProgress >= 100 &&
        !hasTriggeredRefresh.current &&
        !isRefreshing &&
        !authLoading &&
        !dataLoading
      ) {
        hasTriggeredRefresh.current = true
        ;(async () => {
          setIsRefreshing(true)
          await onRefresh(false)
          setIsRefreshing(false)
          // Reset timer after refresh completes
          startTimeRef.current = Date.now()
          hasTriggeredRefresh.current = false
          setProgress(0)
        })()
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animationFrameId)
  }, [onRefresh, isRefreshing, authLoading, dataLoading])

  const handleManualRefresh = async () => {
    if (authLoading || dataLoading || isRefreshing) return
    setIsRefreshing(true)
    startTimeRef.current = Date.now()
    hasTriggeredRefresh.current = false
    setProgress(0)
    await onRefresh(true)
    setIsRefreshing(false)
  }

  const remainingSeconds = Math.max(
    1,
    Math.ceil(AUTO_REFRESH_INTERVAL_SECONDS * (1 - progress / 100)),
  )
  const showSpinner = isRefreshing || dataLoading

  return (
    <button
      type='button'
      title={t('project.refreshStats')}
      onClick={handleManualRefresh}
      className={cn(
        'group relative rounded-md border border-transparent p-2 transition-all ring-inset hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-slate-900 focus:outline-hidden hover:dark:border-slate-700/80 dark:hover:bg-slate-900 dark:focus:ring-slate-300',
        {
          'cursor-not-allowed opacity-50': authLoading,
        },
      )}
    >
      <div className='relative h-5 w-5'>
        <ArrowClockwiseIcon
          className={cn(
            'absolute inset-0 h-5 w-5 text-gray-400/80 dark:text-slate-600',
            {
              'animate-spin': showSpinner,
            },
          )}
        />
        {!showSpinner ? (
          <div
            className='absolute inset-0'
            style={{
              maskImage: `conic-gradient(from 100deg, black ${progress}%, transparent ${progress}%)`,
              WebkitMaskImage: `conic-gradient(from 100deg, black ${progress}%, transparent ${progress}%)`,
            }}
          >
            <ArrowClockwiseIcon className='h-5 w-5 text-gray-700 dark:text-gray-50' />
          </div>
        ) : null}
        {showSpinner ? (
          <ArrowClockwiseIcon className='absolute inset-0 h-5 w-5 animate-spin text-gray-700 dark:text-gray-50' />
        ) : null}
      </div>
      <div className='pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-slate-700'>
        {showSpinner
          ? t('project.refreshing')
          : t('project.refreshingIn', { seconds: remainingSeconds })}
        <div className='absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-slate-700' />
      </div>
    </button>
  )
}
