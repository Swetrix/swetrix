import React, { memo, useState } from 'react'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

import Button from 'ui/Button'
import Modal from 'ui/Modal'
// import { deleteShareProject, acceptShareProject } from 'api'
import { IProject } from 'redux/models/IProject'
import { OrganisationMembership } from 'redux/models/Organisation'

interface OrganisationsProps {
  membership: OrganisationMembership
  removeShareProject: (id: string) => void
  removeProject: (id: string) => void
  setProjectsShareData: (data: Partial<IProject>, id: string) => void
  setUserShareData: (data: Partial<IProject>, id: string) => void
}

const Organisations = ({
  membership,
  removeShareProject,
  removeProject,
  setProjectsShareData,
  setUserShareData,
}: OrganisationsProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const { organisation, confirmed, id, role, created } = membership

  const deleteProject = async (pid: string) => {
    try {
      // await deleteShareProject(pid)
      // removeShareProject(pid)
      // removeProject(project.id)
      toast.success(t('apiNotifications.quitOrganisation'))
    } catch (reason) {
      console.error(`[ERROR] Error while quitting project: ${reason}`)
      toast.error(t('apiNotifications.quitOrganisationError'))
    }
  }

  const onAccept = async () => {
    try {
      // await acceptShareProject(id)
      // setProjectsShareData({ isAccessConfirmed: true }, project.id)
      // setUserShareData({ isAccessConfirmed: true }, id)
      toast.success(t('apiNotifications.acceptInvitation'))
    } catch (reason) {
      console.error(`[ERROR] Error while accepting project invitation: ${reason}`)
      toast.error(t('apiNotifications.acceptInvitationError'))
    }
  }

  return (
    <tr className='dark:bg-slate-800'>
      <td className='whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6'>
        {organisation.name}
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
          title={t('profileSettings.quitEntity', { entity: organisation.name })}
          message={t('profileSettings.quitOrganisation')}
          isOpened={showDeleteModal}
        />
      </td>
    </tr>
  )
}

export default memo(Organisations)
