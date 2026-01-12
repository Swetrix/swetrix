import cx from 'clsx'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import _debounce from 'lodash/debounce'
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
import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  Suspense,
  use,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  Link,
  useLocation,
  useFetcher,
  useLoaderData,
  useRevalidator,
} from 'react-router'
import { toast } from 'sonner'

import type {
  FeatureFlagsResponse,
  ProjectFeatureFlag,
  FeatureFlagStats,
  FeatureFlagProfile,
} from '~/api/api.server'
import {
  useFeatureFlagStatsProxy,
  useFeatureFlagProfilesProxy,
} from '~/hooks/useAnalyticsProxy'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import {
  useViewProjectContext,
  useRefreshTriggers,
} from '~/pages/Project/View/ViewProject'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import type {
  ProjectLoaderData,
  ProjectViewActionData,
} from '~/routes/projects.$id'
import { Badge } from '~/ui/Badge'
import Button from '~/ui/Button'
import Spin from '~/ui/icons/Spin'
import Loader from '~/ui/Loader'
import LoadingBar from '~/ui/LoadingBar'
import Modal from '~/ui/Modal'
import Pagination from '~/ui/Pagination'
import StatusPage from '~/ui/StatusPage'
import { Switch } from '~/ui/Switch'
import { Text } from '~/ui/Text'
import { nFormatter } from '~/utils/generic'
import { getProfileDisplayName, ProfileAvatar } from '~/utils/profileAvatars'
import routes from '~/utils/routes'

import FeatureFlagSettingsModal from './FeatureFlagSettingsModal'

dayjs.extend(relativeTime)

const DEFAULT_FEATURE_FLAGS_TAKE = 20
const DEFAULT_FEATURE_FLAG_PROFILES_TAKE = 15

interface FeatureFlagProfileRowProps {
  profile: FeatureFlagProfile
  timeFormat: '12-hour' | '24-hour'
}

const FeatureFlagProfileRow = ({
  profile,
  timeFormat,
}: FeatureFlagProfileRowProps) => {
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
          <ProfileAvatar
            profileId={profile.profileId}
            size={32}
            className='shrink-0'
          />

          <div className='min-w-0 flex-auto'>
            <p className='flex items-center text-xs leading-5 font-semibold text-gray-900 dark:text-gray-50'>
              <span className='truncate'>{displayName}</span>
              {profile.isIdentified ? (
                <Badge
                  label={t('project.identified')}
                  colour='indigo'
                  className='ml-1.5'
                />
              ) : null}
            </p>
            <p className='mt-0.5 text-xs text-gray-500 dark:text-gray-400'>
              {t('featureFlags.xEvaluations', {
                count: profile.evaluationCount,
              })}{' '}
              · {lastEvaluatedText}
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
      <li className='relative mb-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-colors dark:border-slate-800/25 dark:bg-slate-800/70'>
        {/* Main row - clickable to expand */}
        <div
          onClick={() => onToggleExpand(flag.id)}
          className='flex cursor-pointer justify-between gap-x-6 px-4 py-4 transition-colors hover:bg-gray-200/70 sm:px-6 dark:hover:bg-slate-700/60'
        >
          <div className='flex min-w-0 gap-x-4'>
            <div className='min-w-0 flex-auto'>
              <div className='flex items-center gap-x-2'>
                <Text
                  as='p'
                  weight='semibold'
                  truncate
                  className='flex items-center gap-x-1.5'
                >
                  <FlagIcon
                    className='size-4 text-indigo-500'
                    strokeWidth={1.5}
                  />
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
                  {flag.enabled
                    ? t('featureFlags.enabled')
                    : t('featureFlags.disabled')}
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
                  {t('featureFlags.targetingRulesCount', {
                    count: targetingRulesCount,
                  })}
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
                      {nFormatter(stats.evaluations, 1)}{' '}
                      {t('featureFlags.evaluations').toLowerCase()}
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
                    <Text
                      as='p'
                      size='sm'
                      weight='semibold'
                      className='text-green-600 dark:text-green-400'
                    >
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
                aria-label={
                  flag.enabled
                    ? t('featureFlags.disable')
                    : t('featureFlags.enable')
                }
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
                className={cx(
                  'size-5 text-gray-500 transition-transform dark:text-gray-400',
                  {
                    'rotate-180': isExpanded,
                  },
                )}
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
              <Switch
                checked={resultFilter}
                onChange={(checked) => onResultFilterChange(flag.id, checked)}
              />
              <Text as='span' size='xs' colour='muted'>
                {t('featureFlags.served')}
              </Text>
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
                    <FeatureFlagProfileRow
                      key={profile.profileId}
                      profile={profile}
                      timeFormat={timeFormat}
                    />
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
                      'relative mx-auto mt-2 flex items-center rounded-md border border-transparent p-2 text-sm font-medium text-gray-700 ring-inset hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200',
                      {
                        'cursor-not-allowed opacity-50': profilesLoading,
                      },
                    )}
                  >
                    {profilesLoading ? (
                      <Spin className='mr-2 size-5' />
                    ) : (
                      <DownloadIcon
                        className='mr-2 h-5 w-5'
                        strokeWidth={1.5}
                      />
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

interface DeferredFeatureFlagsData {
  featureFlagsData: FeatureFlagsResponse | null
}

function FeatureFlagsDataResolver({
  children,
}: {
  children: (data: DeferredFeatureFlagsData) => React.ReactNode
}) {
  const { featureFlagsData: featureFlagsDataPromise } =
    useLoaderData<ProjectLoaderData>()
  const featureFlagsData = featureFlagsDataPromise
    ? use(featureFlagsDataPromise)
    : null
  return <>{children({ featureFlagsData })}</>
}

function FeatureFlagsViewWrapper(props: FeatureFlagsViewProps) {
  return (
    <Suspense fallback={<Loader />}>
      <FeatureFlagsDataResolver>
        {(deferredData) => (
          <FeatureFlagsViewInner {...props} deferredData={deferredData} />
        )}
      </FeatureFlagsDataResolver>
    </Suspense>
  )
}

interface FeatureFlagsViewInnerProps extends FeatureFlagsViewProps {
  deferredData: DeferredFeatureFlagsData
}

const FeatureFlagsViewInner = ({
  period,
  from = '',
  to = '',
  timezone,
  deferredData,
}: FeatureFlagsViewInnerProps) => {
  const { id } = useCurrentProject()
  const revalidator = useRevalidator()
  const { featureFlagsRefreshTrigger } = useRefreshTriggers()
  const { timeFormat } = useViewProjectContext()
  const { t } = useTranslation()

  const listFetcher = useFetcher<ProjectViewActionData>()
  const actionFetcher = useFetcher<ProjectViewActionData>()

  // Track if we're in search/pagination mode (not using loader data)
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [total, setTotal] = useState(
    () => deferredData.featureFlagsData?.total || 0,
  )
  const [flags, setFlags] = useState<ProjectFeatureFlag[]>(
    () => deferredData.featureFlagsData?.results || [],
  )
  const [flagStats, setFlagStats] = useState<
    Record<string, FeatureFlagStats | null>
  >({})
  const [statsLoading, setStatsLoading] = useState<Record<string, boolean>>({})
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const processedActionRef = useRef<string | null>(null)

  const isMountedRef = useRef(true)

  // Expanded flag state
  const [expandedFlagId, setExpandedFlagId] = useState<string | null>(null)
  const [flagProfiles, setFlagProfiles] = useState<
    Record<string, FeatureFlagProfile[]>
  >({})
  const [flagProfilesTotal, setFlagProfilesTotal] = useState<
    Record<string, number>
  >({})
  const [profilesLoading, setProfilesLoading] = useState<
    Record<string, boolean>
  >({})
  const [flagResultFilters, setFlagResultFilters] = useState<
    Record<string, boolean>
  >({})

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFlagId, setEditingFlagId] = useState<string | null>(null)

  const isLoading =
    revalidator.state === 'loading' || listFetcher.state !== 'idle'

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Sync state when loader provides new data
  useEffect(() => {
    if (
      deferredData.featureFlagsData &&
      revalidator.state === 'idle' &&
      !isSearchMode
    ) {
      setFlags(deferredData.featureFlagsData.results || [])
      setTotal(deferredData.featureFlagsData.total || 0)
    }
  }, [revalidator.state, deferredData.featureFlagsData, isSearchMode])

  const pageAmount = Math.ceil(total / DEFAULT_FEATURE_FLAGS_TAKE)

  const loadFlags = useCallback(
    (take: number, skip: number, search?: string) => {
      if (listFetcher.state !== 'idle') {
        return
      }
      setIsSearchMode(true)

      listFetcher.submit(
        {
          intent: 'get-project-feature-flags',
          take: String(take),
          skip: String(skip),
          search: search || '',
        },
        { method: 'POST' },
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listFetcher.submit],
  )

  // Handle list fetcher response
  useEffect(() => {
    if (
      listFetcher.data?.intent === 'get-project-feature-flags' &&
      listFetcher.state === 'idle'
    ) {
      if (isMountedRef.current) {
        if (listFetcher.data.success && listFetcher.data.data) {
          const result = listFetcher.data.data as {
            results: ProjectFeatureFlag[]
            total: number
          }
          setFlags(result.results)
          setTotal(result.total)
        } else if (listFetcher.data.error) {
          setError(listFetcher.data.error)
        }
      }
    }
  }, [listFetcher.data, listFetcher.state])

  // Handle action fetcher responses (delete, update)
  useEffect(() => {
    if (!actionFetcher.data || actionFetcher.state !== 'idle') return

    const actionKey = `${actionFetcher.data.intent}-${JSON.stringify(actionFetcher.data.data)}`
    if (processedActionRef.current === actionKey) return
    processedActionRef.current = actionKey

    if (actionFetcher.data.intent === 'delete-feature-flag') {
      if (actionFetcher.data.success) {
        toast.success(t('featureFlags.deleted'))
        if (page === 1 && !filterQuery) {
          setIsSearchMode(false)
          revalidator.revalidate()
        } else {
          loadFlags(
            DEFAULT_FEATURE_FLAGS_TAKE,
            (page - 1) * DEFAULT_FEATURE_FLAGS_TAKE,
            filterQuery || undefined,
          )
        }
      } else if (actionFetcher.data.error) {
        toast.error(actionFetcher.data.error)
      }
    } else if (actionFetcher.data.intent === 'update-feature-flag') {
      if (actionFetcher.data.success && actionFetcher.data.data) {
        const updated = actionFetcher.data.data as ProjectFeatureFlag
        toast.success(
          updated.enabled
            ? t('featureFlags.flagEnabled')
            : t('featureFlags.flagDisabled'),
        )
        setFlags((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
      } else if (actionFetcher.data.error) {
        toast.error(actionFetcher.data.error)
      }
    }
  }, [
    actionFetcher.data,
    actionFetcher.state,
    t,
    loadFlags,
    page,
    filterQuery,
    revalidator,
  ])

  // Debounced search to avoid excessive API calls
  const debouncedLoadFlags = useMemo(
    () =>
      _debounce((search: string) => {
        loadFlags(DEFAULT_FEATURE_FLAGS_TAKE, 0, search || undefined)
      }, 300),
    [loadFlags],
  )

  // Handle search input change
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setFilterQuery(value)
      setPage(1) // Reset to first page when searching
      debouncedLoadFlags(value)
    },
    [debouncedLoadFlags],
  )

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedLoadFlags.cancel()
    }
  }, [debouncedLoadFlags])

  // Proxy hooks for stats and profiles
  const statsProxy = useFeatureFlagStatsProxy()
  const profilesProxy = useFeatureFlagProfilesProxy()

  const loadFlagStats = useCallback(
    async (flagId: string) => {
      setStatsLoading((prev) => ({ ...prev, [flagId]: true }))
      try {
        const stats = await statsProxy.fetchStats(flagId, {
          period,
          from,
          to,
          timezone,
        })
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
    },
    [period, from, to, timezone, statsProxy],
  )

  const loadFlagProfiles = useCallback(
    async (flagId: string, append = false, resultFilter?: boolean) => {
      const currentProfiles = append ? flagProfiles[flagId] || [] : []
      const skip = append ? currentProfiles.length : 0
      const filter = resultFilter ?? flagResultFilters[flagId] ?? true
      const apiFilter = filter ? 'true' : 'false'

      setProfilesLoading((prev) => ({ ...prev, [flagId]: true }))
      try {
        const result = await profilesProxy.fetchProfiles(flagId, {
          period,
          from,
          to,
          timezone,
          take: DEFAULT_FEATURE_FLAG_PROFILES_TAKE,
          skip,
          resultFilter: apiFilter,
        })
        if (isMountedRef.current && result) {
          setFlagProfiles((prev) => ({
            ...prev,
            [flagId]: append
              ? [...currentProfiles, ...result.profiles]
              : result.profiles,
          }))
          setFlagProfilesTotal((prev) => ({ ...prev, [flagId]: result.total }))
        }
      } catch (err) {
        console.error('Failed to load flag profiles:', err)
        if (isMountedRef.current) {
          setFlagProfiles((prev) => ({
            ...prev,
            [flagId]: append ? currentProfiles : [],
          }))
          setFlagProfilesTotal((prev) => ({ ...prev, [flagId]: 0 }))
        }
      } finally {
        if (isMountedRef.current) {
          setProfilesLoading((prev) => ({ ...prev, [flagId]: false }))
        }
      }
    },
    [
      period,
      from,
      to,
      timezone,
      flagProfiles,
      flagResultFilters,
      profilesProxy,
    ],
  )

  const handleToggleExpand = useCallback(
    (flagId: string) => {
      if (expandedFlagId === flagId) {
        setExpandedFlagId(null)
      } else {
        setExpandedFlagId(flagId)
        if (!flagProfiles[flagId] && !profilesLoading[flagId]) {
          setFlagResultFilters((prev) => ({ ...prev, [flagId]: true }))
          loadFlagProfiles(flagId, false, true)
        }
      }
    },
    [expandedFlagId, flagProfiles, profilesLoading, loadFlagProfiles],
  )

  const handleLoadMoreProfiles = useCallback(
    (flagId: string) => {
      loadFlagProfiles(flagId, true)
    },
    [loadFlagProfiles],
  )

  const handleResultFilterChange = useCallback(
    (flagId: string, filter: boolean) => {
      setFlagResultFilters((prev) => ({ ...prev, [flagId]: filter }))
      setFlagProfiles((prev) => ({ ...prev, [flagId]: [] }))
      loadFlagProfiles(flagId, false, filter)
    },
    [loadFlagProfiles],
  )

  // Handle page changes - use fetcher for pagination
  useEffect(() => {
    if (page > 1 || isSearchMode) {
      loadFlags(
        DEFAULT_FEATURE_FLAGS_TAKE,
        (page - 1) * DEFAULT_FEATURE_FLAGS_TAKE,
        filterQuery || undefined,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  // Refresh feature flags data when refresh button is clicked
  useEffect(() => {
    if (featureFlagsRefreshTrigger > 0) {
      if (page === 1 && !filterQuery) {
        setIsSearchMode(false)
        revalidator.revalidate()
      } else {
        loadFlags(
          DEFAULT_FEATURE_FLAGS_TAKE,
          (page - 1) * DEFAULT_FEATURE_FLAGS_TAKE,
          filterQuery || undefined,
        )
      }
      setFlagStats({})
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
    flags.forEach((flag) => {
      loadFlagStats(flag.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flags, period, from, to, timezone])

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
    if (page === 1 && !filterQuery) {
      setIsSearchMode(false)
      revalidator.revalidate()
    } else {
      loadFlags(
        DEFAULT_FEATURE_FLAGS_TAKE,
        (page - 1) * DEFAULT_FEATURE_FLAGS_TAKE,
        filterQuery || undefined,
      )
    }
  }

  const handleDeleteFlag = useCallback(
    (flagId: string) => {
      processedActionRef.current = null
      actionFetcher.submit(
        { intent: 'delete-feature-flag', flagId },
        { method: 'POST' },
      )
    },
    [actionFetcher],
  )

  const handleToggleFlag = useCallback(
    (flagId: string, enabled: boolean) => {
      processedActionRef.current = null
      actionFetcher.submit(
        { intent: 'update-feature-flag', flagId, enabled: String(enabled) },
        { method: 'POST' },
      )
    },
    [actionFetcher],
  )

  if (error && !isLoading) {
    return (
      <StatusPage
        type='error'
        title={t('apiNotifications.somethingWentWrong')}
        description={t('apiNotifications.errorCode', { error })}
        actions={[
          {
            label: t('dashboard.reloadPage'),
            onClick: () => window.location.reload(),
            primary: true,
          },
          { label: t('notFoundPage.support'), to: routes.contact },
        ]}
      />
    )
  }

  return (
    <>
      <DashboardHeader showLiveVisitors />
      <div>
        {isLoading && !_isEmpty(flags) ? <LoadingBar /> : null}
        {_isEmpty(flags) && !filterQuery ? (
          <div className='mt-5 rounded-lg bg-gray-700 p-5'>
            <div className='flex items-center text-gray-50'>
              <FlagIcon className='mr-2 h-8 w-8' strokeWidth={1.5} />
              <p className='text-3xl font-bold'>{t('featureFlags.title')}</p>
            </div>
            <p className='mt-2 text-sm whitespace-pre-wrap text-gray-100'>
              {t('featureFlags.description')}
            </p>
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
                <SearchIcon
                  className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400'
                  strokeWidth={1.5}
                />
                <input
                  type='text'
                  placeholder={t('featureFlags.filterFlags')}
                  value={filterQuery}
                  onChange={handleSearchChange}
                  className='w-full rounded-lg border border-gray-300 bg-white py-2 pr-4 pl-9 text-sm text-gray-900 placeholder-gray-500 ring-inset focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none sm:w-64 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:border-indigo-400 dark:focus:ring-indigo-400'
                />
              </div>
              <Button onClick={handleNewFlag} primary regular>
                <PlusIcon className='mr-1.5 size-4' strokeWidth={2} />
                {t('featureFlags.addFlag')}
              </Button>
            </div>

            {/* Flags list */}
            <ul className='mt-4'>
              {_map(flags, (flag) => {
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

            {_isEmpty(flags) && filterQuery ? (
              <p className='py-8 text-center text-sm text-gray-500 dark:text-gray-400'>
                {t('featureFlags.noFlagsMatchFilter')}
              </p>
            ) : null}
          </>
        )}
        {pageAmount > 1 ? (
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
    </>
  )
}

const FeatureFlagsView = FeatureFlagsViewWrapper

export default FeatureFlagsView
