import cx from 'clsx'
import dayjs from 'dayjs'
import _filter from 'lodash/filter'
import _map from 'lodash/map'
import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { rejectOrganisationInvitation, acceptOrganisationInvitation } from '~/api'
import { OrganisationMembership } from '~/lib/models/Organisation'
import { useAuth } from '~/providers/AuthProvider'
import Button from '~/ui/Button'
import Modal from '~/ui/Modal'

interface OrganisationsProps {
  membership: OrganisationMembership
}

const Organisations = ({ membership }: OrganisationsProps) => {
  const { user, mergeUser } = useAuth()
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const { organisation, confirmed, role, created } = membership

  const onQuit = async () => {
    try {
      await rejectOrganisationInvitation(membership.id)

      mergeUser({
        organisationMemberships: _filter(
          user?.organisationMemberships,
          (userMembership) => userMembership.id !== membership.id,
        ),
      })

      toast.success(t('apiNotifications.quitOrganisation'))
    } catch (reason) {
      console.error(`[ERROR] Error while quitting project: ${reason}`)
      toast.error(t('apiNotifications.quitOrganisationError'))
    }
  }

  const onAccept = async () => {
    try {
      await acceptOrganisationInvitation(membership.id)

      mergeUser({
        organisationMemberships: _map(user?.organisationMemberships, (item) => {
          if (item.id === membership.id) {
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
    <tr className='dark:bg-slate-800'>
      <td className='py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6 dark:text-white'>
        {organisation.name}
      </td>
      <td className='px-3 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-white'>
        {t(`organisations.role.${role}.name`)}
      </td>
      <td className='px-3 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-white'>
        {language === 'en'
          ? dayjs(created).locale(language).format('MMMM D, YYYY')
          : dayjs(created).locale(language).format('D MMMM, YYYY')}
      </td>
      <td
        className={cx('relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6', {
          hidden: role === 'owner',
        })}
      >
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
