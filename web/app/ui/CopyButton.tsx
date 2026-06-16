import { CheckIcon, CopyIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { cn } from '~/utils/generic'

interface CopyButtonProps {
  value: string
  onCopy?: () => void
  className?: string
}

const CopyButton = ({ value, onCopy, className }: CopyButtonProps) => {
  const { t } = useTranslation('common')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      onCopy?.()
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('common.failedToCopy'))
    }
  }

  return (
    <button
      type='button'
      onClick={handleCopy}
      aria-label={copied ? t('common.copied') : t('common.copy')}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md bg-white/90 px-2 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200 backdrop-blur-sm transition-[background-color,color,box-shadow] duration-150 ease-out hover:bg-gray-100 hover:text-gray-900 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden dark:bg-slate-900/80 dark:text-gray-200 dark:ring-slate-700 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:ring-slate-300',
        className,
      )}
    >
      {copied ? (
        <>
          <CheckIcon
            className='size-3.5 text-emerald-600 dark:text-emerald-400'
            weight='bold'
            aria-hidden='true'
          />
          <span>{t('common.copied')}</span>
        </>
      ) : (
        <>
          <CopyIcon className='size-3.5' aria-hidden='true' />
          <span>{t('common.copy')}</span>
        </>
      )}
    </button>
  )
}

export default CopyButton
