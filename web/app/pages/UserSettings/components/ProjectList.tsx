import dayjs from 'dayjs'
import _filter from 'lodash/filter'
import _map from 'lodash/map'
import { memo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import { SharedProject } from '~/lib/models/SharedProject'
import { useAuth } from '~/providers/AuthProvider'
import { UserSettingsActionData } from '~/routes/user-settings'
import Button from '~/ui/Button'
import Modal from '~/ui/Modal'

interface ProjectListProps {
  item: SharedProject
}

const ProjectList = ({ item }: ProjectListProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { user, mergeUser } = useAuth()
  const fetcher = useFetcher<UserSettingsActionData>()

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const { created, confirmed, id, role, project } = item

  const isPending = fetcher.state !== 'idle'

  useEffect(() => {
    if (fetcher.data?.intent === 'reject-project-share') {
      if (fetcher.data.success) {
        mergeUser({
          sharedProjects: _filter(
            user?.sharedProjects,
            (share) => share.id !== item.id,
          ),
        })
        toast.success(t('apiNotifications.quitProject'))
      } else if (fetcher.data.error) {
        toast.error(t('apiNotifications.quitProjectError'))
      }
    }

    if (fetcher.data?.intent === 'accept-project-share') {
      if (fetcher.data.success) {
        mergeUser({
          sharedProjects: _map(user?.sharedProjects, (share) => {
            if (share.id === id) {
              return { ...share, confirmed: true }
            }
            return share
          }),
        })
        toast.success(t('apiNotifications.acceptInvitation'))
      } else if (fetcher.data.error) {
        toast.error(t('apiNotifications.acceptInvitationError'))
      }
    }
  }, [fetcher.data, id, item.id, mergeUser, t, user?.sharedProjects])

  const onQuit = () => {
    fetcher.submit(
      { intent: 'reject-project-share', shareId: item.id },
      { method: 'post', action: '/user-settings' },
    )
  }

  const onAccept = () => {
    fetcher.submit(
      { intent: 'accept-project-share', shareId: id },
      { method: 'post', action: '/user-settings' },
    )
  }

  return (
    <tr className='bg-white hover:bg-gray-50 dark:bg-slate-900 dark:hover:bg-slate-800/50'>
      <td className='px-4 py-3 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100'>
        {project.name}
      </td>
      <td className='px-4 py-3 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100'>
        {t(`project.settings.roles.${role}.name`)}
      </td>
      <td className='px-4 py-3 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100'>
        {language === 'en'
          ? dayjs(created).locale(language).format('MMMM D, YYYY')
          : dayjs(created).locale(language).format('D MMMM, YYYY')}
      </td>
      <td className='px-4 py-3 text-right text-sm whitespace-nowrap'>
        {confirmed ? (
          <Button
            onClick={() => setShowDeleteModal(true)}
            danger
            small
            loading={isPending}
          >
            {t('common.quit')}
          </Button>
        ) : (
          <>
            <Button
              className='mr-2'
              onClick={() => setShowDeleteModal(true)}
              primary
              small
              loading={isPending}
            >
              {t('common.reject')}
            </Button>
            <Button onClick={onAccept} primary small loading={isPending}>
              {t('common.accept')}
            </Button>
          </>
        )}
        <Modal
          onClose={() => {
            setShowDeleteModal(false)
          }}
          onSubmit={() => {
            setShowDeleteModal(false)
            onQuit()
          }}
          submitText={t('common.yes')}
          type='confirmed'
          closeText={t('common.no')}
          title={t('profileSettings.quitEntity', { entity: project.name })}
          message={t('profileSettings.quitProject')}
          isOpened={showDeleteModal}
        />
      </td>
    </tr>
  )
}

export default memo(ProjectList)
