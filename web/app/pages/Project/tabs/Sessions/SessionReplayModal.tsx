import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react'
import {
  ArrowsInIcon,
  ArrowsOutIcon,
  CameraIcon,
  CaretDownIcon,
  CaretRightIcon,
  ClockIcon,
  CursorClickIcon,
  FastForwardIcon,
  ListBulletsIcon,
  PauseIcon,
  PlayIcon,
  RewindIcon,
  TextTIcon,
  WarningCircleIcon,
  XIcon,
} from '@phosphor-icons/react'
import type { TFunction } from 'i18next'
import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ElementType,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Replayer } from 'dom-player'
import type { eventWithTime } from 'dom-player'
import './replayPlayer.css'
import { toast } from 'sonner'

import type {
  SessionReplayMetadata,
  SessionReplayResponse,
} from '~/api/api.server'
import { useSessionReplayProxy } from '~/hooks/useAnalyticsProxy'
import { Badge } from '~/ui/Badge'
import Button from '~/ui/Button'
import Loader from '~/ui/Loader'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { cn, getStringFromTime, getTimeFromSeconds } from '~/utils/generic'

const SPEEDS = [0.5, 1, 1.5, 2, 4]
const EVENT_FULL_SNAPSHOT = 2
const EVENT_INCREMENTAL = 3
const EVENT_META = 4
const SOURCE_MUTATION = 0
const SOURCE_MOUSE_INTERACTION = 2
const SOURCE_SCROLL = 3
const SOURCE_VIEWPORT_RESIZE = 4
const SOURCE_INPUT = 5
const MUTATION_GROUP_MS = 1500
const PREVIEW_WIDTH = 224
const PREVIEW_HEIGHT = 126
const PREVIEW_SEEK_STEP_MS = 500

type ReplayEvent = Omit<eventWithTime, 'data'> & {
  data?: Record<string, any>
}

interface TimelineStep {
  id: string
  offset: number
  label: string
  detail?: string
  kind:
    | 'navigation'
    | 'snapshot'
    | 'click'
    | 'scroll'
    | 'input'
    | 'resize'
    | 'mutation'
}

interface HoverPreview {
  offset: number
  percent: number
}

interface SessionReplayModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  psid: string
  replay?: SessionReplayMetadata | null
}

const getTimestamp = (event?: ReplayEvent) =>
  typeof event?.timestamp === 'number' ? event.timestamp : 0

const formatReplayTime = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

const getEventDetail = (event: ReplayEvent) => {
  const href = event.data?.href
  if (typeof href === 'string') {
    try {
      const url = new URL(href)
      return `${url.pathname}${url.search}`
    } catch {
      return href
    }
  }

  const text = event.data?.text || event.data?.value
  if (typeof text === 'string') {
    return text.length > 48 ? `${text.slice(0, 48)}...` : text
  }

  return undefined
}

const buildTimelineSteps = (
  events: ReplayEvent[],
  t: TFunction,
): TimelineStep[] => {
  const firstTimestamp = getTimestamp(events[0])
  const steps: TimelineStep[] = []
  let mutationGroup: TimelineStep | null = null
  let mutationCount = 0

  const pushMutationGroup = () => {
    if (!mutationGroup) return
    steps.push({
      ...mutationGroup,
      detail:
        mutationCount > 1
          ? t('project.sessionReplay.timeline.mutationsCount', {
              count: mutationCount,
            })
          : mutationGroup.detail,
    })
    mutationGroup = null
    mutationCount = 0
  }

  events.forEach((event, index) => {
    const timestamp = getTimestamp(event)
    const offset = Math.max(0, timestamp - firstTimestamp)
    const source = event.data?.source

    if (
      event.type !== EVENT_INCREMENTAL ||
      source !== SOURCE_MUTATION ||
      !mutationGroup ||
      offset - mutationGroup.offset > MUTATION_GROUP_MS
    ) {
      pushMutationGroup()
    }

    if (event.type === EVENT_META) {
      steps.push({
        id: `${index}-navigation`,
        offset,
        kind: 'navigation',
        label: t('project.sessionReplay.timeline.navigation'),
        detail: getEventDetail(event),
      })
      return
    }

    if (event.type === EVENT_FULL_SNAPSHOT) {
      steps.push({
        id: `${index}-snapshot`,
        offset,
        kind: 'snapshot',
        label: t('project.sessionReplay.timeline.fullSnapshot'),
      })
      return
    }

    if (event.type !== EVENT_INCREMENTAL) {
      return
    }

    if (source === SOURCE_MUTATION) {
      mutationGroup = {
        id: `${index}-mutation`,
        offset,
        kind: 'mutation',
        label: t('project.sessionReplay.timeline.mutations'),
      }
      mutationCount += 1
      return
    }

    if (source === SOURCE_MOUSE_INTERACTION) {
      steps.push({
        id: `${index}-click`,
        offset,
        kind: 'click',
        label: t('project.sessionReplay.timeline.click'),
      })
      return
    }

    if (source === SOURCE_SCROLL) {
      steps.push({
        id: `${index}-scroll`,
        offset,
        kind: 'scroll',
        label: t('project.sessionReplay.timeline.scroll'),
      })
      return
    }

    if (source === SOURCE_INPUT) {
      steps.push({
        id: `${index}-input`,
        offset,
        kind: 'input',
        label: t('project.sessionReplay.timeline.input'),
        detail: getEventDetail(event),
      })
      return
    }

    if (source === SOURCE_VIEWPORT_RESIZE) {
      steps.push({
        id: `${index}-resize`,
        offset,
        kind: 'resize',
        label: t('project.sessionReplay.timeline.resize'),
      })
    }
  })

  pushMutationGroup()
  return steps.slice(0, 200)
}

const TIMELINE_KIND_META: Record<
  TimelineStep['kind'],
  { Icon: ElementType; iconClass: string; markerClass: string }
> = {
  navigation: {
    Icon: PlayIcon,
    iconClass: 'text-sky-600 dark:text-sky-400',
    markerClass: 'bg-sky-500',
  },
  snapshot: {
    Icon: PlayIcon,
    iconClass: 'text-slate-600 dark:text-slate-300',
    markerClass: 'bg-slate-400',
  },
  click: {
    Icon: CursorClickIcon,
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    markerClass: 'bg-emerald-500',
  },
  scroll: {
    Icon: CaretRightIcon,
    iconClass: 'text-gray-600 dark:text-gray-300',
    markerClass: 'bg-gray-400',
  },
  input: {
    Icon: TextTIcon,
    iconClass: 'text-indigo-600 dark:text-slate-300',
    markerClass: 'bg-indigo-500 dark:bg-slate-300',
  },
  resize: {
    Icon: CaretRightIcon,
    iconClass: 'text-amber-600 dark:text-amber-400',
    markerClass: 'bg-amber-500',
  },
  mutation: {
    Icon: ListBulletsIcon,
    iconClass: 'text-gray-500 dark:text-gray-400',
    markerClass: 'bg-gray-300 dark:bg-slate-500',
  },
}

const getTimelineMeta = (kind: TimelineStep['kind']) => {
  return TIMELINE_KIND_META[kind]
}

const getNearestStep = (steps: TimelineStep[], offset: number) => {
  let nearest: TimelineStep | null = null

  for (const step of steps) {
    if (step.offset > offset) break
    nearest = step
  }

  return nearest
}

const getReplayViewport = (events: ReplayEvent[]) => {
  const meta = events.find(
    (event) =>
      event.type === EVENT_META &&
      typeof event.data?.width === 'number' &&
      typeof event.data?.height === 'number',
  )

  return {
    width: Number(meta?.data?.width) || 1280,
    height: Number(meta?.data?.height) || 720,
  }
}

const TimelineRailLine = () => (
  <div className='flex flex-1 justify-center pt-1.5'>
    <div
      className='w-px self-stretch bg-gray-200 dark:bg-slate-700/80'
      aria-hidden
    />
  </div>
)

const TimelineEventItem = ({
  step,
  isActive,
  isLast,
  onSeek,
}: {
  step: TimelineStep
  isActive: boolean
  isLast: boolean
  onSeek: (offset: number, shouldPlay?: boolean) => void
}) => {
  const { Icon, iconClass } = getTimelineMeta(step.kind)

  return (
    <li className='grid grid-cols-[28px_1fr] gap-x-3.5'>
      <div className='flex flex-col items-center'>
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 transition-colors duration-150 ease-out',
            isActive
              ? 'bg-slate-900 text-white ring-slate-900 dark:bg-slate-100 dark:text-slate-950 dark:ring-slate-100'
              : 'bg-white ring-gray-300 dark:bg-slate-900 dark:ring-slate-700/80',
          )}
        >
          <Icon
            className={cn('h-4 w-4', isActive ? 'text-inherit' : iconClass)}
            weight='duotone'
            aria-hidden
          />
        </span>
        {!isLast ? <TimelineRailLine /> : null}
      </div>

      <div className='min-w-0 pb-4'>
        <button
          type='button'
          onClick={() => onSeek(step.offset, false)}
          aria-label={`${step.label}, ${formatReplayTime(step.offset)}`}
          className={cn(
            'group w-full rounded-md px-2.5 py-2 text-left transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:focus-visible:ring-slate-300 dark:focus-visible:ring-offset-slate-950',
            isActive
              ? 'bg-gray-100 dark:bg-slate-900'
              : 'hover:bg-gray-50 dark:hover:bg-slate-900/70',
          )}
          aria-current={isActive ? 'step' : undefined}
        >
          <span className='flex min-w-0 items-start justify-between gap-3'>
            <span className='min-w-0'>
              <Text
                as='span'
                size='sm'
                weight='medium'
                colour='primary'
                className='block leading-4'
                truncate
              >
                {step.label}
              </Text>
              {step.detail ? (
                <Text
                  as='span'
                  size='xs'
                  colour='secondary'
                  className='mt-0.5 block leading-4'
                  truncate
                >
                  {step.detail}
                </Text>
              ) : null}
            </span>
            <Text
              as='span'
              size='xs'
              colour='secondary'
              className='shrink-0 pt-0.5 font-medium tabular-nums'
            >
              {formatReplayTime(step.offset)}
            </Text>
          </span>
        </button>
      </div>
    </li>
  )
}

const PlayerIconButton = ({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof Button>) => (
  <Button
    {...props}
    variant='icon'
    className={cn(
      'border-white/0 text-slate-100 hover:border-white/20 hover:bg-white/10 focus-visible:ring-slate-100 focus-visible:ring-offset-slate-950 dark:text-slate-100 dark:hover:border-white/20 dark:hover:bg-white/10 dark:focus-visible:ring-slate-100',
      className,
    )}
  />
)

export const SessionReplayModal = ({
  isOpen,
  onClose,
  projectId,
  psid,
  replay,
}: SessionReplayModalProps) => {
  const { t } = useTranslation('common')
  const { fetchSessionReplay, isLoading } = useSessionReplayProxy()
  const [payload, setPayload] = useState<SessionReplayResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPreparing, setIsPreparing] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [showTimeline, setShowTimeline] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null)
  const playerRoot = useRef<HTMLDivElement | null>(null)
  const previewRoot = useRef<HTMLDivElement | null>(null)
  const fullscreenRoot = useRef<HTMLDivElement | null>(null)
  const replayer = useRef<Replayer | null>(null)
  const previewReplayer = useRef<Replayer | null>(null)
  const previewSeekRaf = useRef<number | null>(null)
  const playStart = useRef({ offset: 0, at: 0, speed: 1 })
  const currentTimeRef = useRef(0)
  const speedRef = useRef(1)

  const events = useMemo(
    () => (payload?.events || []) as ReplayEvent[],
    [payload?.events],
  )
  const activeReplay = payload?.replay || replay || null
  const timelineSteps = useMemo(
    () => buildTimelineSteps(events, t),
    [events, t],
  )
  const hasEvents = events.length > 0
  const replayViewport = useMemo(() => getReplayViewport(events), [events])
  const previewScale = Math.min(
    1,
    PREVIEW_WIDTH / replayViewport.width,
    PREVIEW_HEIGHT / replayViewport.height,
  )
  const previewStyle = {
    '--replay-preview-width': `${replayViewport.width}px`,
    '--replay-preview-height': `${replayViewport.height}px`,
    '--replay-preview-scale': previewScale,
  } as CSSProperties
  const progressPercent =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0
  const activeStep = useMemo(
    () => getNearestStep(timelineSteps, currentTime),
    [currentTime, timelineSteps],
  )
  const previewStep = useMemo(
    () =>
      hoverPreview
        ? getNearestStep(timelineSteps, hoverPreview.offset)
        : null,
    [hoverPreview, timelineSteps],
  )
  const shouldShowPreview =
    Boolean(hoverPreview) && hasEvents && !error && duration > 0

  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    setIsPreparing(true)
    setPayload(null)
    setError(null)
    setDuration(0)
    setCurrentTime(0)
    setIsPlaying(false)
    setHoverPreview(null)

    fetchSessionReplay(projectId, psid, replay?.replayId)
      .then((result) => {
        if (cancelled) return
        if (!result) {
          setError(t('project.sessionReplay.loadError'))
          return
        }
        setPayload(result)
      })
      .catch((reason) => {
        if (cancelled) return
        setError(
          reason instanceof Error
            ? reason.message
            : t('project.sessionReplay.loadError'),
        )
      })
      .finally(() => {
        if (!cancelled) setIsPreparing(false)
      })

    return () => {
      cancelled = true
    }
  }, [fetchSessionReplay, isOpen, projectId, psid, replay?.replayId, t])

  useEffect(() => {
    if (!isOpen || !hasEvents || !playerRoot.current) return

    const root = playerRoot.current
    root.innerHTML = ''
    setIsPlaying(false)
    setCurrentTime(0)

    try {
      const instance = new Replayer(events as eventWithTime[], {
        root,
        speed: speedRef.current,
        insertStyleRules: ['html, body { background-color: #fff; }'],
      })
      replayer.current = instance
      const metadata = instance.getMetaData()
      const fallbackDuration =
        events.length > 1
          ? getTimestamp(events[events.length - 1]) - getTimestamp(events[0])
          : 0
      setDuration(Math.max(0, metadata.totalTime || fallbackDuration))
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t('project.sessionReplay.playerError'),
      )
    }

    return () => {
      replayer.current?.pause()
      replayer.current = null
      root.innerHTML = ''
    }
  }, [events, hasEvents, isOpen, t])

  useEffect(() => {
    if (!shouldShowPreview || !previewRoot.current) return

    const root = previewRoot.current
    root.innerHTML = ''

    try {
      previewReplayer.current = new Replayer(events as eventWithTime[], {
        root,
        speed: 1,
        mouseTail: false,
        insertStyleRules: ['html, body { background-color: #fff; }'],
        showWarning: false,
      })
    } catch {
      previewReplayer.current = null
      root.innerHTML = ''
    }

    return () => {
      if (previewSeekRaf.current) {
        window.cancelAnimationFrame(previewSeekRaf.current)
        previewSeekRaf.current = null
      }
      previewReplayer.current?.pause()
      previewReplayer.current = null
      root.innerHTML = ''
    }
  }, [events, shouldShowPreview])

  useEffect(() => {
    if (!hoverPreview || !previewReplayer.current) return

    if (previewSeekRaf.current) {
      window.cancelAnimationFrame(previewSeekRaf.current)
    }

    previewSeekRaf.current = window.requestAnimationFrame(() => {
      previewReplayer.current?.pause(hoverPreview.offset)
      previewSeekRaf.current = null
    })

    return () => {
      if (previewSeekRaf.current) {
        window.cancelAnimationFrame(previewSeekRaf.current)
        previewSeekRaf.current = null
      }
    }
  }, [hoverPreview])

  useEffect(() => {
    if (!isOpen || !isPlaying || duration <= 0) return

    const timer = window.setInterval(() => {
      const elapsed =
        (performance.now() - playStart.current.at) * playStart.current.speed
      const next = Math.min(duration, playStart.current.offset + elapsed)
      setCurrentTime(next)

      if (next >= duration) {
        replayer.current?.pause(duration)
        setIsPlaying(false)
      }
    }, 250)

    return () => window.clearInterval(timer)
  }, [duration, isOpen, isPlaying])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () =>
      document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const syncPlaybackOffset = useCallback(() => {
    if (!isPlaying) return currentTimeRef.current

    const elapsed =
      (performance.now() - playStart.current.at) * playStart.current.speed
    return Math.min(duration, playStart.current.offset + elapsed)
  }, [duration, isPlaying])

  const play = useCallback(() => {
    if (!replayer.current || duration <= 0) return

    const offset = Math.min(currentTimeRef.current, Math.max(0, duration - 1))
    replayer.current.play(offset)
    playStart.current = { offset, at: performance.now(), speed }
    setIsPlaying(true)
  }, [duration, speed])

  const pause = useCallback(() => {
    if (!replayer.current) return

    const offset = syncPlaybackOffset()
    replayer.current.pause(offset)
    setCurrentTime(offset)
    setIsPlaying(false)
  }, [syncPlaybackOffset])

  const seekTo = useCallback(
    (offset: number, shouldPlay = isPlaying) => {
      if (!replayer.current) return

      const nextOffset = Math.max(0, Math.min(duration, offset))
      if (shouldPlay) {
        replayer.current.play(nextOffset)
      } else {
        replayer.current.pause(nextOffset)
      }
      setCurrentTime(nextOffset)
      currentTimeRef.current = nextOffset

      if (shouldPlay) {
        playStart.current = {
          offset: nextOffset,
          at: performance.now(),
          speed,
        }
        setIsPlaying(true)
      } else {
        setIsPlaying(false)
      }
    },
    [duration, isPlaying, speed],
  )

  const updateHoverPreview = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!hasEvents || error || duration <= 0) {
        setHoverPreview(null)
        return
      }

      const rect = event.currentTarget.getBoundingClientRect()
      const percent = Math.max(
        0,
        Math.min(1, (event.clientX - rect.left) / rect.width),
      )
      const offset = Math.min(
        duration,
        Math.max(
          0,
          Math.round((percent * duration) / PREVIEW_SEEK_STEP_MS) *
            PREVIEW_SEEK_STEP_MS,
        ),
      )

      setHoverPreview((value) => {
        if (
          value &&
          Math.abs(value.offset - offset) < 1 &&
          Math.abs(value.percent - percent) < 0.005
        ) {
          return value
        }

        return { offset, percent }
      })
    },
    [duration, error, hasEvents],
  )

  const setPlaybackSpeed = (nextSpeed: number) => {
    const offset = syncPlaybackOffset()
    setSpeed(nextSpeed)
    replayer.current?.setConfig({ speed: nextSpeed })
    setCurrentTime(offset)

    if (isPlaying) {
      replayer.current?.play(offset)
      playStart.current = {
        offset,
        at: performance.now(),
        speed: nextSpeed,
      }
    }
  }

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await fullscreenRoot.current?.requestFullscreen()
      }
    } catch {
      toast.error(t('project.sessionReplay.fullscreenError'))
    }
  }

  const downloadScreenshot = async () => {
    try {
      const iframe = playerRoot.current?.querySelector('iframe')
      const doc = iframe?.contentDocument
      if (!iframe || !doc) {
        throw new Error('Replay frame is unavailable')
      }

      const width = iframe.clientWidth || doc.documentElement.clientWidth
      const height = iframe.clientHeight || doc.documentElement.clientHeight
      const serialized = new XMLSerializer().serializeToString(
        doc.documentElement,
      )
      const svg = new Blob(
        [
          `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`,
        ],
        { type: 'image/svg+xml;charset=utf-8' },
      )
      const url = URL.createObjectURL(svg)
      const image = new Image()

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('Screenshot failed'))
        image.src = url
      })

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Screenshot failed')
      context.drawImage(image, 0, 0, width, height)
      URL.revokeObjectURL(url)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png'),
      )
      if (!blob) throw new Error('Screenshot failed')

      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `swetrix-replay-${psid}.png`
      link.click()
      URL.revokeObjectURL(link.href)
      toast.success(t('project.sessionReplay.screenshotDownloaded'))
    } catch {
      toast.error(t('project.sessionReplay.screenshotError'))
    }
  }

  const close = () => {
    replayer.current?.pause()
    setIsPlaying(false)
    setHoverPreview(null)
    onClose()
  }

  const replayDuration =
    activeReplay?.replayDuration && activeReplay.replayDuration > 0
      ? getStringFromTime(getTimeFromSeconds(activeReplay.replayDuration))
      : formatReplayTime(duration)
  const canControlReplay = hasEvents && !error && duration > 0

  return (
    <Dialog className='relative z-50' open={isOpen} onClose={close}>
      <DialogBackdrop
        transition
        className='fixed inset-0 bg-gray-900/40 backdrop-blur-[2px] transition-opacity duration-200 data-closed:opacity-0 dark:bg-black/60'
      />
      <div className='fixed inset-0 z-10 flex items-center justify-center p-3 sm:p-6'>
        <DialogPanel
          ref={fullscreenRoot}
          transition
          className={cn(
            'flex h-[min(94dvh,940px)] w-[min(98vw,1440px)] flex-col overflow-hidden rounded-xl bg-white ring-1 ring-gray-200/80 transition-all duration-200 data-closed:translate-y-2 data-closed:scale-[0.98] data-closed:opacity-0 dark:bg-slate-950 dark:ring-slate-700/60',
            isFullscreen && 'h-screen! w-screen! rounded-none',
          )}
        >
          <div className='flex min-h-16 items-center justify-between gap-3 border-b border-gray-200 px-4 dark:border-slate-800'>
            <div className='flex min-w-0 items-center gap-3'>
              <span className='hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 ring-1 ring-gray-200/80 sm:flex dark:bg-slate-900 dark:ring-slate-700/70'>
                <PlayIcon
                  className='size-4.5 text-gray-700 dark:text-slate-200'
                  weight='duotone'
                  aria-hidden
                />
              </span>
              <div className='min-w-0'>
                <DialogTitle
                  as='h2'
                  className='truncate text-base leading-5 font-semibold text-gray-950 dark:text-gray-50'
                >
                  {t('project.sessionReplay.title')}
                </DialogTitle>
                <div className='mt-1 flex min-w-0 flex-wrap items-center gap-2'>
                  <Text size='xs' colour='secondary' truncate>
                    {activeReplay
                      ? t('project.sessionReplay.summary', {
                          events: activeReplay.eventCount.toLocaleString(),
                          duration: replayDuration,
                        })
                      : psid}
                  </Text>
                  {activeStep ? (
                    <Badge
                      colour='slate'
                      size='sm'
                      label={
                        <span className='inline-flex items-center gap-1 tabular-nums'>
                          <ClockIcon className='size-3' aria-hidden />
                          {formatReplayTime(currentTime)}
                        </span>
                      }
                    />
                  ) : null}
                </div>
              </div>
            </div>
            <div className='flex shrink-0 items-center gap-2'>
              <Button
                variant='secondary'
                size='sm'
                aria-expanded={showTimeline}
                onClick={() => setShowTimeline((value) => !value)}
                className='hidden items-center gap-2 sm:inline-flex'
              >
                <ListBulletsIcon className='size-4' aria-hidden />
                {t('project.sessionReplay.timeline.title')}
                <Badge
                  colour='slate'
                  size='sm'
                  label={timelineSteps.length.toLocaleString()}
                  className='ml-0.5'
                />
                <CaretDownIcon
                  className={cn(
                    'size-3.5 transition-transform duration-150 ease-out motion-reduce:transition-none',
                    showTimeline && 'rotate-180',
                  )}
                  aria-hidden
                />
              </Button>
              <Button
                variant='icon'
                aria-label={t('common.close')}
                onClick={close}
              >
                <XIcon className='size-4' />
              </Button>
            </div>
          </div>

          <div
            className={cn(
              'grid min-h-0 flex-1 gap-0 bg-gray-50 dark:bg-slate-950',
              showTimeline
                ? 'grid-rows-[minmax(0,1fr)_minmax(220px,34dvh)] xl:grid-cols-[minmax(0,1fr)_340px] xl:grid-rows-1'
                : 'grid-cols-1',
            )}
          >
            <div className='min-h-0 p-2 sm:p-3 lg:p-4'>
              <div className='relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-lg bg-slate-950 ring-1 ring-slate-900/80 dark:ring-slate-700/70'>
                <div className='relative min-h-0 flex-1 bg-slate-950'>
                  {isPreparing || isLoading ? (
                    <div className='absolute inset-0 z-30 flex items-center justify-center bg-slate-950/70'>
                      <Loader />
                    </div>
                  ) : null}
                  {!isPreparing && error ? (
                    <div className='absolute inset-0 z-20 flex items-center justify-center px-6 text-center'>
                      <div className='max-w-md'>
                        <WarningCircleIcon
                          className='mx-auto mb-3 size-8 text-amber-400'
                          weight='duotone'
                        />
                        <Text
                          colour='inherit'
                          weight='semibold'
                          className='text-white'
                        >
                          {t('project.sessionReplay.loadError')}
                        </Text>
                        <Text as='p' size='sm' className='mt-1 text-slate-300'>
                          {error}
                        </Text>
                      </div>
                    </div>
                  ) : null}
                  {!isPreparing && !error && payload && !hasEvents ? (
                    <div className='absolute inset-0 z-20 flex items-center justify-center px-6 text-center'>
                      <Text
                        colour='inherit'
                        weight='semibold'
                        className='text-white'
                      >
                        {t('project.sessionReplay.empty')}
                      </Text>
                    </div>
                  ) : null}
                  {activeStep && hasEvents && !error ? (
                    <div className='absolute top-3 left-3 z-20 max-w-[min(420px,calc(100%-1.5rem))] rounded-md bg-slate-950/90 px-2.5 py-2 ring-1 ring-white/10'>
                      <div className='flex min-w-0 items-center gap-2'>
                        {(() => {
                          const { Icon, iconClass } = getTimelineMeta(
                            activeStep.kind,
                          )
                          return (
                            <Icon
                              className={cn('size-4 shrink-0', iconClass)}
                              weight='duotone'
                              aria-hidden
                            />
                          )
                        })()}
                        <Text
                          as='span'
                          size='xs'
                          colour='inherit'
                          weight='medium'
                          className='min-w-0 truncate text-slate-100'
                        >
                          {activeStep.label}
                        </Text>
                        <Text
                          as='span'
                          size='xs'
                          colour='inherit'
                          className='shrink-0 text-slate-400 tabular-nums'
                        >
                          {formatReplayTime(activeStep.offset)}
                        </Text>
                      </div>
                    </div>
                  ) : null}
                  <div
                    ref={playerRoot}
                    className={cn(
                      'rrweb-player-root h-full w-full',
                      (!hasEvents || error) && 'hidden',
                    )}
                  />
                </div>

                <div className='border-t border-white/10 bg-slate-950 px-3 py-3 text-slate-100'>
                  <div className='grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2'>
                    <Text
                      as='span'
                      size='xs'
                      colour='inherit'
                      className='text-slate-300 tabular-nums'
                    >
                      {formatReplayTime(currentTime)}
                    </Text>
                    <div
                      className='relative h-7'
                      onMouseMove={updateHoverPreview}
                      onMouseLeave={() => setHoverPreview(null)}
                    >
                      {shouldShowPreview && hoverPreview ? (
                        <div
                          className='pointer-events-none absolute bottom-full z-40 mb-2 w-56 rounded-lg bg-slate-950 p-1.5 ring-1 ring-white/15'
                          style={{
                            left: `${hoverPreview.percent * 100}%`,
                            transform:
                              hoverPreview.percent < 0.14
                                ? 'translateX(0)'
                                : hoverPreview.percent > 0.86
                                  ? 'translateX(-100%)'
                                  : 'translateX(-50%)',
                          }}
                        >
                          <div className='aspect-video overflow-hidden rounded-md bg-white'>
                            <div
                              ref={previewRoot}
                              className='rrweb-preview-root h-full w-full'
                              style={previewStyle}
                            />
                          </div>
                          <div className='mt-1.5 flex items-center justify-between gap-2 px-1'>
                            <Text
                              as='span'
                              size='xs'
                              colour='inherit'
                              weight='semibold'
                              className='text-slate-100 tabular-nums'
                            >
                              {formatReplayTime(hoverPreview.offset)}
                            </Text>
                            {previewStep ? (
                              <Text
                                as='span'
                                size='xs'
                                colour='inherit'
                                className='min-w-0 truncate text-slate-400'
                              >
                                {previewStep.label}
                              </Text>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                      <div className='absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/15'>
                        <div
                          className='h-full rounded-full bg-slate-100'
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      {duration > 0
                        ? timelineSteps.map((step) => {
                            const { markerClass } = getTimelineMeta(step.kind)
                            return (
                              <span
                                key={step.id}
                                className={cn(
                                  'absolute top-1/2 h-2 w-px -translate-y-1/2 rounded-full opacity-80',
                                  markerClass,
                                )}
                                style={{
                                  left: `${Math.min(
                                    100,
                                    Math.max(0, (step.offset / duration) * 100),
                                  )}%`,
                                }}
                                aria-hidden
                              />
                            )
                          })
                        : null}
                      <input
                        type='range'
                        aria-label={t('project.sessionReplay.timeline.title')}
                        min={0}
                        max={Math.max(duration, 1)}
                        step={250}
                        value={Math.min(currentTime, duration)}
                        onChange={(event) =>
                          seekTo(Number(event.currentTarget.value), false)
                        }
                        disabled={!canControlReplay}
                        className='replay-scrubber absolute inset-0 h-full w-full appearance-none bg-transparent'
                      />
                    </div>
                    <Text
                      as='span'
                      size='xs'
                      colour='inherit'
                      className='text-slate-300 tabular-nums'
                    >
                      {formatReplayTime(duration)}
                    </Text>
                  </div>

                  <div className='mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='flex min-w-0 items-center gap-1.5'>
                      <Tooltip
                        asChild
                        text={isPlaying ? t('common.pause') : t('common.play')}
                        tooltipNode={
                          <PlayerIconButton
                            aria-label={
                              isPlaying ? t('common.pause') : t('common.play')
                            }
                            onClick={isPlaying ? pause : play}
                            disabled={!canControlReplay}
                          >
                            {isPlaying ? (
                              <PauseIcon className='size-4' />
                            ) : (
                              <PlayIcon className='size-4' />
                            )}
                          </PlayerIconButton>
                        }
                      />
                      <Tooltip
                        asChild
                        text={t('project.sessionReplay.back10')}
                        tooltipNode={
                          <PlayerIconButton
                            aria-label={t('project.sessionReplay.back10')}
                            onClick={() => seekTo(currentTime - 10000)}
                            disabled={!canControlReplay}
                          >
                            <RewindIcon className='size-4' />
                          </PlayerIconButton>
                        }
                      />
                      <Tooltip
                        asChild
                        text={t('project.sessionReplay.forward10')}
                        tooltipNode={
                          <PlayerIconButton
                            aria-label={t('project.sessionReplay.forward10')}
                            onClick={() => seekTo(currentTime + 10000)}
                            disabled={!canControlReplay}
                          >
                            <FastForwardIcon className='size-4' />
                          </PlayerIconButton>
                        }
                      />
                      <Text
                        as='span'
                        size='xs'
                        colour='inherit'
                        className='ml-1 hidden min-w-0 text-slate-400 sm:block'
                        truncate
                      >
                        {activeStep?.detail || activeStep?.label || psid}
                      </Text>
                    </div>

                    <div className='flex flex-wrap items-center gap-1.5 sm:justify-end'>
                      <fieldset className='flex rounded-md bg-white/5 p-0.5 ring-1 ring-white/10'>
                        <legend className='sr-only'>
                          {t('project.sessionReplay.speed')}
                        </legend>
                        {SPEEDS.map((item) => (
                          <button
                            key={item}
                            type='button'
                            onClick={() => setPlaybackSpeed(item)}
                            disabled={!canControlReplay}
                            className={cn(
                              'rounded px-2 py-1 text-xs leading-4 font-medium text-slate-300 transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-slate-100 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
                              speed === item
                                ? 'bg-slate-100 text-slate-950'
                                : 'hover:bg-white/10 hover:text-slate-100',
                            )}
                          >
                            {item}x
                          </button>
                        ))}
                      </fieldset>
                      <Tooltip
                        asChild
                        text={
                          showTimeline
                            ? t('project.sessionReplay.hideTimeline')
                            : t('project.sessionReplay.showTimeline')
                        }
                        tooltipNode={
                          <PlayerIconButton
                            aria-label={
                              showTimeline
                                ? t('project.sessionReplay.hideTimeline')
                                : t('project.sessionReplay.showTimeline')
                            }
                            aria-expanded={showTimeline}
                            onClick={() => setShowTimeline((value) => !value)}
                          >
                            <ListBulletsIcon className='size-4' />
                          </PlayerIconButton>
                        }
                      />
                      <Tooltip
                        asChild
                        text={t('project.sessionReplay.screenshot')}
                        tooltipNode={
                          <PlayerIconButton
                            aria-label={t('project.sessionReplay.screenshot')}
                            onClick={downloadScreenshot}
                            disabled={!canControlReplay}
                          >
                            <CameraIcon className='size-4' />
                          </PlayerIconButton>
                        }
                      />
                      <Tooltip
                        asChild
                        text={
                          isFullscreen
                            ? t('project.sessionReplay.exitFullscreen')
                            : t('project.sessionReplay.fullscreen')
                        }
                        tooltipNode={
                          <PlayerIconButton
                            aria-label={
                              isFullscreen
                                ? t('project.sessionReplay.exitFullscreen')
                                : t('project.sessionReplay.fullscreen')
                            }
                            onClick={toggleFullscreen}
                          >
                            {isFullscreen ? (
                              <ArrowsInIcon className='size-4' />
                            ) : (
                              <ArrowsOutIcon className='size-4' />
                            )}
                          </PlayerIconButton>
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {showTimeline ? (
              <aside className='min-h-0 border-t border-gray-200 bg-white xl:border-t-0 xl:border-l dark:border-slate-800 dark:bg-slate-950'>
                <div className='flex h-12 items-center justify-between gap-3 border-b border-gray-200 px-4 dark:border-slate-800'>
                  <div className='min-w-0'>
                    <Text as='h3' size='sm' weight='semibold' truncate>
                      {t('project.sessionReplay.timeline.title')}
                    </Text>
                    <Text size='xs' colour='secondary' className='tabular-nums'>
                      {t('project.sessionReplay.timeline.steps', {
                        count: timelineSteps.length,
                      })}
                    </Text>
                  </div>
                  <Button
                    variant='icon'
                    aria-label={t('project.sessionReplay.hideTimeline')}
                    onClick={() => setShowTimeline(false)}
                  >
                    <XIcon className='size-4' />
                  </Button>
                </div>
                <div className='h-[calc(100%-3rem)] overflow-y-auto px-3 py-3'>
                  {timelineSteps.length ? (
                    <ol>
                      {timelineSteps.map((step, index) => (
                        <TimelineEventItem
                          key={step.id}
                          step={step}
                          isActive={activeStep?.id === step.id}
                          isLast={index === timelineSteps.length - 1}
                          onSeek={seekTo}
                        />
                      ))}
                    </ol>
                  ) : (
                    <div className='flex h-full flex-col items-center justify-center gap-2 px-4 text-center'>
                      <ListBulletsIcon
                        className='size-6 text-gray-400 dark:text-slate-500'
                        weight='duotone'
                        aria-hidden
                      />
                      <Text as='p' size='sm' colour='secondary'>
                        {t('project.sessionReplay.timeline.empty')}
                      </Text>
                    </div>
                  )}
                </div>
              </aside>
            ) : null}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

export default SessionReplayModal
