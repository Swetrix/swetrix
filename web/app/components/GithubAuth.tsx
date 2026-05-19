import cx from 'clsx'
import { useTranslation } from 'react-i18next'

import AuthLastUsedBadge from '~/components/AuthLastUsedBadge'
import { useTheme } from '~/providers/ThemeProvider'
import Button from '~/ui/Button'
import GithubDarkSVG from '~/ui/icons/GithubDark'
import GithubLightSVG from '~/ui/icons/GithubLight'

interface GithubAuthProps {
  className?: string
  onClick: () => void
  disabled?: boolean
  lastUsed?: boolean
}

const GithubAuth = ({
  className,
  onClick,
  disabled,
  lastUsed,
}: GithubAuthProps) => {
  const { t } = useTranslation()
  const { theme } = useTheme()

  return (
    <Button
      variant='secondary'
      className={cx(className, 'relative flex items-center justify-center')}
      onClick={onClick}
      disabled={disabled}
    >
      <>
        {theme === 'dark' ? (
          <GithubLightSVG className='mr-2 size-5' />
        ) : (
          <GithubDarkSVG className='mr-2 size-5' />
        )}
        {t('auth.common.github')}
        {lastUsed ? (
          <AuthLastUsedBadge className='pointer-events-none absolute -top-2 right-2' />
        ) : null}
      </>
    </Button>
  )
}

export default GithubAuth
