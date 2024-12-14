import React, { memo } from 'react'
import { useTranslation } from 'react-i18next'

import Tooltip from './Tooltip'
import { Badge } from './Badge'

interface BetaProps {
  className?: string
}

const Beta = ({ className }: BetaProps) => {
  const { t } = useTranslation('common')

  return (
    <Tooltip
      className='max-w-content !w-full'
      tooltipNode={<Badge className={className} label={t('beta.title')} colour='yellow' />}
      text={t('beta.description')}
    />
  )
}

export default memo(Beta)
