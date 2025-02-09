import dayjs from 'dayjs'
import _filter from 'lodash/filter'
import _map from 'lodash/map'
import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'

import { rejectProjectShare, acceptProjectShare } from '~/api'
import { SharedProject } from '~/lib/models/SharedProject'
import { authActions } from '~/lib/reducers/auth'
import { StateType, useAppDispatch } from '~/lib/store'
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
  const { user } = useSelector((state: StateType) => state.auth)
  const dispatch = useAppDispatch()

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const { created, confirmed, id, role, project } = item

  const onQuit = async () => {
    try {
      await rejectProjectShare(item.id)
      dispatch(
        authActions.mergeUser({
          sharedProjects: _filter(user.sharedProjects, (share) => share.id !== item.id),
        }),
      )
      toast.success(t('apiNotifications.quitProject'))
    } catch (reason) {
      console.error(`[ERROR] Error while quitting project: ${reason}`)
      toast.error(t('apiNotifications.quitProjectError'))
    }
  }

  const onAccept = async () => {
    try {
      await acceptProjectShare(id)

      dispatch(
        authActions.mergeUser({
          sharedProjects: _map(user.sharedProjects, (item) => {
            if (item.id === id) {
              return { ...item, confirmed: true }
            }
            return item
          }),
        }),
      )

      toast.success(t('apiNotifications.acceptInvitation'))
    } catch (reason) {
      console.error(`[ERROR] Error while accepting project invitation: ${reason}`)
      toast.error(t('apiNotifications.acceptInvitationError'))
    }
  }

  return (
    <tr className='dark:bg-slate-800'>
      <td className='py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6 dark:text-white'>
        {project.name}
      </td>
      <td className='px-3 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-white'>
        {t(`project.settings.roles.${role}.name`)}
      </td>
      <td className='px-3 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-white'>
        {language === 'en'
          ? dayjs(created).locale(language).format('MMMM D, YYYY')
          : dayjs(created).locale(language).format('D MMMM, YYYY')}
      </td>
      <td className='relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6'>
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
