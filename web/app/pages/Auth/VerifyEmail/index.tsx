import _isString from 'lodash/isString'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'

import { verifyEmail } from '~/api'
import { useAuth } from '~/providers/AuthProvider'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'

const VerifyEmail = () => {
  const { t } = useTranslation('common')
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { mergeUser } = useAuth()

  useEffect(() => {
    setLoading(true)

    if (!_isString(id)) {
      setError(t('auth.verification.invalid'))
      setLoading(false)
      return
    }

    const verify = async () => {
      try {
        await verifyEmail({ id })
        mergeUser({ isActive: true })
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
      title={t('auth.verification.success')}
      actions={[{ label: t('auth.verification.continueToOnboarding'), to: routes.onboarding, primary: true }]}
    />
  )
}

export default VerifyEmail
