import React, { useState, useMemo } from 'react'
import { Link } from '@remix-run/react'
import { toast } from 'sonner'
import cx from 'clsx'
import _size from 'lodash/size'
import _isNumber from 'lodash/isNumber'
import _replace from 'lodash/replace'
import _find from 'lodash/find'
import { useTranslation } from 'react-i18next'
import { AdjustmentsVerticalIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid'

import Modal from 'ui/Modal'
import { Badge, BadgeProps } from 'ui/Badge'
import routes from 'utils/routes'
import { nFormatter, calculateRelativePercentage } from 'utils/generic'

import { acceptProjectShare } from 'api'

import { OverallObject, Project } from 'lib/models/Project'
import { useSelector } from 'react-redux'
import { StateType, useAppDispatch } from 'lib/store'
import { authActions } from 'lib/reducers/auth'

interface ProjectCardProps {
  live?: string | number
  overallStats?: OverallObject
  project: Project
}

interface MiniCardProps {
  labelTKey: string
  total?: number | string
  percChange?: number
}

const MiniCard = ({ labelTKey, total = 0, percChange }: MiniCardProps) => {
  const { t } = useTranslation('common')
  const statsDidGrowUp = percChange ? percChange >= 0 : false

  return (
    <div>
      <p className='text-sm text-gray-500 dark:text-gray-300'>{t(labelTKey)}</p>

      <div className='flex font-bold'>
        <p className='text-xl text-gray-700 dark:text-gray-100'>{_isNumber(total) ? nFormatter(total) : total}</p>
        {_isNumber(percChange) && (
          <p
            className={cx('flex items-center text-xs', {
              'text-green-600': statsDidGrowUp,
              'text-red-600': !statsDidGrowUp,
            })}
          >
            {statsDidGrowUp ? (
              <>
                <ChevronUpIcon className='h-4 w-4 flex-shrink-0 self-center text-green-500' />
                <span className='sr-only'>{t('dashboard.inc')}</span>
              </>
            ) : (
              <>
                <ChevronDownIcon className='h-4 w-4 flex-shrink-0 self-center text-red-500' />
                <span className='sr-only'>{t('dashboard.dec')}</span>
              </>
            )}
            {nFormatter(percChange)}%
          </p>
        )}
      </div>
    </div>
  )
}

export const ProjectCard = ({ live = 'N/A', project, overallStats }: ProjectCardProps) => {
  const { t } = useTranslation('common')
  const [showInviteModal, setShowInviteModal] = useState(false)

  const { user } = useSelector((state: StateType) => state.auth)

  const dispatch = useAppDispatch()

  const shareId = useMemo(() => _find(project.share, (item) => item.user.id === user.id)?.id, [project.share, user.id])

  const { id, name, public: isPublic, active, isTransferring, share, organisation, role } = project

  const badges = useMemo(() => {
    const list: BadgeProps[] = []

    if (!active) {
      list.push({ colour: 'red', label: t('dashboard.disabled') })
    }

    if (organisation) {
      list.push({ colour: 'sky', label: organisation.name })
    }

    if (project.role !== 'owner' && shareId) {
      list.push({ colour: 'indigo', label: t('dashboard.shared') })
    }

    if (project.role !== 'owner' && !project.isAccessConfirmed) {
      list.push({ colour: 'yellow', label: t('common.pending') })
    }

    if (project.isCaptchaProject) {
      list.push({ colour: 'indigo', label: t('dashboard.captcha') })
    }

    if (isTransferring) {
      list.push({ colour: 'indigo', label: t('common.transferring') })
    }

    if (isPublic) {
      list.push({ colour: 'green', label: t('dashboard.public') })
    }

    const members = _size(share)

    if (members > 0) {
      list.push({ colour: 'slate', label: t('common.xMembers', { number: members + 1 }) })
    }

    return list
  }, [
    t,
    active,
    isTransferring,
    isPublic,
    organisation,
    share,
    project.isAccessConfirmed,
    project.role,
    project.isCaptchaProject,
    shareId,
  ])

  const onAccept = async () => {
    try {
      if (!shareId) {
        throw new Error('Project share not found')
      }

      await acceptProjectShare(shareId)

      dispatch(
        authActions.mergeUser({
          sharedProjects: user.sharedProjects?.map((item) => {
            if (item.id === shareId) {
              return { ...item, isAccessConfirmed: true }
            }

            return item
          }),
        }),
      )

      toast.success(t('apiNotifications.acceptInvitation'))
    } catch (reason: any) {
      console.error(`[ERROR] Error while accepting project invitation: ${reason}`)
      toast.error(t('apiNotifications.acceptInvitationError'))
    }
  }

  const onElementClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (project.role === 'owner' || project.isAccessConfirmed) {
      return
    }

    e.preventDefault()
    setShowInviteModal(true)
  }

  return (
    <Link
      to={_replace(project.isCaptchaProject ? routes.captcha : routes.project, ':id', id)}
      onClick={onElementClick}
      className='min-h-[153.1px] cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-slate-800/25 dark:bg-slate-800 dark:hover:bg-slate-700'
    >
      <div className='px-4 py-4'>
        <div className='flex items-center justify-between'>
          <p className='truncate text-lg font-semibold text-slate-900 dark:text-gray-50'>{name}</p>

          <div className='flex items-center gap-2' onClick={(e) => e.stopPropagation()}>
            {role !== 'viewer' && (
              <AdjustmentsVerticalIcon
                className='h-6 w-6 text-gray-800 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-500'
                aria-label={`${t('project.settings.settings')} ${name}`}
              />
            )}
            <a
              href={_replace(project.isCaptchaProject ? routes.captcha : routes.project, ':id', id)}
              aria-label='name (opens in a new tab)'
              target='_blank'
              rel='noopener noreferrer'
            >
              <ArrowTopRightOnSquareIcon className='h-6 w-6 text-gray-800 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-500' />
            </a>
          </div>
        </div>
        <div className='mt-1 flex flex-shrink-0 flex-wrap gap-2'>
          {badges.length > 0 ? (
            badges.map((badge) => <Badge key={badge.label} {...badge} />)
          ) : (
            <Badge label='I' colour='slate' className='invisible' />
          )}
        </div>
        <div className='mt-4 flex flex-shrink-0 gap-5'>
          {overallStats ? (
            <MiniCard
              labelTKey={project.isCaptchaProject ? 'dashboard.captchaEvents' : 'dashboard.pageviews'}
              total={overallStats.current.all}
              percChange={calculateRelativePercentage(overallStats.previous.all, overallStats.current.all)}
            />
          ) : null}
          {project.isAnalyticsProject && <MiniCard labelTKey='dashboard.liveVisitors' total={live} />}
        </div>
      </div>
      {project.role !== 'owner' && !project.isAccessConfirmed && (
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
      )}
    </Link>
  )
}
