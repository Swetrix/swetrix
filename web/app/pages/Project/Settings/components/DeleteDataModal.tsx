import {
  CheckIcon,
  CursorClickIcon,
  EyeIcon,
  GaugeIcon,
  MonitorPlayIcon,
  ShieldCheckIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import dayjs from 'dayjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import type { DataDeletionPreview } from '~/api/api.server'
import { useDataDeletionPreviewProxy } from '~/hooks/useAnalyticsProxy'
import { isSelfhosted } from '~/lib/constants'
import type { ProjectSettingsActionData } from '~/routes/projects.settings.$id'
import DatePicker from '~/ui/Datepicker'
import HoldToConfirmButton from '~/ui/HoldToConfirmButton'
import Modal from '~/ui/Modal'
import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'

import FilterRowsEditor from '../../View/components/FilterRowsEditor'
import type { Filter } from '../../View/interfaces/traffic'

const EMPTY_TN_MAPPING: Record<string, string> = {}

type PeriodKey = 'all' | '24h' | '7d' | '30d' | 'custom'

const PERIODS: { key: PeriodKey; labelKey: string }[] = [
  { key: 'all', labelKey: 'project.settings.deleteData.periods.all' },
  { key: '24h', labelKey: 'project.settings.deleteData.periods.24h' },
  { key: '7d', labelKey: 'project.settings.deleteData.periods.7d' },
  { key: '30d', labelKey: 'project.settings.deleteData.periods.30d' },
  { key: 'custom', labelKey: 'project.settings.deleteData.periods.custom' },
]

interface EventType {
  key: string
  labelKey: string
  Icon: React.ElementType
}

// Order mirrors how prominent each type is for a typical cleanup. Session
// replays are cloud-only — self-hosted has no replay storage.
const EVENT_TYPES: EventType[] = [
  {
    key: 'pageview',
    labelKey: 'project.settings.deleteData.types.pageview',
    Icon: EyeIcon,
  },
  {
    key: 'custom_event',
    labelKey: 'project.settings.deleteData.types.custom_event',
    Icon: CursorClickIcon,
  },
  {
    key: 'error',
    labelKey: 'project.settings.deleteData.types.error',
    Icon: WarningIcon,
  },
  {
    key: 'performance',
    labelKey: 'project.settings.deleteData.types.performance',
    Icon: GaugeIcon,
  },
  {
    key: 'captcha',
    labelKey: 'project.settings.deleteData.types.captcha',
    Icon: ShieldCheckIcon,
  },
  ...(isSelfhosted
    ? []
    : [
        {
          key: 'session_replay',
          labelKey: 'project.settings.deleteData.types.session_replay',
          Icon: MonitorPlayIcon,
        },
      ]),
]

const DEFAULT_TYPES = ['pageview', 'custom_event']

interface DateRange {
  from: string | null
  to: string | null
  ready: boolean
}

const computeRange = (period: PeriodKey, customRange: Date[]): DateRange => {
  if (period === 'all') {
    return { from: null, to: null, ready: true }
  }

  if (period === 'custom') {
    if (customRange.length === 2 && customRange[0] && customRange[1]) {
      return {
        from: dayjs(customRange[0]).startOf('day').toISOString(),
        to: dayjs(customRange[1]).endOf('day').toISOString(),
        ready: true,
      }
    }
    return { from: null, to: null, ready: false }
  }

  const days = period === '24h' ? 1 : period === '7d' ? 7 : 30
  return {
    from: dayjs().subtract(days, 'day').toISOString(),
    to: dayjs().toISOString(),
    ready: true,
  }
}

// Small uppercase section heading, matching the rest of the settings UI.
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <Text
    as='p'
    size='xs'
    weight='medium'
    colour='muted'
    tracking='wide'
    className='uppercase'
  >
    {children}
  </Text>
)

// Lightweight, dependency-free sparkline of the matching events over time.
// Bars read as "the data you're about to delete", so they're tinted red.
const MatchingTimeline = ({
  timeline,
  loading,
  language,
}: {
  timeline: DataDeletionPreview['timeline'] | undefined
  loading: boolean
  language: string
}) => {
  const counts = timeline?.counts ?? []
  const max = counts.length ? Math.max(...counts) : 0

  return (
    <div
      className={cn(
        'flex h-14 items-end gap-px transition-opacity duration-200',
        loading && counts.length ? 'opacity-40' : 'opacity-100',
      )}
    >
      {counts.length === 0 ? (
        <div className='h-full w-full' />
      ) : (
        counts.map((count, index) => {
          const ratio = max > 0 ? count / max : 0
          const label =
            timeline?.x[index] &&
            `${dayjs(timeline.x[index]).format('MMM D, HH:mm')} · ${count.toLocaleString(language)}`

          return (
            <div
              key={timeline?.x[index] ?? index}
              className='relative h-full flex-1'
              title={label || undefined}
            >
              <div
                className='absolute inset-x-0 bottom-0 rounded-sm bg-red-400/80 transition-[height] duration-200 ease-out dark:bg-red-500/60'
                style={{
                  height: count > 0 ? `max(2px, ${ratio * 100}%)` : '0px',
                }}
              />
            </div>
          )
        })
      )}
    </div>
  )
}

// A single togglable row in the breakdown: check indicator, icon, label and a
// right-aligned count. Replaces the old pill/badge cluster.
const TypeRow = ({
  Icon,
  label,
  count,
  selected,
  disabled,
  loading,
  onToggle,
  language,
}: {
  Icon: React.ElementType
  label: string
  count: number
  selected: boolean
  disabled: boolean
  loading: boolean
  onToggle: () => void
  language: string
}) => (
  <button
    type='button'
    aria-pressed={selected}
    disabled={disabled}
    onClick={onToggle}
    className={cn(
      'group flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors',
      disabled
        ? 'cursor-not-allowed'
        : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900/50',
    )}
  >
    <span
      aria-hidden
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-[5px] ring-1 transition-colors ring-inset',
        disabled
          ? 'bg-gray-100 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800'
          : selected
            ? 'bg-slate-900 ring-slate-900 dark:bg-slate-100 dark:ring-slate-100'
            : 'bg-white ring-gray-300 group-hover:ring-gray-400 dark:bg-slate-950 dark:ring-slate-700/80 dark:group-hover:ring-slate-600',
      )}
    >
      {selected && !disabled ? (
        <CheckIcon
          weight='bold'
          className='size-3 text-white dark:text-slate-900'
        />
      ) : null}
    </span>
    <Icon
      weight='regular'
      className={cn(
        'size-4 shrink-0',
        disabled
          ? 'text-gray-300 dark:text-slate-700'
          : 'text-gray-400 dark:text-slate-500',
      )}
    />
    <span
      className={cn(
        'flex-1 truncate text-sm',
        disabled
          ? 'text-gray-400 dark:text-slate-600'
          : 'font-medium text-gray-700 dark:text-gray-200',
      )}
    >
      {label}
    </span>
    <span
      className={cn(
        'text-sm tabular-nums transition-opacity duration-200',
        loading && 'opacity-40',
        disabled
          ? 'text-gray-300 dark:text-slate-700'
          : selected
            ? 'font-semibold text-gray-900 dark:text-gray-50'
            : 'text-gray-400 line-through dark:text-slate-600',
      )}
    >
      {count.toLocaleString(language)}
    </span>
  </button>
)

interface DeleteDataModalProps {
  pid: string
  isOpen: boolean
  onClose: () => void
}

const DeleteDataModal = ({ pid, isOpen, onClose }: DeleteDataModalProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  const [filters, setFilters] = useState<Filter[]>([])
  const [period, setPeriod] = useState<PeriodKey>('all')
  const [customRange, setCustomRange] = useState<Date[]>([])
  // null = follow the auto default (every type that has matching rows)
  const [explicitTypes, setExplicitTypes] = useState<Set<string> | null>(null)

  const [preview, setPreview] = useState<DataDeletionPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(false)

  const { fetchPreview } = useDataDeletionPreviewProxy()
  const fetcher = useFetcher<ProjectSettingsActionData>()
  const submitting = fetcher.state !== 'idle'
  const handledFetcher = useRef<ProjectSettingsActionData | null>(null)

  const range = useMemo(
    () => computeRange(period, customRange),
    [period, customRange],
  )

  // Reset transient state every time the modal is opened.
  useEffect(() => {
    if (isOpen) {
      setPeriod('all')
      setCustomRange([])
      setExplicitTypes(null)
      setPreview(null)
      setPreviewError(false)
    }
  }, [isOpen])

  // Debounced live preview that mirrors the deletion query exactly.
  useEffect(() => {
    if (!isOpen || !range.ready) {
      return
    }

    let cancelled = false
    setPreviewLoading(true)

    const handle = setTimeout(() => {
      fetchPreview(pid, {
        filters,
        from: range.from ?? undefined,
        to: range.to ?? undefined,
      })
        .then((result) => {
          if (cancelled) return
          setPreview(result)
          setPreviewError(false)
        })
        .catch(() => {
          if (cancelled) return
          setPreview(null)
          setPreviewError(true)
        })
        .finally(() => {
          if (!cancelled) setPreviewLoading(false)
        })
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [isOpen, pid, filters, range.ready, range.from, range.to, fetchPreview])

  // Success / error handling for the destructive submit.
  useEffect(() => {
    if (!fetcher.data || fetcher.data === handledFetcher.current) {
      return
    }

    if (fetcher.data.intent !== 'delete-data') {
      return
    }

    handledFetcher.current = fetcher.data

    if (fetcher.data.success) {
      toast.success(t('project.settings.deleteData.started'))
      onClose()
    } else if (fetcher.data.error) {
      toast.error(t('project.settings.deleteData.error'))
    }
  }, [fetcher.data, onClose, t])

  const countFor = (type: string) => preview?.counts?.[type] ?? 0

  // Until the user touches a row, default to every type that actually matches.
  const autoTypes = useMemo(() => {
    const matching = EVENT_TYPES.filter((type) => countFor(type.key) > 0).map(
      (type) => type.key,
    )
    return new Set(matching.length ? matching : DEFAULT_TYPES)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview])

  const selectedTypes = explicitTypes ?? autoTypes

  const toggleType = (type: string) => {
    setExplicitTypes((prev) => {
      const next = new Set(prev ?? autoTypes)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  const selectedTotal = EVENT_TYPES.reduce(
    (sum, type) =>
      selectedTypes.has(type.key) ? sum + countFor(type.key) : sum,
    0,
  )

  const hasAnyMatch = (preview?.total ?? 0) > 0
  const canDelete =
    range.ready && !submitting && selectedTotal > 0 && !previewError

  const handleConfirm = () => {
    if (!canDelete) {
      if (!range.ready) {
        toast.error(t('project.settings.deleteData.customRangePrompt'))
      } else if (selectedTotal === 0) {
        toast.error(t('project.settings.deleteData.selectType'))
      }
      return
    }

    const formData = new FormData()
    formData.set('intent', 'delete-data')
    formData.set('filters', JSON.stringify(filters))
    formData.set('types', JSON.stringify([...selectedTypes]))
    if (range.from) formData.set('from', range.from)
    if (range.to) formData.set('to', range.to)

    fetcher.submit(formData, { method: 'post' })
  }

  const rangeCaption = useMemo(() => {
    if (period === 'all') {
      return t('project.settings.deleteData.allTime')
    }
    if (range.from && range.to) {
      return `${dayjs(range.from).format('MMM D, YYYY')} – ${dayjs(range.to).format('MMM D, YYYY')}`
    }
    return ''
  }, [period, range.from, range.to, t])

  const showBreakdown =
    range.ready && !previewError && Boolean(preview) && hasAnyMatch

  // What to show when there's nothing to break down (loading / empty / error).
  const statusMessage = previewError
    ? { text: t('project.settings.deleteData.previewError'), tone: 'error' }
    : !range.ready
      ? {
          text: t('project.settings.deleteData.customRangePrompt'),
          tone: 'mut',
        }
      : !preview
        ? { text: t('project.settings.deleteData.calculating'), tone: 'mut' }
        : { text: t('project.settings.deleteData.noMatch'), tone: 'mut' }

  return (
    <Modal
      type='error'
      size='medium'
      overflowVisible
      isOpened={isOpen}
      onClose={onClose}
      closeText={t('common.close')}
      title={t('project.settings.deleteData.title')}
      customButtons={
        <HoldToConfirmButton
          onConfirm={handleConfirm}
          disabled={!canDelete}
          className='w-full justify-center sm:w-auto'
        >
          {selectedTotal > 0
            ? t('project.settings.deleteData.holdToDeleteCount', {
                total: selectedTotal.toLocaleString(language),
              })
            : t('common.holdToDelete')}
        </HoldToConfirmButton>
      }
      message={
        <div className='space-y-6'>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            {t('project.settings.deleteData.intro')}
          </p>

          {/* Date range */}
          <div className='space-y-2.5'>
            <SectionLabel>
              {t('project.settings.deleteData.dateRange')}
            </SectionLabel>
            <div className='flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1 dark:bg-slate-900'>
              {PERIODS.map(({ key, labelKey }) => (
                <button
                  key={key}
                  type='button'
                  onClick={() => setPeriod(key)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors active:scale-[0.98]',
                    period === key
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-gray-50'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
                  )}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
            {period === 'custom' ? (
              <div className='pt-1'>
                <DatePicker
                  mode='range'
                  onChange={(dates) => setCustomRange(dates)}
                  value={customRange}
                />
              </div>
            ) : null}
          </div>

          {/* Filters */}
          <div className='space-y-2.5'>
            <SectionLabel>
              {t('project.settings.deleteData.matching')}
            </SectionLabel>
            <FilterRowsEditor
              active={isOpen}
              projectId={pid}
              type='traffic'
              tnMapping={EMPTY_TN_MAPPING}
              onChange={setFilters}
            />
            <Text as='p' size='xs' colour='muted' className='leading-relaxed'>
              {t('project.settings.deleteData.filtersHint')}
            </Text>
          </div>

          {/* Preview */}
          <div className='space-y-2.5'>
            <SectionLabel>
              {t('project.settings.deleteData.breakdownTitle')}
            </SectionLabel>
            <div className='overflow-hidden rounded-xl border border-gray-200 dark:border-slate-800'>
              {showBreakdown ? (
                <>
                  <div className='space-y-1.5 px-3.5 pt-3.5 pb-3'>
                    <MatchingTimeline
                      timeline={preview?.timeline}
                      loading={previewLoading}
                      language={language}
                    />
                    {rangeCaption ? (
                      <Text as='p' size='xs' colour='muted'>
                        {rangeCaption}
                      </Text>
                    ) : null}
                  </div>

                  <div className='divide-y divide-gray-100 border-t border-gray-200 dark:divide-slate-800/60 dark:border-slate-800'>
                    {EVENT_TYPES.map((type) => {
                      const count = countFor(type.key)
                      return (
                        <TypeRow
                          key={type.key}
                          Icon={type.Icon}
                          label={t(type.labelKey)}
                          count={count}
                          selected={selectedTypes.has(type.key)}
                          disabled={count === 0}
                          loading={previewLoading}
                          onToggle={() => toggleType(type.key)}
                          language={language}
                        />
                      )
                    })}
                  </div>

                  <div className='flex items-center justify-between border-t border-gray-200 bg-gray-50/70 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-900/40'>
                    <Text size='sm' weight='medium' colour='secondary'>
                      {t('project.settings.deleteData.total')}
                    </Text>
                    <span
                      className={cn(
                        'text-lg font-bold text-red-600 tabular-nums transition-opacity duration-200 dark:text-red-400',
                        previewLoading && 'opacity-40',
                      )}
                    >
                      {selectedTotal.toLocaleString(language)}
                    </span>
                  </div>
                </>
              ) : (
                <div className='flex min-h-28 items-center justify-center px-4 py-8 text-center'>
                  <span
                    className={cn(
                      'text-sm',
                      statusMessage.tone === 'error'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-500 dark:text-gray-400',
                    )}
                  >
                    {statusMessage.text}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      }
    />
  )
}

export default DeleteDataModal
