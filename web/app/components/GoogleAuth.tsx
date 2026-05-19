import cx from 'clsx'
import { useTranslation } from 'react-i18next'

import AuthLastUsedBadge from '~/components/AuthLastUsedBadge'
import Button from '~/ui/Button'
import GoogleGSVG from '~/ui/icons/GoogleG'

interface GoogleAuthProps {
  onClick: () => void
  className?: string
  disabled?: boolean
  lastUsed?: boolean
}

const GoogleAuth = ({
  onClick,
  className,
  disabled,
  lastUsed,
}: GoogleAuthProps) => {
  const { t } = useTranslation()

  return (
    <Button
      variant='secondary'
      className={cx(className, 'relative flex items-center justify-center')}
      onClick={onClick}
      disabled={disabled}
    >
      <>
        <GoogleGSVG className='mr-2 size-5' />
        {t('auth.common.google')}
        {lastUsed ? (
          <AuthLastUsedBadge className='pointer-events-none absolute -top-2 right-2' />
        ) : null}
      </>
    </Button>
  )
}

export default GoogleAuth
