import dayjs from 'dayjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import type { DataDeletionPreview } from '~/api/api.server'
import { useDataDeletionPreviewProxy } from '~/hooks/useAnalyticsProxy'
import type { ProjectSettingsActionData } from '~/routes/projects.settings.$id'
import DatePicker from '~/ui/Datepicker'
import HoldToConfirmButton from '~/ui/HoldToConfirmButton'
import Modal from '~/ui/Modal'
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

// Order mirrors how prominent each type is for a typical cleanup.
const EVENT_TYPES: { key: string; labelKey: string }[] = [
  { key: 'pageview', labelKey: 'project.settings.deleteData.types.pageview' },
  {
    key: 'custom_event',
    labelKey: 'project.settings.deleteData.types.custom_event',
  },
  { key: 'error', labelKey: 'project.settings.deleteData.types.error' },
  {
    key: 'performance',
    labelKey: 'project.settings.deleteData.types.performance',
  },
  { key: 'captcha', labelKey: 'project.settings.deleteData.types.captcha' },
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
        'flex h-16 items-end gap-px border-b border-gray-200 transition-opacity duration-200 dark:border-slate-800',
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
                className='absolute inset-x-0 bottom-0 rounded-sm bg-red-400/80 transition-[height] duration-200 ease-out dark:bg-red-500/70'
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

  // Until the user touches a chip, default to every type that actually matches.
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

  const rangeSummary = useMemo(() => {
    if (period === 'all') {
      return t('project.settings.deleteData.summaryAllTime')
    }
    if (range.from && range.to) {
      return t('project.settings.deleteData.summaryRange', {
        from: dayjs(range.from).format('MMM D, YYYY'),
        to: dayjs(range.to).format('MMM D, YYYY'),
      })
    }
    return ''
  }, [period, range.from, range.to, t])

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
        <div className='space-y-5'>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            {t('project.settings.deleteData.intro')}
          </p>

          {/* Date range */}
          <div className='space-y-2'>
            <p className='text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400'>
              {t('project.settings.deleteData.dateRange')}
            </p>
            <div className='inline-flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1 dark:bg-slate-900'>
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
          <div className='space-y-2'>
            <p className='text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400'>
              {t('project.settings.deleteData.matching')}
            </p>
            <FilterRowsEditor
              active={isOpen}
              projectId={pid}
              type='traffic'
              tnMapping={EMPTY_TN_MAPPING}
              onChange={setFilters}
            />
            <p className='text-xs text-gray-400 dark:text-gray-500'>
              {t('project.settings.deleteData.filtersHint')}
            </p>
          </div>

          {/* Preview */}
          <div className='rounded-lg border border-gray-200 bg-gray-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40'>
            <MatchingTimeline
              timeline={preview?.timeline}
              loading={previewLoading}
              language={language}
            />

            <div className='mt-3 flex items-baseline gap-2'>
              {previewError ? (
                <span className='text-sm text-red-600 dark:text-red-400'>
                  {t('project.settings.deleteData.previewError')}
                </span>
              ) : !range.ready ? (
                <span className='text-sm text-gray-500 dark:text-gray-400'>
                  {t('project.settings.deleteData.customRangePrompt')}
                </span>
              ) : preview && !hasAnyMatch ? (
                <span className='text-sm text-gray-500 dark:text-gray-400'>
                  {t('project.settings.deleteData.noMatch')}
                </span>
              ) : !preview ? (
                <span className='text-sm text-gray-400 dark:text-gray-500'>
                  {t('project.settings.deleteData.calculating')}
                </span>
              ) : (
                <>
                  <span
                    className={cn(
                      'text-2xl font-bold text-red-600 tabular-nums transition-opacity dark:text-red-400',
                      previewLoading && !preview ? 'opacity-40' : 'opacity-100',
                    )}
                  >
                    {selectedTotal.toLocaleString(language)}
                  </span>
                  <span className='text-sm text-gray-500 dark:text-gray-400'>
                    {t('project.settings.deleteData.willDelete')}
                    {rangeSummary ? ` · ${rangeSummary}` : ''}
                  </span>
                </>
              )}
            </div>

            {/* Per-type breakdown / toggles */}
            {preview && hasAnyMatch ? (
              <div className='mt-3 flex flex-wrap gap-1.5'>
                {EVENT_TYPES.map((type) => {
                  const count = countFor(type.key)
                  const isSelected = selectedTypes.has(type.key)
                  const isEmpty = count === 0

                  return (
                    <button
                      key={type.key}
                      type='button'
                      onClick={() => toggleType(type.key)}
                      disabled={isEmpty}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors active:scale-[0.97]',
                        isEmpty
                          ? 'cursor-not-allowed border-gray-200 text-gray-300 dark:border-slate-800 dark:text-slate-600'
                          : isSelected
                            ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-slate-700 dark:text-gray-400 dark:hover:border-slate-600',
                      )}
                    >
                      {t(type.labelKey)}
                      <span className='tabular-nums opacity-70'>
                        {count.toLocaleString(language)}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>
      }
    />
  )
}

export default DeleteDataModal
