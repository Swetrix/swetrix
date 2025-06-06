import { XIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Badge } from '~/ui/Badge'
import { trackCustom } from '~/utils/analytics'
import { getCookie, setCookie } from '~/utils/cookie'

interface ExitIntentPopupProps {
  isStandalone?: boolean
}

const COOKIE_NAME = 'exit-intent-dismissed'
const COOKIE_EXPIRATION = 7 * 24 * 60 * 60

export default function ExitIntentPopup({ isStandalone = false }: ExitIntentPopupProps) {
  const { t } = useTranslation('common')
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    if (isStandalone) {
      return
    }

    const dismissed = getCookie(COOKIE_NAME)
    if (dismissed) {
      setIsDismissed(true)
      return
    }

    let hasTriggered = false

    const handleMouseLeave = (e: MouseEvent) => {
      if (!e.relatedTarget && !hasTriggered && !isDismissed) {
        hasTriggered = true
        setIsVisible(true)
      }
    }

    document.addEventListener('mouseout', handleMouseLeave)

    return () => {
      document.removeEventListener('mouseout', handleMouseLeave)
    }
  }, [isStandalone, isDismissed])

  const handleClose = () => {
    setIsVisible(false)
    setIsDismissed(true)
    setCookie(COOKIE_NAME, 'true', COOKIE_EXPIRATION)
  }

  const handleLearnMore = () => {
    trackCustom('EXIT_INTENT_POPUP_LEARN_MORE')
    handleClose()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  if (!isVisible || isDismissed || isStandalone) {
    return null
  }

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-xs'
      onClick={handleBackdropClick}
    >
      <div className='relative w-full max-w-2xl rounded-xl bg-white p-8 dark:bg-slate-800'>
        <button
          onClick={handleClose}
          className='fixed top-4 right-4 text-gray-50 hover:text-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
          aria-label={t('common.closePopup')}
        >
          <XIcon size={24} />
        </button>

        <div className='mb-6'>
          <Badge className='text-base' label={t('exitIntentPopup.freeTrial')} colour='green' />
        </div>

        <h2 className='mb-4 max-w-3xl text-[2.5rem]/10 font-semibold tracking-tight text-pretty text-gray-950 lg:text-5xl dark:text-gray-200'>
          {t('exitIntentPopup.title')}
        </h2>

        <p className='mb-8 text-xl leading-relaxed text-gray-950 dark:text-gray-200'>{t('exitIntentPopup.desc')}</p>

        <Link
          to='/'
          className='block max-w-max rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-center text-lg font-semibold text-white transition-all hover:from-indigo-700 hover:to-purple-700'
          onClick={handleLearnMore}
        >
          {t('common.learnMore')}
        </Link>
      </div>
    </div>
  )
}
