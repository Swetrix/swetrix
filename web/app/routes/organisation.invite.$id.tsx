import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'

import { acceptOrganisationInvitation } from '~/api'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'

export default function ConfirmOrganisationInvitation() {
  const { t } = useTranslation('common')
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)

    if (!id) {
      setError(t('common.error'))
      setLoading(false)
      return
    }

    const acceptInvitation = async () => {
      try {
        await acceptOrganisationInvitation(id)
      } catch (reason) {
        setError(typeof reason === 'string' ? reason : t('apiNotifications.acceptOrganisationInvitationError'))
      } finally {
        setLoading(false)
      }
    }

    acceptInvitation()
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
      title={t('apiNotifications.acceptOrganisationInvitation')}
      actions={[{ label: t('common.dashboard'), to: routes.dashboard, primary: true }]}
    />
  )
}
