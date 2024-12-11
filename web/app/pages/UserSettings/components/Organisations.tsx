import React, { memo, useState } from 'react'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import _map from 'lodash/map'
import _filter from 'lodash/filter'

import Button from 'ui/Button'
import Modal from 'ui/Modal'
import { rejectOrganisationInvitation, acceptOrganisationInvitation } from 'api'
import { OrganisationMembership } from 'lib/models/Organisation'
import { StateType, useAppDispatch } from 'lib/store'
import { authActions } from 'lib/reducers/auth'
import { useSelector } from 'react-redux'

interface OrganisationsProps {
  membership: OrganisationMembership
}

const Organisations = ({ membership }: OrganisationsProps) => {
  const { user } = useSelector((state: StateType) => state.auth)
  const dispatch = useAppDispatch()
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const { organisation, confirmed, role, created } = membership

  const onQuit = async () => {
    try {
      await rejectOrganisationInvitation(membership.id)

      dispatch(
        authActions.mergeUser({
          organisationMemberships: _filter(
            user.organisationMemberships,
            (userMembership) => userMembership.id !== membership.id,
          ),
        }),
      )

      toast.success(t('apiNotifications.quitOrganisation'))
    } catch (reason) {
      console.error(`[ERROR] Error while quitting project: ${reason}`)
      toast.error(t('apiNotifications.quitOrganisationError'))
    }
  }

  const onAccept = async () => {
    try {
      await acceptOrganisationInvitation(membership.id)

      dispatch(
        authActions.mergeUser({
          organisationMemberships: _map(user.organisationMemberships, (item) => {
            if (item.id === membership.id) {
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
          title={t('profileSettings.quitEntity', { entity: organisation.name })}
          message={t('profileSettings.quitOrganisation')}
          isOpened={showDeleteModal}
        />
      </td>
    </tr>
  )
}

export default memo(Organisations)
