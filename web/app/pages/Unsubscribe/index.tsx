import _isString from 'lodash/isString'
import { useState, useEffect, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'

import { unsubscribeFromEmailReports, unsubscribeFromEmailReports3rdParty } from '~/api'
import { useAuth } from '~/providers/AuthProvider'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'

interface UnsubscribeProps {
  type: 'user-reports' | '3rdparty'
}

const Unsubscribe = ({ type }: UnsubscribeProps) => {
  const { t } = useTranslation('common')
  const { token } = useParams()
  const { isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)

    if (!_isString(token)) {
      setError(t('apiNotifications.invalidToken'))
      setLoading(false)
      return
    }

    if (type === 'user-reports') {
      unsubscribeFromEmailReports(token)
        .then(() => {
          setLoading(false)
        })
        .catch((reason) => {
          setError(_isString(reason) ? reason : reason?.response?.data?.message || reason.message)
        })
        .finally(() => {
          setLoading(false)
        })
    }

    if (type === '3rdparty') {
      unsubscribeFromEmailReports3rdParty(token)
        .then(() => {
          setLoading(false)
        })
        .catch((reason) => {
          setError(_isString(reason) ? reason : reason?.response?.data?.message || reason.message)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [token, type]) // eslint-disable-line

  const primaryAction = isAuthenticated
    ? { label: t('common.dashboard'), to: routes.dashboard, primary: true }
    : { label: t('auth.signin.button'), to: routes.signin, primary: true }

  if (loading) {
    return <StatusPage loading />
  }

  if (error) {
    return (
      <StatusPage
        type='error'
        title={error}
        actions={[primaryAction, { label: t('notFoundPage.support'), to: routes.contact }]}
      />
    )
  }

  return <StatusPage type='success' title={t('unsubscribe.success')} actions={[primaryAction]} />
}

export default memo(Unsubscribe)
