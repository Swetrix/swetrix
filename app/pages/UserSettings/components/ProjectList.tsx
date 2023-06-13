import React, { memo, useState } from 'react'
import dayjs from 'dayjs'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

import Button from 'ui/Button'
import Modal from 'ui/Modal'
import {
  deleteShareProject, acceptShareProject,
} from 'api'
import { ISharedProject } from 'redux/models/ISharedProject'

const ProjectList = ({
  item, removeShareProject, removeProject, setProjectsShareData, setUserShareData,
  userSharedUpdate, sharedProjectError,
}: {
  item: ISharedProject,
  removeShareProject: (id: string) => void,
  removeProject: (id: string) => void,
  setProjectsShareData: (data: Partial<ISharedProject>, id: string, shared?: boolean) => void,
  setUserShareData: (data: Partial<ISharedProject>, id: string) => void,
  userSharedUpdate: (message: string) => void,
  sharedProjectError: (message: string) => void,
}): JSX.Element => {
  const { t, i18n: { language } }: {
    t: (key: string, options?: {
      [key: string]: string | number,
    }) => string,
    i18n: {
      language: string,
    },
  } = useTranslation('common')

  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const {
    created, confirmed, id, role, project,
  } = item

  const deleteProject = async (pid: string) => {
    try {
      await deleteShareProject(pid)
      removeShareProject(pid)
      removeProject(project.id)
      userSharedUpdate(t('apiNotifications.quitProject'))
    } catch (e) {
      console.error(`[ERROR] Error while quitting project: ${e}`)
      sharedProjectError(t('apiNotifications.quitProjectError'))
    }
  }

  const onAccept = async () => {
    try {
      await acceptShareProject(id)
      setProjectsShareData({ confirmed: true }, project.id)
      setUserShareData({ confirmed: true }, id)
      userSharedUpdate(t('apiNotifications.acceptInvitation'))
    } catch (e) {
      console.error(`[ERROR] Error while accepting project invitation: ${e}`)
      sharedProjectError(t('apiNotifications.acceptInvitationError'))
    }
  }

  return (
    <tr className='dark:bg-slate-800'>
      <td className='whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6'>
        {project.name}
      </td>
      <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-white'>
        {t(`project.settings.roles.${role}.name`)}
      </td>
      <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-white'>
        {language === 'en'
          ? dayjs(created).locale(language).format('MMMM D, YYYY')
          : dayjs(created).locale(language).format('D MMMM, YYYY')}
      </td>
      <td className='relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6'>
        {confirmed ? (
          <Button onClick={() => setShowDeleteModal(true)} danger small>
            {t('common.quit')}
          </Button>
        ) : (
          <>
            <Button className='mr-2' onClick={() => setShowDeleteModal(true)} primary small>
              {t('common.reject')}
            </Button>
            <Button onClick={() => onAccept()} primary small>
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
            deleteProject(id)
          }}
          submitText={t('common.yes')}
          type='confirmed'
          closeText={t('common.no')}
          title={t('profileSettings.quitProjectTitle', { project: project.name })}
          message={t('profileSettings.quitProject')}
          isOpened={showDeleteModal}
        />
      </td>
    </tr>
  )
}

ProjectList.propTypes = {
  item: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  sharedProjectError: PropTypes.func.isRequired,
  removeProject: PropTypes.func.isRequired,
  removeShareProject: PropTypes.func.isRequired,
  userSharedUpdate: PropTypes.func.isRequired,
}

export default memo(ProjectList)
