import cx from 'clsx'
import { useTranslation } from 'react-i18next'

import { useTheme } from '~/providers/ThemeProvider'
import Button from '~/ui/Button'
import GithubDarkSVG from '~/ui/icons/GithubDark'
import GithubLightSVG from '~/ui/icons/GithubLight'

interface GoogleAuthProps {
  className?: string
  onClick: () => void
  disabled?: boolean
}

const GithubAuth = ({ className, onClick, disabled }: GoogleAuthProps) => {
  const { t } = useTranslation()
  const { theme } = useTheme()

  return (
    <Button
      className={cx(
        className,
        'flex items-center justify-center border-indigo-100 dark:border-slate-700/80 dark:bg-slate-900 dark:text-gray-50 dark:hover:bg-slate-800',
      )}
      onClick={onClick}
      secondary
      regular
      disabled={disabled}
    >
      <>
        {theme === 'dark' ? (
          <GithubLightSVG className='mr-2 size-5' />
        ) : (
          <GithubDarkSVG className='mr-2 size-5' />
        )}
        {t('auth.common.github')}
      </>
    </Button>
  )
}

export default GithubAuth
