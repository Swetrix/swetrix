import _split from 'lodash/split'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'

import { verifyShare } from '~/api'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'

const ConfirmShare = () => {
  const { t } = useTranslation('common')
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    const path = _split(window.location.pathname, '/')[1]

    if (!id) {
      setError(t('common.error'))
      setLoading(false)
      return
    }

    const verify = async () => {
      try {
        await verifyShare({ path, id })
      } catch (reason: any) {
        setError(typeof reason === 'string' ? reason : t('apiNotifications.somethingWentWrong'))
      } finally {
        setLoading(false)
      }
    }

    verify()
  }, [id]) // eslint-disable-line

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
      type='success'
      title={t('apiNotifications.acceptInvitation')}
      actions={[{ label: t('common.dashboard'), to: routes.dashboard, primary: true }]}
    />
  )
}

export default ConfirmShare
