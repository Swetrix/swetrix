import cx from 'clsx'
import { KeyRoundIcon } from 'lucide-react'
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
      className={cx(
        className,
        'flex w-full items-center justify-center border-indigo-100 dark:border-slate-700/50 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700',
      )}
      onClick={onClick}
      secondary
      regular
      disabled={disabled}
    >
      <KeyRoundIcon className='mr-2 size-5' />
      {t('auth.common.oidc')}
    </Button>
  )
}

export default OIDCAuth
