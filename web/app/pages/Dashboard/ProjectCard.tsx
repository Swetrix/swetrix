import React, { useState, useMemo } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import cx from 'clsx'
import _size from 'lodash/size'
import _round from 'lodash/round'
import _isNumber from 'lodash/isNumber'
import _replace from 'lodash/replace'
import _find from 'lodash/find'
import _map from 'lodash/map'
import { useTranslation } from 'react-i18next'
import { AdjustmentsVerticalIcon } from '@heroicons/react/24/outline'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid'

import Modal from '~/ui/Modal'
import { Badge, BadgeProps } from '~/ui/Badge'
import routes from '~/utils/routes'
import { nFormatter, calculateRelativePercentage } from '~/utils/generic'

import { acceptProjectShare } from '~/api'

import { OverallObject, Project } from '~/lib/models/Project'
import { useSelector } from 'react-redux'
import { StateType, useAppDispatch } from '~/lib/store'
import { authActions } from '~/lib/reducers/auth'
import Spin from '~/ui/icons/Spin'
import useFeatureFlag from '~/hooks/useFeatureFlag'
import { FeatureFlag } from '~/lib/models/User'
import { DASHBOARD_TABS } from './Tabs'

interface ProjectCardProps {
  live?: string | number | null
  overallStats?: OverallObject
  project: Project
  activePeriod: string
  activeTab: (typeof DASHBOARD_TABS)[number]['id']
  viewMode: 'grid' | 'list'
}

interface MiniCardProps {
  labelTKey: string
  total?: number | string | null
  percChange?: number
}

const MiniCard = ({ labelTKey, total, percChange }: MiniCardProps) => {
  const { t } = useTranslation('common')
  const statsDidGrowUp = percChange ? percChange >= 0 : false

  return (
    <div className='font-mono'>
      <p className='text-sm text-gray-500 dark:text-gray-300'>{t(labelTKey)}</p>

      <div className='flex font-bold'>
        {total === null ? (
          <Spin className='mt-2 !ml-0' />
        ) : (
          <>
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
                    <ChevronUpIcon className='h-4 w-4 shrink-0 self-center text-green-500' />
                    <span className='sr-only'>{t('dashboard.inc')}</span>
                  </>
                ) : (
                  <>
                    <ChevronDownIcon className='h-4 w-4 shrink-0 self-center text-red-500' />
                    <span className='sr-only'>{t('dashboard.dec')}</span>
                  </>
                )}
                {nFormatter(percChange)}%
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export const ProjectCard = ({ live, project, overallStats, activePeriod, activeTab, viewMode }: ProjectCardProps) => {
  const { t } = useTranslation('common')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const isHostnameNavigationEnabled = useFeatureFlag(FeatureFlag['dashboard-hostname-cards'])
  const showPeriodSelector = useFeatureFlag(FeatureFlag['dashboard-period-selector'])

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

  const searchParams = useMemo(() => {
    const params = new URLSearchParams()

    if (showPeriodSelector) {
      params.set('period', activePeriod)
    }

    if (isHostnameNavigationEnabled) {
      params.set('host', encodeURIComponent(project.name))
    }

    return params.toString()
  }, [showPeriodSelector, activePeriod, isHostnameNavigationEnabled, project.name])

  return (
    <Link
      to={{
        pathname: _replace(project.isCaptchaProject ? routes.captcha : routes.project, ':id', id),
        search: searchParams,
      }}
      onClick={onElementClick}
      className={cx(
        'cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-slate-800/25 dark:bg-slate-800 dark:hover:bg-slate-700',
        viewMode === 'list' ? 'flex items-center justify-between px-6 py-4' : 'min-h-[153.1px]',
      )}
    >
      <div className={cx('flex flex-col', viewMode === 'list' ? 'flex-1' : 'px-4 py-4')}>
        <div className={cx('flex items-center', viewMode === 'grid' ? 'justify-between' : 'justify-start gap-1')}>
          <p className='truncate font-mono text-lg font-semibold text-slate-900 dark:text-gray-50'>{name}</p>

          {role !== 'viewer' && (
            <Link onClick={(e) => e.stopPropagation()} to={_replace(routes.project_settings, ':id', id)}>
              <AdjustmentsVerticalIcon
                className='size-6 text-gray-800 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-500'
                aria-label={`${t('project.settings.settings')} ${name}`}
              />
            </Link>
          )}
        </div>
        <div className='mt-1 flex shrink-0 flex-wrap gap-2'>
          {badges.length > 0 ? (
            badges.map((badge) => <Badge key={badge.label} {...badge} />)
          ) : (
            <Badge label='I' colour='slate' className='invisible' />
          )}
        </div>
      </div>
      <div className={cx('flex shrink-0 gap-5', viewMode === 'list' ? 'ml-4' : 'mt-4 px-4 pb-4')}>
        {isHostnameNavigationEnabled ? (
          <MiniCard
            labelTKey={project.isCaptchaProject ? 'dashboard.captchaEvents' : 'dashboard.pageviews'}
            // @ts-expect-error
            total={project?.trafficStats?.visits}
            percChange={
              activeTab === 'performance'
                ? // @ts-expect-error
                  _round(project?.trafficStats?.percentageChange, 2)
                : undefined
            }
          />
        ) : (
          <MiniCard
            labelTKey={project.isCaptchaProject ? 'dashboard.captchaEvents' : 'dashboard.pageviews'}
            total={live === 'N/A' ? 'N/A' : (overallStats?.current.all ?? null)}
            percChange={
              live === 'N/A'
                ? 0
                : calculateRelativePercentage(overallStats?.previous.all ?? 0, overallStats?.current.all ?? 0)
            }
          />
        )}
        {project.isAnalyticsProject ? <MiniCard labelTKey='dashboard.liveVisitors' total={live} /> : null}
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

interface ProjectCardSkeletonProps {
  viewMode: 'grid' | 'list'
}

export const ProjectCardSkeleton = ({ viewMode }: ProjectCardSkeletonProps) => {
  return (
    <div
      className={cx(
        'grid gap-x-6 gap-y-3',
        viewMode === 'grid' ? 'grid-cols-1 lg:grid-cols-3 lg:gap-y-6' : 'grid-cols-1 gap-y-3',
      )}
    >
      {_map(Array(viewMode === 'grid' ? 12 : 8), (_, index) => (
        <div
          key={index}
          className={cx(
            'animate-pulse cursor-wait overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-slate-800/25 dark:bg-slate-800',
            viewMode === 'list' ? 'flex items-center justify-between px-6 py-4' : 'min-h-[153.1px]',
          )}
        >
          <div className={cx('flex flex-col', viewMode === 'list' ? 'flex-1' : 'px-4 py-4')}>
            <div className={cx('flex items-center', viewMode === 'grid' ? 'justify-between' : 'justify-start gap-1')}>
              <div className='h-6 w-3/4 max-w-80 rounded-sm bg-gray-200 dark:bg-slate-700' />
              <div className='size-6 rounded-[3px] bg-gray-200 dark:bg-slate-700' />
            </div>
            <div className='mt-1 flex shrink-0 flex-wrap gap-2'>
              <div className='h-6 w-16 rounded-sm bg-gray-200 dark:bg-slate-700' />
              <div className='h-6 w-16 rounded-sm bg-gray-200 dark:bg-slate-700' />
              <div className='h-6 w-16 rounded-sm bg-gray-200 dark:bg-slate-700' />
            </div>
          </div>
          <div className={cx('flex shrink-0 gap-5', viewMode === 'list' ? 'ml-4' : 'mt-[1.375rem] px-4 pb-4')}>
            <div className='h-10 w-24 rounded-sm bg-gray-200 dark:bg-slate-700' />
            <div className='h-10 w-24 rounded-sm bg-gray-200 dark:bg-slate-700' />
          </div>
        </div>
      ))}
    </div>
  )
}
