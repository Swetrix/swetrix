import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '~/ui/Badge'
import { cn } from '~/utils/generic'

interface AuthLastUsedBadgeProps {
  className?: string
}

const AuthLastUsedBadge = ({ className }: AuthLastUsedBadgeProps) => {
  const { t } = useTranslation('common')

  return (
    <Badge
      label={t('auth.common.lastUsed')}
      colour='slate'
      size='sm'
      // Using custom background colour to avoid ugly transparency effect with auth buttons
      className={cn('shrink-0 leading-4 dark:bg-slate-950', className)}
    />
  )
}

export default memo(AuthLastUsedBadge)
