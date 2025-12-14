import cx from 'clsx'
import _find from 'lodash/find'
import _isNumber from 'lodash/isNumber'
import _map from 'lodash/map'
import _replace from 'lodash/replace'
import _round from 'lodash/round'
import _size from 'lodash/size'
import { Settings2Icon, PinIcon, ChevronUpIcon, ChevronDownIcon } from 'lucide-react'
import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { acceptProjectShare, pinProject, unpinProject } from '~/api'
import useFeatureFlag from '~/hooks/useFeatureFlag'
import { OverallObject, Project } from '~/lib/models/Project'
import { FeatureFlag } from '~/lib/models/User'
import { useAuth } from '~/providers/AuthProvider'
import { Badge, BadgeProps } from '~/ui/Badge'
import Spin from '~/ui/icons/Spin'
import Modal from '~/ui/Modal'
import { Text } from '~/ui/Text'
import { nFormatter, calculateRelativePercentage } from '~/utils/generic'
import routes from '~/utils/routes'

import Sparkline from './Sparkline'
import { DASHBOARD_TABS } from './Tabs'

// Detect if device supports hover (i.e., not a touch-only device)
const useIsTouchDevice = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(hover: none)').matches
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: none)')
    const handler = (e: MediaQueryListEvent) => setIsTouchDevice(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return isTouchDevice
}

interface ProjectCardProps {
  live?: string | number | null
  overallStats?: OverallObject
  project: Project
  activePeriod: string
  activeTab: (typeof DASHBOARD_TABS)[number]['id']
  viewMode: 'grid' | 'list'
  refetchProjects: () => Promise<void>
}

interface MiniCardProps {
  labelTKey: string
  total?: number | string | null
  percChange?: number
  hasData?: boolean
}

const MiniCard = ({ labelTKey, total, percChange, hasData }: MiniCardProps) => {
  const { t } = useTranslation('common')
  const statsDidGrowUp = percChange ? percChange >= 0 : false
  const isLoading = total === null

  return (
    <div>
      <Text as='p' size='sm' colour='muted'>
        {t(labelTKey)}
      </Text>

      <div className='flex font-bold'>
        {isLoading ? (
          <Spin className='mt-2 ml-0!' />
        ) : !hasData || total === 'N/A' ? (
          <div className='flex items-baseline gap-1'>
            <Text as='p' weight='bold' size='sm' colour='muted'>
              —
            </Text>
            <Text as='span' size='xs' colour='muted' className='font-normal'>
              {t('dashboard.noData')}
            </Text>
          </div>
        ) : (
          <>
            <Text as='p' weight='bold' size='base' colour='secondary'>
              {_isNumber(total) ? nFormatter(total) : total}
            </Text>
            {_isNumber(percChange) && percChange !== 0 ? (
              <Text
                as='p'
                size='xs'
                weight='medium'
                colour={statsDidGrowUp ? 'success' : 'muted'}
                className='-mt-3 flex items-center'
              >
                {statsDidGrowUp ? (
                  <>
                    <ChevronUpIcon className='size-3.5 shrink-0 text-green-500' />
                    <span className='sr-only'>{t('dashboard.inc')}</span>
                  </>
                ) : (
                  <>
                    <ChevronDownIcon className='size-3.5 shrink-0 text-slate-500 dark:text-slate-400' />
                    <span className='sr-only'>{t('dashboard.dec')}</span>
                  </>
                )}
                {nFormatter(percChange)}%
              </Text>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

export const ProjectCard = ({
  live,
  project,
  overallStats,
  activePeriod,
  activeTab,
  viewMode,
  refetchProjects,
}: ProjectCardProps) => {
  const { t } = useTranslation('common')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const isHostnameNavigationEnabled = useFeatureFlag(FeatureFlag['dashboard-hostname-cards'])
  const showPeriodSelector = useFeatureFlag(FeatureFlag['dashboard-period-selector'])

  const { user, mergeUser } = useAuth()
  const isTouchDevice = useIsTouchDevice()

  const shareId = useMemo(
    () => _find(project.share, (item) => item.user?.id === user?.id)?.id,
    [project.share, user?.id],
  )

  const { id, name, public: isPublic, active, isTransferring, share, organisation, role, isPinned } = project
  const [isPinning, setIsPinning] = useState(false)
  const [localIsPinned, setLocalIsPinned] = useState(isPinned)

  // Sync local state with prop
  useEffect(() => {
    setLocalIsPinned(isPinned)
  }, [isPinned])

  const handlePinToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (isPinning) return

      setIsPinning(true)
      // Optimistically update local state
      const newPinnedState = !localIsPinned
      setLocalIsPinned(newPinnedState)

      try {
        if (!newPinnedState) {
          await unpinProject(id)
          toast.success(t('dashboard.unpinned'))
        } else {
          await pinProject(id)
          toast.success(t('dashboard.pinned'))
        }
        // Silently refetch projects in background - don't await
        refetchProjects()
      } catch (reason: any) {
        // Revert on error
        setLocalIsPinned(!newPinnedState)
        console.error('[ERROR] Error while toggling pin:', reason)
        toast.error(t('apiNotifications.somethingWentWrong'))
      } finally {
        setIsPinning(false)
      }
    },
    [id, localIsPinned, isPinning, refetchProjects, t],
  )

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
  }, [t, active, isTransferring, isPublic, organisation, share, project.isAccessConfirmed, project.role, shareId])

  const onAccept = async () => {
    try {
      if (!shareId) {
        throw new Error('Project share not found')
      }

      await acceptProjectShare(shareId)

      mergeUser({
        sharedProjects: user?.sharedProjects?.map((item) => {
          if (item.id === shareId) {
            return { ...item, isAccessConfirmed: true }
          }

          return item
        }),
      })

      await refetchProjects()

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

  // Determine if action buttons should always be visible
  // Show on touch devices, or when project is pinned
  const alwaysShowActions = isTouchDevice || localIsPinned

  return (
    <Link
      to={{
        pathname: _replace(routes.project, ':id', id),
        search: searchParams,
      }}
      onClick={onElementClick}
      className={cx(
        'group relative cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition-colors hover:bg-gray-200/70 dark:border-slate-800/25 dark:bg-slate-800/70 dark:hover:bg-slate-700/60',
        viewMode === 'list' ? 'flex items-center justify-between px-6 py-4' : 'min-h-[153.1px]',
      )}
    >
      {/* Background sparkline chart */}
      {viewMode === 'grid' && overallStats?.chart ? (
        <div className='pointer-events-none absolute inset-x-0 bottom-0 z-0 opacity-50'>
          <Sparkline chart={overallStats.chart} className='w-full' />
        </div>
      ) : null}
      <div className={cx('relative z-10 flex flex-col', viewMode === 'list' ? 'flex-1' : 'px-4 py-4')}>
        <div className={cx('flex items-center', viewMode === 'grid' ? 'justify-between' : 'justify-start gap-1')}>
          <Text as='p' size='lg' weight='semibold' truncate>
            {name}
          </Text>

          <div
            className={cx(
              'flex shrink-0 items-center transition-opacity',
              alwaysShowActions ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            )}
          >
            <button
              type='button'
              className='rounded-md border border-transparent p-1.5 text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:border-slate-700/80 dark:hover:bg-slate-800 dark:hover:text-slate-300'
              onClick={handlePinToggle}
              disabled={isPinning}
              aria-label={localIsPinned ? t('dashboard.unpin') : t('dashboard.pin')}
            >
              <PinIcon
                className={cx('size-5 transition-transform', localIsPinned && 'rotate-[30deg]')}
                strokeWidth={1.5}
              />
            </button>
            {project.isAccessConfirmed && role !== 'viewer' ? (
              <Link
                className='rounded-md border border-transparent p-1.5 text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:border-slate-700/80 dark:hover:bg-slate-800 dark:hover:text-slate-300'
                onClick={(e) => e.stopPropagation()}
                to={_replace(routes.project_settings, ':id', id)}
                aria-label={`${t('project.settings.settings')} ${name}`}
              >
                <Settings2Icon className='size-5' strokeWidth={1.5} />
              </Link>
            ) : null}
          </div>
        </div>
        <div className='mt-1 flex shrink-0 flex-wrap gap-2'>
          {badges.length > 0 ? (
            badges.map((badge) => <Badge key={badge.label as string} {...badge} />)
          ) : (
            <Badge label='I' colour='slate' className='invisible' />
          )}
        </div>
      </div>
      <div className={cx('relative z-10 flex shrink-0 gap-5', viewMode === 'list' ? 'ml-4' : 'mt-4 px-4 pb-4')}>
        {isHostnameNavigationEnabled ? (
          <MiniCard
            labelTKey='dashboard.pageviews'
            // @ts-expect-error
            total={project?.trafficStats?.visits}
            percChange={
              activeTab === 'performance'
                ? // @ts-expect-error
                  _round(project?.trafficStats?.percentageChange, 2)
                : undefined
            }
            hasData={project?.isDataExists || project?.isErrorDataExists || project?.isCaptchaDataExists}
          />
        ) : (
          <MiniCard
            labelTKey='dashboard.pageviews'
            total={live === 'N/A' ? 'N/A' : (overallStats?.current.all ?? null)}
            percChange={
              live === 'N/A'
                ? 0
                : calculateRelativePercentage(overallStats?.previous.all ?? 0, overallStats?.current.all ?? 0)
            }
            hasData={project?.isDataExists || project?.isErrorDataExists || project?.isCaptchaDataExists}
          />
        )}
        <MiniCard
          labelTKey='dashboard.liveVisitors'
          total={live}
          hasData={project?.isDataExists || project?.isErrorDataExists || project?.isCaptchaDataExists}
        />
      </div>
      {project.role !== 'owner' && !project.isAccessConfirmed ? (
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
