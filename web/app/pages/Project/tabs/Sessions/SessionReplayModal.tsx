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
  CaretRightIcon,
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

const timelineIcon = (kind: TimelineStep['kind']) => {
  if (kind === 'click') return CursorClickIcon
  if (kind === 'input') return TextTIcon
  if (kind === 'scroll' || kind === 'resize') return CaretRightIcon
  if (kind === 'mutation') return ListBulletsIcon
  if (kind === 'navigation' || kind === 'snapshot') return PlayIcon
  return ListBulletsIcon
}

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
  const [showTimeline, setShowTimeline] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const playerRoot = useRef<HTMLDivElement | null>(null)
  const fullscreenRoot = useRef<HTMLDivElement | null>(null)
  const replayer = useRef<Replayer | null>(null)
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
    onClose()
  }

  const replayDuration =
    activeReplay?.replayDuration && activeReplay.replayDuration > 0
      ? getStringFromTime(getTimeFromSeconds(activeReplay.replayDuration))
      : formatReplayTime(duration)

  return (
    <Dialog className='relative z-50' open={isOpen} onClose={close}>
      <DialogBackdrop
        transition
        className='fixed inset-0 bg-gray-950/60 backdrop-blur-[2px] transition-opacity duration-200 data-closed:opacity-0 dark:bg-black/75'
      />
      <div className='fixed inset-0 z-10 flex items-center justify-center p-3 sm:p-6'>
        <DialogPanel
          ref={fullscreenRoot}
          transition
          className={cn(
            'flex h-[min(92dvh,900px)] w-[min(96vw,1280px)] flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-gray-200 transition-all duration-200 data-closed:translate-y-2 data-closed:scale-[0.98] data-closed:opacity-0 dark:bg-slate-950 dark:ring-slate-800',
            isFullscreen && 'h-screen! w-screen! rounded-none',
          )}
        >
          <div className='flex min-h-14 items-center justify-between gap-3 border-b border-gray-200 px-4 dark:border-slate-800'>
            <div className='min-w-0'>
              <DialogTitle
                as='h2'
                className='truncate text-base font-semibold text-gray-950 dark:text-gray-50'
              >
                {t('project.sessionReplay.title')}
              </DialogTitle>
              <Text size='xs' colour='secondary' truncate>
                {activeReplay
                  ? t('project.sessionReplay.summary', {
                      events: activeReplay.eventCount.toLocaleString(),
                      duration: replayDuration,
                    })
                  : psid}
              </Text>
            </div>
            <Button
              variant='icon'
              aria-label={t('common.close')}
              onClick={close}
              className='shrink-0'
            >
              <XIcon className='size-4' />
            </Button>
          </div>

          <div
            className={cn(
              'grid min-h-0 flex-1 gap-0 bg-gray-50 dark:bg-slate-950',
              showTimeline
                ? 'lg:grid-cols-[minmax(0,1fr)_280px]'
                : 'grid-cols-1',
            )}
          >
            <div className='min-h-0 p-3'>
              <div className='relative flex h-full min-h-[360px] items-center justify-center overflow-hidden rounded-lg bg-slate-950 ring-1 ring-slate-900/70 dark:ring-slate-800'>
                {isPreparing || isLoading ? <Loader /> : null}
                {!isPreparing && error ? (
                  <div className='max-w-md px-6 text-center'>
                    <WarningCircleIcon className='mx-auto mb-3 size-8 text-amber-400' />
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
                ) : null}
                {!isPreparing && !error && payload && !hasEvents ? (
                  <div className='max-w-md px-6 text-center'>
                    <Text
                      colour='inherit'
                      weight='semibold'
                      className='text-white'
                    >
                      {t('project.sessionReplay.empty')}
                    </Text>
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
            </div>

            {showTimeline ? (
              <aside className='min-h-0 border-t border-gray-200 bg-white lg:border-t-0 lg:border-l dark:border-slate-800 dark:bg-slate-950'>
                <div className='flex h-11 items-center justify-between border-b border-gray-200 px-3 dark:border-slate-800'>
                  <Text size='sm' weight='semibold'>
                    {t('project.sessionReplay.timeline.title')}
                  </Text>
                  <Text size='xs' colour='secondary'>
                    {timelineSteps.length}
                  </Text>
                </div>
                <div className='max-h-48 overflow-y-auto px-2 py-2 lg:max-h-[calc(100%-2.75rem)]'>
                  {timelineSteps.length ? (
                    timelineSteps.map((step) => {
                      const Icon = timelineIcon(step.kind)
                      return (
                        <button
                          key={step.id}
                          type='button'
                          onClick={() => seekTo(step.offset, false)}
                          className='flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-gray-100 dark:hover:bg-slate-900'
                        >
                          <Icon className='mt-0.5 size-4 shrink-0 text-gray-500 dark:text-slate-400' />
                          <span className='min-w-0 flex-1'>
                            <Text size='xs' weight='medium' truncate>
                              {step.label}
                            </Text>
                            {step.detail ? (
                              <Text size='xs' colour='secondary' truncate>
                                {step.detail}
                              </Text>
                            ) : null}
                          </span>
                          <Text
                            size='xs'
                            colour='secondary'
                            className='shrink-0'
                          >
                            {formatReplayTime(step.offset)}
                          </Text>
                        </button>
                      )
                    })
                  ) : (
                    <Text size='sm' colour='secondary' className='px-2 py-3'>
                      {t('project.sessionReplay.timeline.empty')}
                    </Text>
                  )}
                </div>
              </aside>
            ) : null}
          </div>

          <div className='border-t border-gray-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950'>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
              <div className='flex items-center gap-1.5'>
                <Tooltip
                  asChild
                  text={isPlaying ? t('common.pause') : t('common.play')}
                  tooltipNode={
                    <Button
                      variant='icon'
                      aria-label={
                        isPlaying ? t('common.pause') : t('common.play')
                      }
                      onClick={isPlaying ? pause : play}
                      disabled={!hasEvents || Boolean(error)}
                    >
                      {isPlaying ? (
                        <PauseIcon className='size-4' />
                      ) : (
                        <PlayIcon className='size-4' />
                      )}
                    </Button>
                  }
                />
                <Tooltip
                  asChild
                  text={t('project.sessionReplay.back10')}
                  tooltipNode={
                    <Button
                      variant='icon'
                      aria-label={t('project.sessionReplay.back10')}
                      onClick={() => seekTo(currentTime - 10000)}
                      disabled={!hasEvents || Boolean(error)}
                    >
                      <RewindIcon className='size-4' />
                    </Button>
                  }
                />
                <Tooltip
                  asChild
                  text={t('project.sessionReplay.forward10')}
                  tooltipNode={
                    <Button
                      variant='icon'
                      aria-label={t('project.sessionReplay.forward10')}
                      onClick={() => seekTo(currentTime + 10000)}
                      disabled={!hasEvents || Boolean(error)}
                    >
                      <FastForwardIcon className='size-4' />
                    </Button>
                  }
                />
              </div>

              <div className='grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2'>
                <Text size='xs' colour='secondary'>
                  {formatReplayTime(currentTime)}
                </Text>
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
                  disabled={!hasEvents || Boolean(error)}
                  className='h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:accent-slate-100'
                />
                <Text size='xs' colour='secondary'>
                  {formatReplayTime(duration)}
                </Text>
              </div>

              <div className='flex flex-wrap items-center gap-2'>
                <select
                  value={speed}
                  onChange={(event) =>
                    setPlaybackSpeed(Number(event.currentTarget.value))
                  }
                  disabled={!hasEvents || Boolean(error)}
                  aria-label={t('project.sessionReplay.speed')}
                  className='h-9 rounded-md border border-gray-300 bg-gray-50 px-2 text-xs font-medium text-gray-900 transition-colors outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100 dark:focus:ring-slate-300'
                >
                  {SPEEDS.map((item) => (
                    <option key={item} value={item}>
                      {item}x
                    </option>
                  ))}
                </select>
                <Tooltip
                  asChild
                  text={
                    showTimeline
                      ? t('project.sessionReplay.hideTimeline')
                      : t('project.sessionReplay.showTimeline')
                  }
                  tooltipNode={
                    <Button
                      variant='icon'
                      aria-label={
                        showTimeline
                          ? t('project.sessionReplay.hideTimeline')
                          : t('project.sessionReplay.showTimeline')
                      }
                      onClick={() => setShowTimeline((value) => !value)}
                    >
                      <ListBulletsIcon className='size-4' />
                    </Button>
                  }
                />
                <Tooltip
                  asChild
                  text={t('project.sessionReplay.screenshot')}
                  tooltipNode={
                    <Button
                      variant='icon'
                      aria-label={t('project.sessionReplay.screenshot')}
                      onClick={downloadScreenshot}
                      disabled={!hasEvents || Boolean(error)}
                    >
                      <CameraIcon className='size-4' />
                    </Button>
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
                    <Button
                      variant='icon'
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
                    </Button>
                  }
                />
              </div>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

export default SessionReplayModal
