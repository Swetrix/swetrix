import cx from 'clsx'
import { useTranslation } from 'react-i18next'

import { isSelfhosted } from '~/lib/constants'

interface SwetrixLogoProps {
  className?: string
  theme?: 'dark' | 'light'
  lazy?: boolean
}

const SwetrixLogo = ({ className, theme = 'dark', lazy }: SwetrixLogoProps) => {
  const { t } = useTranslation()

  return (
    <div className={cx('flex -translate-y-[2px] items-center gap-2 select-none', className)}>
      <img
        className='-translate-y-[1px]'
        height='28px'
        width='24px'
        src={theme === 'dark' ? '/assets/logo/white.png' : '/assets/logo/blue.png'}
        alt=''
        loading={lazy ? 'lazy' : 'eager'}
      />
      <div className='flex flex-col'>
        <span
          className={cx('font-mono text-2xl leading-5 font-bold', theme === 'dark' ? 'text-white' : 'text-indigo-950')}
        >
          Swetrix
        </span>
        {isSelfhosted ? (
          <span className={cx('font-mono text-xs font-semibold', theme === 'dark' ? 'text-white' : 'text-indigo-600')}>
            {t('common.communityEdition')}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export default SwetrixLogo
