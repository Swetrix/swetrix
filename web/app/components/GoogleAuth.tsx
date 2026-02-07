import cx from 'clsx'
import { useTranslation } from 'react-i18next'

import Button from '~/ui/Button'
import GoogleGSVG from '~/ui/icons/GoogleG'

interface GoogleAuthProps {
  onClick: () => void
  className?: string
  disabled?: boolean
}

const GoogleAuth = ({ onClick, className, disabled }: GoogleAuthProps) => {
  const { t } = useTranslation()

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
        <GoogleGSVG className='mr-2 size-5' />
        {t('auth.common.google')}
      </>
    </Button>
  )
}

export default GoogleAuth
