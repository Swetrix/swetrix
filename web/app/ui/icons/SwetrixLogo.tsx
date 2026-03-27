import cx from 'clsx'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { isSelfhosted, ThemeType } from '~/lib/constants'
import { useTheme } from '~/providers/ThemeProvider'

interface SwetrixLogoProps {
  className?: string
  theme?: ThemeType
}

const SwetrixLogo = ({ className, theme: themeOverride }: SwetrixLogoProps) => {
  const { theme: currentTheme } = useTheme()
  const { t } = useTranslation()
  const gradientId = useId()

  const theme = themeOverride || currentTheme

  return (
    <div
      className={cx(
        'flex -translate-y-[2px] items-center gap-2 select-none',
        className,
      )}
    >
      <svg
        height='28'
        width='24'
        viewBox='0 0 24 28'
        aria-hidden='true'
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1='20'
            y1='4'
            x2='4'
            y2='24'
            gradientUnits='userSpaceOnUse'
          >
            {theme === 'dark' ? (
              <>
                <stop offset='0%' stopColor='#f9fafb' />
                <stop offset='100%' stopColor='#4f46e5' />
              </>
            ) : (
              <>
                <stop offset='0%' stopColor='#0f172a' />
                <stop offset='100%' stopColor='#4f46e5' />
              </>
            )}
          </linearGradient>
        </defs>
        <g fill={`url(#${gradientId})`}>
          <circle cx='4' cy='22' r='3' />
          <circle cx='12' cy='22' r='3' />
          <circle cx='12' cy='14' r='3' />
          <circle cx='20' cy='14' r='3' />
          <circle cx='12' cy='6' r='3' />
        </g>
      </svg>
      <div className='flex flex-col'>
        <span
          className={cx(
            'text-2xl leading-5 font-bold',
            theme === 'dark' ? 'text-white' : 'text-slate-900',
          )}
        >
          Swetrix
        </span>
        {isSelfhosted ? (
          <span
            className={cx(
              'text-xs font-semibold',
              theme === 'dark' ? 'text-white' : 'text-slate-600',
            )}
          >
            {t('common.communityEdition')}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export default SwetrixLogo
