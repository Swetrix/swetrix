import Cal, { getCalApi } from '@calcom/embed-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ClientOnly } from 'remix-utils/client-only'

import { LOGOS } from '~/components/marketing/LogoCloud'
import { BOOK_A_CALL_CAL_LINK } from '~/lib/constants'
import { useTheme } from '~/providers/ThemeProvider'
import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'

const CAL_NAMESPACE = '30min'

const BookACall = () => {
  const { t } = useTranslation('common')
  const { theme } = useTheme()

  // Configure the embed once it's ready, and re-apply whenever the site theme
  // toggles so the widget stays in sync with light/dark mode.
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const cal = await getCalApi({ namespace: CAL_NAMESPACE })
      if (cancelled) {
        return
      }
      cal('ui', {
        theme,
        layout: 'month_view',
        hideEventTypeDetails: false,
      })
    })()

    return () => {
      cancelled = true
    }
  }, [theme])

  return (
    <div className='min-h-min-footer bg-gray-50 dark:bg-slate-950'>
      <div className='mx-auto max-w-5xl px-4 pt-12 pb-16 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-2xl text-center'>
          <Text as='h1' size='4xl' weight='bold' tracking='tight'>
            {t('bookACall.title')}
          </Text>
          <Text
            as='p'
            size='lg'
            colour='secondary'
            className='mt-3 leading-7 text-pretty'
          >
            {t('bookACall.description')}
          </Text>
        </div>

        <div className='mt-10 min-h-[640px] overflow-hidden rounded-2xl bg-white ring-1 ring-gray-300/80 dark:bg-slate-900 dark:ring-white/10'>
          <ClientOnly
            fallback={
              <div className='h-[640px] w-full animate-pulse bg-gray-100 dark:bg-slate-800/60' />
            }
          >
            {() => (
              <Cal
                namespace={CAL_NAMESPACE}
                calLink={BOOK_A_CALL_CAL_LINK}
                style={{ width: '100%', height: '100%', overflow: 'scroll' }}
                config={{ layout: 'month_view', theme }}
              />
            )}
          </ClientOnly>
        </div>

        <div className='mt-14'>
          <Text
            as='p'
            size='xs'
            weight='semibold'
            colour='muted'
            className='text-center tracking-[0.18em] uppercase'
          >
            {t('main.logoCloud.title')}
          </Text>
          <ul className='mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-10 gap-y-6'>
            {LOGOS.map((logo) => (
              <li key={logo.name} className='flex items-center justify-center'>
                <img
                  alt={logo.name}
                  src={logo.dark && theme === 'dark' ? logo.dark : logo.light}
                  loading='lazy'
                  className={cn(
                    'w-auto max-w-[150px] object-contain',
                    logo.heightClass,
                    !logo.dark && 'dark:brightness-0 dark:invert',
                  )}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default BookACall
