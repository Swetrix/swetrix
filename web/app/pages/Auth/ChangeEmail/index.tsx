import _isString from 'lodash/isString'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'

import { confirmChangeEmail } from '~/api'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'

const ChangeEmail = () => {
  const { t } = useTranslation('common')
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Async email verification flow
    setLoading(true)

    if (!_isString(id)) {
      setError(t('auth.verification.invalid'))
      setLoading(false)
      return
    }

    confirmChangeEmail({ id })
      .then(() => {
        setLoading(false)
      })
      .catch((reason) => {
        setError(reason.toString())
        setLoading(false)
      })
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
      actions={[{ label: t('common.dashboard'), to: routes.dashboard, primary: true }]}
    />
  )
}

export default ChangeEmail
