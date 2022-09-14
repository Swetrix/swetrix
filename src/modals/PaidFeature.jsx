import React from 'react'
import { useHistory } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'

import Modal from 'ui/Modal'
import routes from 'routes'

const PaidFeature = ({ onClose, isOpened }) => {
  const { t } = useTranslation('common')
  const history = useHistory()

  const onSubmit = () => {
    history.push(routes.billing)
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
