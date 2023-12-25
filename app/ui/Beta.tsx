import React, { memo } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

import Tooltip from './Tooltip'
import { Badge } from './Badge'

// Define the prop types for the component
interface IBeta {
  className?: string
}

const Beta = ({
  // (string): Additional CSS classes to be applied to the alert container.
  className,
}: IBeta): JSX.Element => {
  const { t } = useTranslation('common')

  return (
    <Tooltip
      className='max-w-content !w-full'
      tooltipNode={<Badge className={className} label={t('beta.title')} colour='yellow' />}
      text={t('beta.description')}
    />
  )
}

// Define the prop types for the component
Beta.propTypes = {
  className: PropTypes.string,
}

// Define the default props for the component
Beta.defaultProps = {
  className: '',
}

export default memo(Beta)
