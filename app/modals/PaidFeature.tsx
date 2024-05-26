import React from 'react'
import { useNavigate } from '@remix-run/react'
import { useTranslation } from 'react-i18next'

import Modal from 'ui/Modal'
import routes from 'routesPath'

interface IPaidFeature {
  onClose: () => void
  isOpened: boolean
}

const PaidFeature = ({ onClose, isOpened }: IPaidFeature): JSX.Element => {
  const { t } = useTranslation('common')
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

export default PaidFeature
