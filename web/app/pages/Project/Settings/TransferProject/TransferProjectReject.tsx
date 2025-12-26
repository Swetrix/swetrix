import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { rejectTransferProject } from '~/api'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'

const TransferProjectReject = () => {
  const { t } = useTranslation('common')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const handleConfirm = async (token: string) => {
    try {
      await rejectTransferProject(token)
    } catch {
      setError(t('apiNotifications.invalidToken'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    const query = new URLSearchParams(window.location.search)
    const token = query.get('token')

    if (!token) {
      setError(t('apiNotifications.invalidToken'))
      setLoading(false)
      return
    }

    handleConfirm(token)
  }, []) // eslint-disable-line

  if (loading) {
    return <StatusPage loading />
  }

  if (error) {
    return (
      <StatusPage
        type='error'
        title={error}
        actions={[
          { label: t('common.dashboard'), to: routes.dashboard, primary: true },
          { label: t('notFoundPage.support'), to: routes.contact },
        ]}
      />
    )
  }

  return (
    <StatusPage
      type='info'
      title={t('apiNotifications.transferProjectReject')}
      actions={[{ label: t('common.dashboard'), to: routes.dashboard, primary: true }]}
    />
  )
}

export default TransferProjectReject
