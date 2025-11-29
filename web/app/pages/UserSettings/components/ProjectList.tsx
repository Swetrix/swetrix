import dayjs from 'dayjs'
import _filter from 'lodash/filter'
import _map from 'lodash/map'
import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { rejectProjectShare, acceptProjectShare } from '~/api'
import { SharedProject } from '~/lib/models/SharedProject'
import { useAuth } from '~/providers/AuthProvider'
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

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const { created, confirmed, id, role, project } = item

  const onQuit = async () => {
    try {
      await rejectProjectShare(item.id)
      mergeUser({
        sharedProjects: _filter(user?.sharedProjects, (share) => share.id !== item.id),
      })
      toast.success(t('apiNotifications.quitProject'))
    } catch (reason) {
      console.error(`[ERROR] Error while quitting project: ${reason}`)
      toast.error(t('apiNotifications.quitProjectError'))
    }
  }

  const onAccept = async () => {
    try {
      await acceptProjectShare(id)

      mergeUser({
        sharedProjects: _map(user?.sharedProjects, (item) => {
          if (item.id === id) {
            return { ...item, confirmed: true }
          }
          return item
        }),
      })

      toast.success(t('apiNotifications.acceptInvitation'))
    } catch (reason) {
      console.error(`[ERROR] Error while accepting project invitation: ${reason}`)
      toast.error(t('apiNotifications.acceptInvitationError'))
    }
  }

  return (
    <tr className='bg-white hover:bg-gray-50 dark:bg-slate-900 dark:hover:bg-slate-800/50'>
      <td className='px-4 py-3 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100'>{project.name}</td>
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
          <Button onClick={() => setShowDeleteModal(true)} danger small>
            {t('common.quit')}
          </Button>
        ) : (
          <>
            <Button className='mr-2' onClick={() => setShowDeleteModal(true)} primary small>
              {t('common.reject')}
            </Button>
            <Button onClick={onAccept} primary small>
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
