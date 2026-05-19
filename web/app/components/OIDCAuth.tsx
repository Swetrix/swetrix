import cx from 'clsx'
import { KeyIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

import AuthLastUsedBadge from '~/components/AuthLastUsedBadge'
import Button from '~/ui/Button'

interface OIDCAuthProps {
  onClick: () => void
  className?: string
  disabled?: boolean
  lastUsed?: boolean
}

const OIDCAuth = ({
  onClick,
  className,
  disabled,
  lastUsed,
}: OIDCAuthProps) => {
  const { t } = useTranslation()

  return (
    <Button
      variant='secondary'
      className={cx(className, 'relative flex items-center justify-center')}
      onClick={onClick}
      disabled={disabled}
    >
      <KeyIcon className='mr-2 size-5' />
      {t('auth.common.oidc')}
      {lastUsed ? (
        <AuthLastUsedBadge className='pointer-events-none absolute -top-2 right-2' />
      ) : null}
    </Button>
  )
}

export default OIDCAuth
