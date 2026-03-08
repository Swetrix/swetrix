import { WifiSlashIcon, ArrowClockwiseIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { useNetworkStatus } from '~/hooks/useNetworkStatus'
import { cn } from '~/utils/generic'

interface OfflineBannerProps {
  onRetry?: () => void
  className?: string
}

const OfflineBanner = ({ onRetry, className }: OfflineBannerProps) => {
  const { t } = useTranslation('common')
  const { isOnline, lastSyncedAt } = useNetworkStatus()

  const formattedTime = lastSyncedAt
    ? lastSyncedAt.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <AnimatePresence>
      {!isOnline ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn('overflow-hidden', className)}
        >
          <div className='flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/40'>
            <div className='flex items-center gap-2.5'>
              <WifiSlashIcon
                weight='duotone'
                className='size-4 shrink-0 text-amber-600 dark:text-amber-400'
              />
              <p className='text-sm font-medium text-amber-800 dark:text-amber-200'>
                {t('project.offline')}
                {formattedTime ? (
                  <span className='ml-1 font-normal text-amber-600 dark:text-amber-400'>
                    {t('project.lastSynced', { time: formattedTime })}
                  </span>
                ) : null}
              </p>
            </div>
            {onRetry ? (
              <button
                type='button'
                onClick={onRetry}
                className='inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40'
              >
                <ArrowClockwiseIcon className='size-3.5' />
                {t('project.retry')}
              </button>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default memo(OfflineBanner)
