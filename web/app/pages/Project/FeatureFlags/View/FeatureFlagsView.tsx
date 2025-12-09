import { XCircleIcon } from '@heroicons/react/24/outline'
import cx from 'clsx'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import {
  FlagIcon,
  Trash2Icon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
  PercentIcon,
  UsersIcon,
  ActivityIcon,
  ChevronDownIcon,
  DownloadIcon,
  CheckIcon,
  XIcon,
} from 'lucide-react'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { toast } from 'sonner'

import {
  deleteFeatureFlag as deleteFeatureFlagApi,
  getProjectFeatureFlags,
  getFeatureFlagStats,
  getFeatureFlagProfiles,
  DEFAULT_FEATURE_FLAGS_TAKE,
  DEFAULT_FEATURE_FLAG_PROFILES_TAKE,
  type ProjectFeatureFlag,
  type FeatureFlagStats,
  type FeatureFlagProfile,
} from '~/api'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { Badge } from '~/ui/Badge'
import Button from '~/ui/Button'
import Spin from '~/ui/icons/Spin'
import Loader from '~/ui/Loader'
import LoadingBar from '~/ui/LoadingBar'
import Modal from '~/ui/Modal'
import Pagination from '~/ui/Pagination'
import { Switch } from '~/ui/Switch'
import { Text } from '~/ui/Text'
import { nFormatter } from '~/utils/generic'
import { getProfileDisplayName, ProfileAvatar } from '~/utils/profileAvatars'
import routes from '~/utils/routes'

import FeatureFlagSettingsModal from './FeatureFlagSettingsModal'

dayjs.extend(relativeTime)

interface FeatureFlagProfileRowProps {
  profile: FeatureFlagProfile
  timeFormat: '12-hour' | '24-hour'
}

const FeatureFlagProfileRow = ({ profile, timeFormat }: FeatureFlagProfileRowProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const location = useLocation()

  const displayName = useMemo(() => {
    return getProfileDisplayName(profile.profileId, profile.isIdentified)
  }, [profile.profileId, profile.isIdentified])

  const lastEvaluatedText = useMemo(() => {
    return dayjs(profile.lastEvaluated)
      .toDate()
      .toLocaleDateString(language, {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: timeFormat === '12-hour' ? 'h12' : 'h23',
      })
  }, [profile.lastEvaluated, language, timeFormat])

  const params = new URLSearchParams(location.search)
  params.set('tab', 'profiles')
  params.set('profileId', profile.profileId)

  return (
    <Link to={{ search: params.toString() }}>
      <li className='relative mb-2 flex cursor-pointer items-center justify-between gap-x-4 overflow-hidden rounded-lg border border-gray-200 bg-white px-3 py-2.5 transition-colors hover:bg-gray-100 dark:border-slate-700/50 dark:bg-slate-800/50 dark:hover:bg-slate-700/50'>
        <div className='flex min-w-0 items-center gap-x-3'>
          {/* Avatar */}
          <ProfileAvatar profileId={profile.profileId} size={32} className='shrink-0' />

          <div className='min-w-0 flex-auto'>
            <p className='flex items-center text-xs leading-5 font-semibold text-gray-900 dark:text-gray-50'>
              <span className='truncate'>{displayName}</span>
              {profile.isIdentified ? (
                <Badge label={t('project.identified')} colour='indigo' className='ml-1.5' />
              ) : null}
            </p>
            <p className='mt-0.5 text-xs text-gray-500 dark:text-gray-400'>
              {t('featureFlags.xEvaluations', { count: profile.evaluationCount })} · {lastEvaluatedText}
            </p>
          </div>
        </div>
        <div className='flex shrink-0 items-center gap-x-2'>
          {/* Result indicator */}
          <span
            className={cx(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
              profile.lastResult
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
            )}
          >
            {profile.lastResult ? (
              <CheckIcon className='mr-1 size-3' strokeWidth={2} />
            ) : (
              <XIcon className='mr-1 size-3' strokeWidth={2} />
            )}
            {profile.lastResult ? 'true' : 'false'}
          </span>
        </div>
      </li>
    </Link>
  )
}

interface FeatureFlagRowProps {
  flag: ProjectFeatureFlag
  stats: FeatureFlagStats | null
  statsLoading: boolean
  isExpanded: boolean
  profiles: FeatureFlagProfile[]
  profilesLoading: boolean
  canLoadMoreProfiles: boolean
  resultFilter: boolean
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onToggle: (id: string, enabled: boolean) => void
  onToggleExpand: (id: string) => void
  onLoadMoreProfiles: (id: string) => void
  onResultFilterChange: (id: string, filter: boolean) => void
  timeFormat: '12-hour' | '24-hour'
}

const FeatureFlagRow = ({
  flag,
  stats,
  statsLoading,
  isExpanded,
  profiles,
  profilesLoading,
  canLoadMoreProfiles,
  resultFilter,
  onDelete,
  onEdit,
  onToggle,
  onToggleExpand,
  onLoadMoreProfiles,
  onResultFilterChange,
  timeFormat,
}: FeatureFlagRowProps) => {
  const { t } = useTranslation()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const targetingRulesCount = flag.targetingRules?.length || 0

  return (
    <>
      <li className='relative mb-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition-colors dark:border-slate-800/25 dark:bg-slate-800/70'>
        {/* Main row - clickable to expand */}
        <div
          onClick={() => onToggleExpand(flag.id)}
          className='flex cursor-pointer justify-between gap-x-6 px-4 py-4 transition-colors hover:bg-gray-200/70 sm:px-6 dark:hover:bg-slate-700/60'
        >
          <div className='flex min-w-0 gap-x-4'>
            <div className='min-w-0 flex-auto'>
              <div className='flex items-center gap-x-2'>
                <Text as='p' weight='semibold' truncate className='flex items-center gap-x-1.5'>
                  <FlagIcon className='size-4 text-indigo-500' strokeWidth={1.5} />
                  <span>{flag.key}</span>
                </Text>
                {/* Status badge */}
                <span
                  className={cx(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                    flag.enabled
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
                  )}
                >
                  {flag.enabled ? t('featureFlags.enabled') : t('featureFlags.disabled')}
                </span>
                {/* Flag type badge */}
                <span className='inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'>
                  {flag.flagType === 'rollout' ? (
                    <>
                      <PercentIcon className='size-3' />
                      {flag.rolloutPercentage}%
                    </>
                  ) : (
                    <>
                      <ToggleRightIcon className='size-3' />
                      {t('featureFlags.boolean')}
                    </>
                  )}
                </span>
              </div>
              {flag.description ? (
                <Text className='mt-1' as='p' size='sm' colour='secondary'>
                  {flag.description}
                </Text>
              ) : null}
              {targetingRulesCount > 0 ? (
                <Text className='mt-1' as='p' size='xs' colour='muted'>
                  {t('featureFlags.targetingRulesCount', { count: targetingRulesCount })}
                </Text>
              ) : null}
              {/* Mobile stats */}
              <div className='mt-2 flex h-9 items-center gap-x-3 text-xs leading-5 text-gray-500 sm:hidden dark:text-gray-300'>
                {statsLoading ? (
                  <div className='flex size-9 items-center justify-center'>
                    <Spin className='m-0 size-5' />
                  </div>
                ) : stats ? (
                  <>
                    <span className='flex items-center gap-1'>
                      <ActivityIcon className='size-3' />
                      {nFormatter(stats.evaluations, 1)} {t('featureFlags.evaluations').toLowerCase()}
                    </span>
                    <span className='flex items-center gap-1'>
                      <UsersIcon className='size-3' />
                      {nFormatter(stats.profileCount, 1)}
                    </span>
                  </>
                ) : (
                  <Text as='p' size='xs' colour='muted'>
                    {t('featureFlags.noStats')}
                  </Text>
                )}
              </div>
            </div>
          </div>
          <div className='flex shrink-0 items-center gap-x-4'>
            {/* Desktop stats */}
            <div className='hidden h-11 sm:flex sm:items-center sm:gap-x-4'>
              {statsLoading ? (
                <div className='flex size-11 items-center justify-center'>
                  <Spin className='m-0 size-5' />
                </div>
              ) : stats ? (
                <>
                  <div className='text-right'>
                    <Text as='p' size='sm' weight='semibold'>
                      {nFormatter(stats.evaluations, 1)}
                    </Text>
                    <Text as='p' size='xs' colour='muted'>
                      {t('featureFlags.evaluations')}
                    </Text>
                  </div>
                  <div className='text-right'>
                    <Text as='p' size='sm' weight='semibold'>
                      {nFormatter(stats.profileCount, 1)}
                    </Text>
                    <Text as='p' size='xs' colour='muted'>
                      {t('featureFlags.users')}
                    </Text>
                  </div>
                  <div className='text-right'>
                    <Text as='p' size='sm' weight='semibold' className='text-green-600 dark:text-green-400'>
                      {stats.truePercentage}%
                    </Text>
                    <Text as='p' size='xs' colour='muted'>
                      {t('featureFlags.trueRate')}
                    </Text>
                  </div>
                </>
              ) : (
                <Text as='p' size='sm' colour='muted'>
                  {t('featureFlags.noStats')}
                </Text>
              )}
            </div>
            {/* Action buttons */}
            <div className='flex items-center gap-1'>
              <button
                type='button'
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onToggle(flag.id, !flag.enabled)
                }}
                aria-label={flag.enabled ? t('featureFlags.disable') : t('featureFlags.enable')}
                className={cx(
                  'rounded-md border border-transparent p-1.5 transition-colors',
                  flag.enabled
                    ? 'text-green-600 hover:border-green-300 hover:bg-green-50 dark:text-green-400 hover:dark:border-green-700/80 dark:hover:bg-green-900/30'
                    : 'text-gray-400 hover:border-gray-300 hover:bg-gray-50 dark:text-gray-500 hover:dark:border-slate-700/80 dark:hover:bg-slate-800',
                )}
              >
                {flag.enabled ? (
                  <ToggleRightIcon className='size-5' strokeWidth={1.5} />
                ) : (
                  <ToggleLeftIcon className='size-5' strokeWidth={1.5} />
                )}
              </button>
              <button
                type='button'
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onEdit(flag.id)
                }}
                aria-label={t('common.edit')}
                className='rounded-md border border-transparent p-1.5 text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 dark:hover:text-slate-300'
              >
                <PencilIcon className='size-4' strokeWidth={1.5} />
              </button>
              <button
                type='button'
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowDeleteModal(true)
                }}
                aria-label={t('common.delete')}
                className='rounded-md border border-transparent p-1.5 text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 dark:hover:text-slate-300'
              >
                <Trash2Icon className='size-4' strokeWidth={1.5} />
              </button>
              <ChevronDownIcon
                className={cx('size-5 text-gray-500 transition-transform dark:text-gray-400', {
                  'rotate-180': isExpanded,
                })}
                strokeWidth={1.5}
              />
            </div>
          </div>
        </div>

        {/* Expanded profiles section */}
        {isExpanded ? (
          <div className='border-t border-gray-200 px-4 py-4 sm:px-6 dark:border-slate-700'>
            {/* Result filter toggle */}
            <div className='mb-3 flex items-center gap-2'>
              <Switch checked={resultFilter} onChange={(checked) => onResultFilterChange(flag.id, checked)} />
              <span className='text-xs text-gray-500 dark:text-gray-400'>{t('featureFlags.served')}</span>
            </div>

            {profilesLoading && profiles.length === 0 ? (
              <div className='flex h-[120px] items-center justify-center'>
                <Spin className='size-8' />
              </div>
            ) : profiles.length === 0 ? (
              <div className='flex h-[120px] items-center justify-center'>
                <Text as='p' colour='muted'>
                  {t('featureFlags.noProfiles')}
                </Text>
              </div>
            ) : (
              <>
                <ul>
                  {_map(profiles, (profile) => (
                    <FeatureFlagProfileRow key={profile.profileId} profile={profile} timeFormat={timeFormat} />
                  ))}
                </ul>
                {canLoadMoreProfiles ? (
                  <button
                    type='button'
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onLoadMoreProfiles(flag.id)
                    }}
                    disabled={profilesLoading}
                    className={cx(
                      'relative mx-auto mt-2 flex items-center rounded-md border border-transparent p-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200',
                      {
                        'cursor-not-allowed opacity-50': profilesLoading,
                      },
                    )}
                  >
                    {profilesLoading ? (
                      <Spin className='mr-2 size-5' />
                    ) : (
                      <DownloadIcon className='mr-2 h-5 w-5' strokeWidth={1.5} />
                    )}
                    {t('featureFlags.loadMore')}
                  </button>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </li>
      <Modal
        onClose={() => setShowDeleteModal(false)}
        onSubmit={() => {
          onDelete(flag.id)
          setShowDeleteModal(false)
        }}
        submitText={t('featureFlags.delete')}
        closeText={t('common.close')}
        title={t('featureFlags.deleteConfirmTitle')}
        message={t('featureFlags.deleteConfirmMessage')}
        submitType='danger'
        type='error'
        isOpened={showDeleteModal}
      />
    </>
  )
}

interface FeatureFlagsViewProps {
  period: string
  from?: string
  to?: string
  timezone?: string
}

const FeatureFlagsView = ({ period, from = '', to = '', timezone }: FeatureFlagsViewProps) => {
  const { id } = useCurrentProject()
  const { featureFlagsRefreshTrigger, timeFormat } = useViewProjectContext()
  const { t } = useTranslation()

  const [isLoading, setIsLoading] = useState<boolean | null>(null)
  const isLoadingRef = useRef(false)
  const isMountedRef = useRef(true)
  const [total, setTotal] = useState(0)
  const [flags, setFlags] = useState<ProjectFeatureFlag[]>([])
  const [flagStats, setFlagStats] = useState<Record<string, FeatureFlagStats | null>>({})
  const [statsLoading, setStatsLoading] = useState<Record<string, boolean>>({})
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')

  // Expanded flag state
  const [expandedFlagId, setExpandedFlagId] = useState<string | null>(null)
  const [flagProfiles, setFlagProfiles] = useState<Record<string, FeatureFlagProfile[]>>({})
  const [flagProfilesTotal, setFlagProfilesTotal] = useState<Record<string, number>>({})
  const [profilesLoading, setProfilesLoading] = useState<Record<string, boolean>>({})
  const [flagResultFilters, setFlagResultFilters] = useState<Record<string, boolean>>({})

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFlagId, setEditingFlagId] = useState<string | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const pageAmount = Math.ceil(total / DEFAULT_FEATURE_FLAGS_TAKE)

  const filteredFlags = useMemo(() => {
    if (!filterQuery.trim()) return flags
    const query = filterQuery.toLowerCase()
    return flags.filter(
      (flag) =>
        flag.key.toLowerCase().includes(query) || (flag.description && flag.description.toLowerCase().includes(query)),
    )
  }, [flags, filterQuery])

  const loadFlags = async (take: number, skip: number) => {
    if (isLoadingRef.current) {
      return
    }
    isLoadingRef.current = true
    setIsLoading(true)

    try {
      const result = await getProjectFeatureFlags(id, take, skip)
      if (isMountedRef.current) {
        setFlags(result.results)
        setTotal(result.total)
      }
    } catch (reason: any) {
      if (isMountedRef.current) {
        setError(reason?.message || reason?.toString() || 'Unknown error')
      }
    } finally {
      isLoadingRef.current = false
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }

  const loadFlagStats = async (flagId: string) => {
    setStatsLoading((prev) => ({ ...prev, [flagId]: true }))
    try {
      const stats = await getFeatureFlagStats(flagId, period, from, to, timezone)
      if (isMountedRef.current) {
        setFlagStats((prev) => ({ ...prev, [flagId]: stats }))
      }
    } catch (err) {
      console.error('Failed to load flag stats:', err)
      if (isMountedRef.current) {
        setFlagStats((prev) => ({ ...prev, [flagId]: null }))
      }
    } finally {
      if (isMountedRef.current) {
        setStatsLoading((prev) => ({ ...prev, [flagId]: false }))
      }
    }
  }

  const loadFlagProfiles = async (flagId: string, append = false, resultFilter?: boolean) => {
    const currentProfiles = append ? flagProfiles[flagId] || [] : []
    const skip = append ? currentProfiles.length : 0
    const filter = resultFilter ?? flagResultFilters[flagId] ?? true
    const apiFilter = filter ? 'true' : 'false'

    setProfilesLoading((prev) => ({ ...prev, [flagId]: true }))
    try {
      const result = await getFeatureFlagProfiles(
        flagId,
        period,
        from,
        to,
        timezone,
        DEFAULT_FEATURE_FLAG_PROFILES_TAKE,
        skip,
        apiFilter,
      )
      if (isMountedRef.current) {
        setFlagProfiles((prev) => ({
          ...prev,
          [flagId]: append ? [...currentProfiles, ...result.profiles] : result.profiles,
        }))
        setFlagProfilesTotal((prev) => ({ ...prev, [flagId]: result.total }))
      }
    } catch (err) {
      console.error('Failed to load flag profiles:', err)
      if (isMountedRef.current) {
        setFlagProfiles((prev) => ({ ...prev, [flagId]: append ? currentProfiles : [] }))
        setFlagProfilesTotal((prev) => ({ ...prev, [flagId]: 0 }))
      }
    } finally {
      if (isMountedRef.current) {
        setProfilesLoading((prev) => ({ ...prev, [flagId]: false }))
      }
    }
  }

  const handleToggleExpand = async (flagId: string) => {
    if (expandedFlagId === flagId) {
      // Collapse if already expanded
      setExpandedFlagId(null)
    } else {
      // Expand and load profiles if not already loaded
      setExpandedFlagId(flagId)
      if (!flagProfiles[flagId] && !profilesLoading[flagId]) {
        // First try loading with true filter (served)
        setProfilesLoading((prev) => ({ ...prev, [flagId]: true }))
        try {
          const trueResult = await getFeatureFlagProfiles(
            flagId,
            period,
            from,
            to,
            timezone,
            DEFAULT_FEATURE_FLAG_PROFILES_TAKE,
            0,
            'true',
          )

          if (trueResult.total > 0) {
            // Has true results, use them
            if (isMountedRef.current) {
              setFlagProfiles((prev) => ({ ...prev, [flagId]: trueResult.profiles }))
              setFlagProfilesTotal((prev) => ({ ...prev, [flagId]: trueResult.total }))
              setFlagResultFilters((prev) => ({ ...prev, [flagId]: true }))
            }
          } else {
            // No true results, try false
            const falseResult = await getFeatureFlagProfiles(
              flagId,
              period,
              from,
              to,
              timezone,
              DEFAULT_FEATURE_FLAG_PROFILES_TAKE,
              0,
              'false',
            )

            if (isMountedRef.current) {
              if (falseResult.total > 0) {
                // Has false results, use them and set filter to false
                setFlagProfiles((prev) => ({ ...prev, [flagId]: falseResult.profiles }))
                setFlagProfilesTotal((prev) => ({ ...prev, [flagId]: falseResult.total }))
                setFlagResultFilters((prev) => ({ ...prev, [flagId]: false }))
              } else {
                // No results at all, default to true filter with empty
                setFlagProfiles((prev) => ({ ...prev, [flagId]: [] }))
                setFlagProfilesTotal((prev) => ({ ...prev, [flagId]: 0 }))
                setFlagResultFilters((prev) => ({ ...prev, [flagId]: true }))
              }
            }
          }
        } catch (err) {
          console.error('Failed to load flag profiles:', err)
          if (isMountedRef.current) {
            setFlagProfiles((prev) => ({ ...prev, [flagId]: [] }))
            setFlagProfilesTotal((prev) => ({ ...prev, [flagId]: 0 }))
            setFlagResultFilters((prev) => ({ ...prev, [flagId]: true }))
          }
        } finally {
          if (isMountedRef.current) {
            setProfilesLoading((prev) => ({ ...prev, [flagId]: false }))
          }
        }
      }
    }
  }

  const handleLoadMoreProfiles = (flagId: string) => {
    loadFlagProfiles(flagId, true)
  }

  const handleResultFilterChange = (flagId: string, filter: boolean) => {
    setFlagResultFilters((prev) => ({ ...prev, [flagId]: filter }))
    // Reset profiles and reload with new filter
    setFlagProfiles((prev) => ({ ...prev, [flagId]: [] }))
    loadFlagProfiles(flagId, false, filter)
  }

  useEffect(() => {
    loadFlags(DEFAULT_FEATURE_FLAGS_TAKE, (page - 1) * DEFAULT_FEATURE_FLAGS_TAKE)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  // Refresh feature flags data when refresh button is clicked
  useEffect(() => {
    if (featureFlagsRefreshTrigger > 0) {
      loadFlags(DEFAULT_FEATURE_FLAGS_TAKE, (page - 1) * DEFAULT_FEATURE_FLAGS_TAKE)
      // Clear cached stats data to force reload
      setFlagStats({})
      // Refresh profiles for expanded flag
      if (expandedFlagId) {
        setFlagProfiles((prev) => ({ [expandedFlagId]: prev[expandedFlagId] }))
        loadFlagProfiles(expandedFlagId)
      } else {
        setFlagProfiles({})
        setFlagProfilesTotal({})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureFlagsRefreshTrigger])

  useEffect(() => {
    // Load stats for all flags when flags change or date range changes
    flags.forEach((flag) => {
      loadFlagStats(flag.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flags, period, from, to, timezone])

  // Reload profiles when period changes for expanded flag
  useEffect(() => {
    if (expandedFlagId && flagProfiles[expandedFlagId]) {
      loadFlagProfiles(expandedFlagId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, from, to, timezone])

  const handleNewFlag = () => {
    setEditingFlagId(null)
    setIsModalOpen(true)
  }

  const handleEditFlag = (flagId: string) => {
    setEditingFlagId(flagId)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingFlagId(null)
  }

  const handleModalSuccess = () => {
    loadFlags(DEFAULT_FEATURE_FLAGS_TAKE, (page - 1) * DEFAULT_FEATURE_FLAGS_TAKE)
  }

  const handleDeleteFlag = async (flagId: string) => {
    try {
      await deleteFeatureFlagApi(flagId)
      toast.success(t('featureFlags.deleted'))
      loadFlags(DEFAULT_FEATURE_FLAGS_TAKE, (page - 1) * DEFAULT_FEATURE_FLAGS_TAKE)
    } catch (reason: any) {
      toast.error(reason?.response?.data?.message || reason?.message || t('apiNotifications.somethingWentWrong'))
    }
  }

  const handleToggleFlag = async (flagId: string, enabled: boolean) => {
    try {
      const { updateFeatureFlag } = await import('~/api')
      await updateFeatureFlag(flagId, { enabled })
      toast.success(enabled ? t('featureFlags.flagEnabled') : t('featureFlags.flagDisabled'))
      // Update local state
      setFlags((prev) => prev.map((f) => (f.id === flagId ? { ...f, enabled } : f)))
    } catch (reason: any) {
      toast.error(reason?.response?.data?.message || reason?.message || t('apiNotifications.somethingWentWrong'))
    }
  }

  if (error && isLoading === false) {
    return (
      <div className='bg-gray-50 px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8 dark:bg-slate-900'>
        <div className='mx-auto max-w-max'>
          <main className='sm:flex'>
            <XCircleIcon className='h-12 w-12 text-red-400' aria-hidden='true' />
            <div className='sm:ml-6'>
              <div className='max-w-prose sm:border-l sm:border-gray-200 sm:pl-6'>
                <h1 className='text-4xl font-extrabold text-gray-900 sm:text-5xl dark:text-gray-50'>
                  {t('apiNotifications.somethingWentWrong')}
                </h1>
                <p className='mt-4 text-2xl font-medium text-gray-700 dark:text-gray-200'>
                  {t('apiNotifications.errorCode', { error })}
                </p>
              </div>
              <div className='mt-8 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6'>
                <button
                  type='button'
                  onClick={() => window.location.reload()}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden'
                >
                  {t('dashboard.reloadPage')}
                </button>
                <Link
                  to={routes.contact}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700 dark:focus:ring-gray-50'
                >
                  {t('notFoundPage.support')}
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Show Loader only on initial load (no existing data)
  if ((isLoading || isLoading === null) && _isEmpty(flags)) {
    return (
      <div className='mt-4'>
        <Loader />
      </div>
    )
  }

  return (
    <div className='mt-4'>
      {isLoading && !_isEmpty(flags) ? <LoadingBar /> : null}
      {_isEmpty(flags) ? (
        <div className='mt-5 rounded-xl bg-gray-700 p-5'>
          <div className='flex items-center text-gray-50'>
            <FlagIcon className='mr-2 h-8 w-8' strokeWidth={1.5} />
            <p className='text-3xl font-bold'>{t('featureFlags.title')}</p>
          </div>
          <p className='mt-2 text-sm whitespace-pre-wrap text-gray-100'>{t('featureFlags.description')}</p>
          <Button
            onClick={handleNewFlag}
            className='mt-6 block max-w-max rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-indigo-50 md:px-4'
            secondary
            large
          >
            {t('featureFlags.add')}
          </Button>
        </div>
      ) : (
        <>
          {/* Header with filter and add button */}
          <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='relative'>
              <SearchIcon className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400' strokeWidth={1.5} />
              <input
                type='text'
                placeholder={t('featureFlags.filterFlags')}
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className='w-full rounded-lg border border-gray-300 bg-white py-2 pr-4 pl-9 text-sm text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none sm:w-64 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:border-indigo-400 dark:focus:ring-indigo-400'
              />
            </div>
            <Button onClick={handleNewFlag} primary regular>
              <PlusIcon className='mr-1.5 size-4' strokeWidth={2} />
              {t('featureFlags.addFlag')}
            </Button>
          </div>

          {/* Flags list */}
          <ul className='mt-4'>
            {_map(filteredFlags, (flag) => {
              const profiles = flagProfiles[flag.id] || []
              const profilesTotal = flagProfilesTotal[flag.id] || 0
              const canLoadMore = profiles.length < profilesTotal

              return (
                <FeatureFlagRow
                  key={flag.id}
                  flag={flag}
                  stats={flagStats[flag.id] || null}
                  statsLoading={statsLoading[flag.id] || false}
                  isExpanded={expandedFlagId === flag.id}
                  profiles={profiles}
                  profilesLoading={profilesLoading[flag.id] || false}
                  canLoadMoreProfiles={canLoadMore}
                  resultFilter={flagResultFilters[flag.id] ?? true}
                  onDelete={handleDeleteFlag}
                  onEdit={handleEditFlag}
                  onToggle={handleToggleFlag}
                  onToggleExpand={handleToggleExpand}
                  onLoadMoreProfiles={handleLoadMoreProfiles}
                  onResultFilterChange={handleResultFilterChange}
                  timeFormat={timeFormat}
                />
              )
            })}
          </ul>

          {filteredFlags.length === 0 && filterQuery ? (
            <p className='py-8 text-center text-sm text-gray-500 dark:text-gray-400'>
              {t('featureFlags.noFlagsMatchFilter')}
            </p>
          ) : null}
        </>
      )}
      {pageAmount > 1 && !filterQuery ? (
        <Pagination
          className='mt-4'
          page={page}
          pageAmount={pageAmount}
          setPage={setPage}
          total={total}
          pageSize={DEFAULT_FEATURE_FLAGS_TAKE}
        />
      ) : null}

      <FeatureFlagSettingsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleModalSuccess}
        projectId={id}
        flagId={editingFlagId}
      />
    </div>
  )
}

export default FeatureFlagsView
