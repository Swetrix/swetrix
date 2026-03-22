import cx from 'clsx'
import { useTranslation } from 'react-i18next'

import { isSelfhosted, ThemeType } from '~/lib/constants'
import { useTheme } from '~/providers/ThemeProvider'

interface SwetrixLogoProps {
  className?: string
  theme?: ThemeType
}

const SwetrixLogo = ({
  className,
  theme: themeOverride,
}: SwetrixLogoProps) => {
  const { theme: currentTheme } = useTheme()
  const { t } = useTranslation()

  const theme = themeOverride || currentTheme

  return (
    <div
      className={cx(
        'flex -translate-y-[2px] items-center gap-2 select-none',
        className,
      )}
    >
      <svg
        className={cx(
          '-translate-y-px',
          theme === 'dark' ? 'fill-white' : 'fill-slate-900',
        )}
        height='28'
        width='24'
        viewBox='0 0 24 28'
        xmlns='http://www.w3.org/2000/svg'
      >
        <circle cx='4' cy='22' r='3' />
        <circle cx='12' cy='22' r='3' />
        <circle cx='12' cy='14' r='3' />
        <circle cx='20' cy='22' r='3' />
        <circle cx='20' cy='14' r='3' />
        <circle cx='20' cy='6' r='3' />
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
