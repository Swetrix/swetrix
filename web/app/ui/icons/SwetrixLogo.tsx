import React from 'react'
import cx from 'clsx'

interface SwetrixLogoProps {
  className?: string
  theme?: 'dark' | 'light'
  lazy?: boolean
}

const SwetrixLogo = ({ className, theme = 'dark', lazy }: SwetrixLogoProps) => (
  <div className={cx('flex -translate-y-[2px] items-center gap-2', className)}>
    <img
      className='-translate-y-[1px]'
      height='28px'
      width='24px'
      src={theme === 'dark' ? '/assets/logo/white.png' : '/assets/logo/blue.png'}
      alt=''
      loading={lazy ? 'lazy' : 'eager'}
    />
    <span className={cx('font-mono text-2xl font-bold', theme === 'dark' ? 'text-white' : 'text-indigo-950')}>
      Swetrix
    </span>
  </div>
)

export default SwetrixLogo
