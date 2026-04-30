import cx from 'clsx'
import { KeyIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

import Button from '~/ui/Button'

interface OIDCAuthProps {
  onClick: () => void
  className?: string
  disabled?: boolean
}

const OIDCAuth = ({ onClick, className, disabled }: OIDCAuthProps) => {
  const { t } = useTranslation()

  return (
    <Button
      variant='secondary'
      className={cx(className, 'flex items-center justify-center')}
      onClick={onClick}
      disabled={disabled}
    >
      <KeyIcon className='mr-2 size-5' />
      {t('auth.common.oidc')}
    </Button>
  )
}

export default OIDCAuth
