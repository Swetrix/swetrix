import cx from 'clsx'
import _find from 'lodash/find'
import _map from 'lodash/map'
import _replace from 'lodash/replace'
import _size from 'lodash/size'
import { Settings2Icon } from 'lucide-react'
import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { acceptOrganisationInvitation } from '~/api'
import { DetailedOrganisation } from '~/lib/models/Organisation'
import { useAuth } from '~/providers/AuthProvider'
import { Badge, BadgeProps } from '~/ui/Badge'
import Modal from '~/ui/Modal'
import routes from '~/utils/routes'

interface OrganisationCardProps {
  organisation: DetailedOrganisation
  reloadOrganisations: () => Promise<void>
}

export const OrganisationCard = ({ organisation, reloadOrganisations }: OrganisationCardProps) => {
  const { t } = useTranslation('common')
  const { user, mergeUser } = useAuth()
  const [showInviteModal, setShowInviteModal] = useState(false)

  const { name, members } = organisation

  const membership = useMemo(
    () => _find(members, (member) => member.user.email === user?.email),
    [members, user?.email],
  )

  const badges = useMemo(() => {
    const list: BadgeProps[] = []

    if (membership?.role) {
      list.push({
        colour: 'indigo',
        label: t(`organisations.role.${membership.role}.name`),
      })
    }

    if (!membership?.confirmed) {
      list.push({ colour: 'yellow', label: t('common.pending') })
    }

    const membersCount = _size(members)

    list.push({
      colour: 'slate',
      label: membersCount === 1 ? t('common.oneMember') : t('common.xMembers', { number: membersCount }),
    })

    return list
  }, [t, membership, members])

  const onAccept = async () => {
    try {
      if (!membership?.id) {
        throw new Error('Membership not found')
      }

      await acceptOrganisationInvitation(membership.id)

      await reloadOrganisations()

      mergeUser({
        organisationMemberships: _map(user?.organisationMemberships, (item) => {
          if (item.id === membership.id) {
            return { ...item, confirmed: true }
          }
          return item
        }),
      })

      toast.success(t('apiNotifications.acceptOrganisationInvitation'))
    } catch (reason: any) {
      console.error(`[ERROR] Error while accepting organisation invitation: ${reason}`)
      toast.error(typeof reason === 'string' ? reason : t('apiNotifications.acceptOrganisationInvitationError'))
    }
  }

  const onElementClick = (e: React.MouseEvent<HTMLAnchorElement | HTMLDivElement>) => {
    if (membership?.confirmed) {
      return
    }

    e.preventDefault()
    setShowInviteModal(true)
  }

  const CardWrapper = ({
    children,
    to,
    ...props
  }: {
    children: React.ReactNode
    to?: string
    onClick?: (e: React.MouseEvent<HTMLAnchorElement | HTMLDivElement>) => void
    className?: string
  }) => {
    if (membership?.role === 'viewer') {
      return <div {...props}>{children}</div>
    }

    return (
      <Link to={to!} {...props}>
        {children}
      </Link>
    )
  }

  return (
    <CardWrapper
      to={_replace(routes.organisation, ':id', organisation.id)}
      onClick={onElementClick}
      className={cx(
        'min-h-[153.1px] overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-slate-800/25 dark:bg-slate-800',
        {
          'cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700': membership?.role !== 'viewer',
        },
      )}
    >
      <div className='px-4 py-4'>
        <div className='flex items-center justify-between'>
          <p className='truncate text-lg font-semibold text-slate-900 dark:text-gray-50'>{name}</p>

          {membership?.role === 'viewer' ? null : (
            // dummy button, since the whole card is clickable
            <div
              aria-label={`${t('project.settings.settings')} ${name}`}
              className='rounded-md p-1.5 text-gray-800 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-300'
            >
              <Settings2Icon className='size-5' strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className='mt-1 flex shrink-0 flex-wrap gap-2'>
          {badges.map((badge) => (
            <Badge key={badge.label as string} {...badge} />
          ))}
        </div>
      </div>
      {!membership?.confirmed ? (
        <Modal
          onClose={() => {
            setShowInviteModal(false)
          }}
          onSubmit={() => {
            setShowInviteModal(false)
            onAccept()
          }}
          submitText={t('common.accept')}
          type='confirmed'
          closeText={t('common.cancel')}
          title={t('dashboard.invitationFor', { project: name })}
          message={t('dashboard.invitationDesc', { project: name })}
          isOpened={showInviteModal}
        />
      ) : null}
    </CardWrapper>
  )
}
