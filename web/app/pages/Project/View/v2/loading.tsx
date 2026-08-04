import { ArrowsClockwiseIcon } from '@phosphor-icons/react'
import cx from 'clsx'
import { useTranslation } from 'react-i18next'

import Button from '~/ui/Button'
import { Text } from '~/ui/Text'

export const RefetchIndicator = ({ className }: { className?: string }) => (
  <div
    aria-hidden
    className={cx(
      'absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/70',
      className,
    )}
  >
    <div className='indeterminate-bar absolute inset-y-0 left-0 w-[42%] rounded-full bg-linear-to-r from-slate-400 via-slate-900 to-slate-400 will-change-transform dark:from-slate-500 dark:via-white dark:to-slate-500' />
  </div>
)

export const ChartErrorState = ({ onRetry }: { onRetry: () => void }) => {
  const { t } = useTranslation('common')

  return (
    <div className='flex h-80 flex-col items-center justify-center text-center'>
      <Text as='p' size='sm' colour='secondary'>
        {t('apiNotifications.somethingWentWrong')}
      </Text>
      <Button
        className='mt-3 gap-1.5'
        onClick={onRetry}
        variant='secondary'
        size='sm'
      >
        <ArrowsClockwiseIcon className='size-4' />
        {t('project.refreshStats')}
      </Button>
    </div>
  )
}
