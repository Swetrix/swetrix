import React, { memo } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

import Tooltip from './Tooltip'
import { WarningPin } from './Pin'

const Beta = ({
  className,
}: {
  className?: string,
}): JSX.Element => {
  const { t } = useTranslation('common')

  return (
    <Tooltip
      className='max-w-content !w-full'
      tooltipNode={(
        <WarningPin className={className} label={t('beta.title')} />
      )}
      text={t('beta.description')}
    />
  )
}

Beta.propTypes = {
  className: PropTypes.string,
}

Beta.defaultProps = {
  className: '',
}

export default memo(Beta)
