import cx from 'clsx'
import _find from 'lodash/find'
import _map from 'lodash/map'
import _replace from 'lodash/replace'
import _size from 'lodash/size'
import { Settings2Icon } from 'lucide-react'
import React, { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useFetcher } from 'react-router'

import { DetailedOrganisation } from '~/lib/models/Organisation'
import { useAuth } from '~/providers/AuthProvider'
import type { OrganisationsActionData } from '~/routes/organisations._index'
import { Badge, BadgeProps } from '~/ui/Badge'
import Modal from '~/ui/Modal'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'

interface OrganisationCardProps {
  organisation: DetailedOrganisation
}

export const OrganisationCard = ({ organisation }: OrganisationCardProps) => {
  const { t } = useTranslation('common')
  const { user, mergeUser } = useAuth()
  const [showInviteModal, setShowInviteModal] = useState(false)
  const fetcher = useFetcher<OrganisationsActionData>()

  const { name, members } = organisation

  const isAccepting =
    fetcher.state === 'submitting' &&
    fetcher.formData?.get('intent') === 'accept-invitation'

  const membership = useMemo(
    () => _find(members, (member) => member.user.email === user?.email),
    [members, user?.email],
  )

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.intent === 'accept-invitation') {
      mergeUser({
        organisationMemberships: _map(user?.organisationMemberships, (item) => {
          if (item.id === membership?.id) {
            return { ...item, confirmed: true }
          }
          return item
        }),
      })
    }
  }, [fetcher.data]) // eslint-disable-line react-hooks/exhaustive-deps

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
      label:
        membersCount === 1
          ? t('common.oneMember')
          : t('common.xMembers', { number: membersCount }),
    })

    return list
  }, [t, membership, members])

  const onAccept = () => {
    if (!membership?.id) {
      return
    }

    const formData = new FormData()
    formData.set('intent', 'accept-invitation')
    formData.set('membershipId', membership.id)
    fetcher.submit(formData, { method: 'post' })
  }

  const onElementClick = (
    e: React.MouseEvent<HTMLAnchorElement | HTMLDivElement>,
  ) => {
    if (membership?.confirmed) {
      return
    }

    e.preventDefault()
    setShowInviteModal(true)
  }

  const isViewer = membership?.role === 'viewer'
  const cardClassName = cx(
    'min-h-[153.1px] overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition-colors dark:border-slate-800/60 dark:bg-slate-800/25',
    {
      'cursor-pointer hover:bg-gray-200/70 dark:hover:bg-slate-800/60':
        !isViewer,
    },
  )

  const cardContent = (
    <>
      <div className='px-4 py-4'>
        <div className='flex items-center justify-between'>
          <Text as='p' size='lg' weight='semibold' truncate>
            {name}
          </Text>

          {isViewer ? null : (
            <div
              aria-label={`${t('project.settings.settings')} ${name}`}
              className='rounded-md border border-transparent p-1.5 text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 dark:hover:text-slate-300'
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
          isLoading={isAccepting}
        />
      ) : null}
    </>
  )

  if (isViewer) {
    return (
      <div onClick={onElementClick} className={cardClassName}>
        {cardContent}
      </div>
    )
  }

  return (
    <Link
      to={_replace(routes.organisation, ':id', organisation.id)}
      onClick={onElementClick}
      className={cardClassName}
    >
      {cardContent}
    </Link>
  )
}
