import { ArrowClockwiseIcon } from '@phosphor-icons/react'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '~/providers/AuthProvider'
import Button from '~/ui/Button'
import Tooltip from '~/ui/Tooltip'
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
          try {
            await onRefresh(false)
          } catch (error) {
            console.error('Auto refresh failed', error)
          } finally {
            setIsRefreshing(false)
            startTimeRef.current = Date.now()
            hasTriggeredRefresh.current = false
            setProgress(0)
          }
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
    try {
      await onRefresh(true)
    } finally {
      setIsRefreshing(false)
    }
  }

  const remainingSeconds = Math.max(
    1,
    Math.ceil(AUTO_REFRESH_INTERVAL_SECONDS * (1 - progress / 100)),
  )
  const showSpinner = isRefreshing || dataLoading

  const tooltipText = showSpinner
    ? t('project.refreshing')
    : t('project.refreshingIn', { seconds: remainingSeconds })

  return (
    <Tooltip
      text={tooltipText}
      ariaLabel={t('project.refreshStats')}
      asChild
      tooltipNode={
        <Button
          variant='icon'
          onClick={handleManualRefresh}
          aria-label={t('project.refreshStats')}
          disabled={authLoading || dataLoading || isRefreshing}
        >
          <span className='relative size-5'>
            <ArrowClockwiseIcon
              className={cn(
                'absolute inset-0 size-5 text-gray-400/80 dark:text-slate-600',
                {
                  'animate-spin': showSpinner,
                },
              )}
            />
            {!showSpinner ? (
              <span
                className='absolute inset-0'
                style={{
                  maskImage: `conic-gradient(from 100deg, black ${progress}%, transparent ${progress}%)`,
                  WebkitMaskImage: `conic-gradient(from 100deg, black ${progress}%, transparent ${progress}%)`,
                }}
              >
                <ArrowClockwiseIcon className='size-5 text-gray-700 dark:text-gray-50' />
              </span>
            ) : null}
            {showSpinner ? (
              <ArrowClockwiseIcon className='absolute inset-0 size-5 animate-spin text-gray-700 dark:text-gray-50' />
            ) : null}
          </span>
        </Button>
      }
    />
  )
}
