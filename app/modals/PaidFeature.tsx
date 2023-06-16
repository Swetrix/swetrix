import React from 'react'
import { useNavigate } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'

import Modal from 'ui/Modal'
import routes from 'routesPath'

const PaidFeature = ({ onClose, isOpened }: {
  onClose: () => void,
  isOpened: boolean,
}): JSX.Element => {
  const { t }: {
    t: (key: string, options?: { [key: string]: string | number }) => string,
  } = useTranslation('common')
  const navigate = useNavigate()

  const onSubmit = () => {
    navigate(routes.billing)
  }

  return (
    <Modal
      type='info'
      onClose={onClose}
      onSubmit={onSubmit}
      submitText={t('pricing.upgrade')}
      closeText={t('common.cancel')}
      message={t('modals.paidFeature.desc')}
      title={t('modals.paidFeature.title')}
      isOpened={isOpened}
    />
  )
}

PaidFeature.propTypes = {
  onClose: PropTypes.func.isRequired,
  isOpened: PropTypes.bool.isRequired,
}

export default PaidFeature
