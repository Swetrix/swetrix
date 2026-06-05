import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react'
import {
  CameraIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckIcon,
  CornersInIcon,
  CornersOutIcon,
  CursorClickIcon,
  DownloadSimpleIcon,
  GaugeIcon,
  GearSixIcon,
  ListBulletsIcon,
  PauseIcon,
  PlayIcon,
  TextTIcon,
  TrashIcon,
  WarningOctagonIcon,
  XIcon,
} from '@phosphor-icons/react'
import type { TFunction } from 'i18next'
import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ElementType,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Replayer, ReplayerEvents } from 'dom-player'
import type { eventWithTime } from 'dom-player'
import './replayPlayer.css'
import { toast } from 'sonner'

import type {
  SessionReplayExportResponse,
  SessionReplayMetadata,
  SessionReplayResponse,
} from '~/api/api.server'
import {
  useDeleteSessionReplayProxy,
  useSessionReplayExportProxy,
  useSessionReplayProxy,
} from '~/hooks/useAnalyticsProxy'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import Button from '~/ui/Button'
import Loader from '~/ui/Loader'
import Modal from '~/ui/Modal'
import { Switch } from '~/ui/Switch'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { downloadBlob } from '~/utils/download'
import { cn } from '~/utils/generic'

import {
  formatAmount as formatPageflowAmount,
  PAGEFLOW_ICON_BY_TYPE,
  PAGEFLOW_ICON_COLOR_BY_TYPE,
  type PageflowEvent,
  type PageflowEventType,
} from './Pageflow'

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
const DEFAULT_REPLAY_VIEWPORT = { width: 1280, height: 720 }
const XHTML_XMLNS = 'http://www.w3.org/1999/xhtml'
const SCREENSHOT_ASSET_WAIT_MS = 1000
const EXPORT_POLL_INTERVAL_MS = 2000
const PLAYER_READY_FALLBACK_MS = 8000

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

interface PageflowMarker {
  id: string
  type: PageflowEventType
  offset: number
  percent: number
  label: string
  detail: string
}

interface HoverPreview {
  offset: number
  percent: number
}

interface ReplayViewport {
  width: number
  height: number
}

interface ReplayViewportChange extends ReplayViewport {
  offset: number
}

interface PlayerSize {
  width: number
  height: number
}

interface SessionReplayModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  psid: string
  replay?: SessionReplayMetadata | null
  replayId?: string
  pages?: PageflowEvent[]
  timeFormat: '12-hour' | '24-hour'
  onDeleted?: (replayId?: string) => void
}

const getTimestamp = (event?: ReplayEvent) =>
  typeof event?.timestamp === 'number' ? event.timestamp : 0

const formatReplayTime = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

const PAGEFLOW_EVENT_LABEL_DEFAULTS: Record<PageflowEventType, string> = {
  pageview: 'Pageview',
  event: 'Event',
  error: 'Error',
  sale: 'Sale',
  refund: 'Refund',
}

const PAGEFLOW_MARKER_CLASS =
  'bg-white/55 ring-white/35 group-hover:bg-white/85 group-focus-visible:bg-white/85'

const PAGEFLOW_SYNC_TOLERANCE_MS = 5000
const TIMEZONE_SUFFIX_PATTERN = /(?:z|[+-]\d{2}:?\d{2})$/i

const getPageflowTimestamp = (value?: string) => {
  if (!value) return Number.NaN
  const normalised = TIMEZONE_SUFFIX_PATTERN.test(value) ? value : `${value}Z`
  const timestamp = Date.parse(normalised)
  return Number.isFinite(timestamp) ? timestamp : Number.NaN
}

const isTransparentColour = (colour?: string) => {
  if (!colour) return true

  const normalised = colour.replace(/\s/g, '').toLowerCase()
  return (
    normalised === 'transparent' ||
    /^rgba?\(.+(?:,|\/)0(?:\.0+)?\)$/.test(normalised)
  )
}

const escapeSvgAttribute = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

const getElementStyle = (element: Element) =>
  'style' in element ? (element as HTMLElement | SVGElement).style : undefined

const isElementTag = (element: Element, tagName: string) =>
  element.tagName.toLowerCase() === tagName

const getReplayScreenshotBackground = (doc: Document) => {
  const view = doc.defaultView
  if (!view) return '#ffffff'

  const colours = [
    doc.body ? view.getComputedStyle(doc.body).backgroundColor : undefined,
    view.getComputedStyle(doc.documentElement).backgroundColor,
  ]

  return colours.find((colour) => !isTransparentColour(colour)) || '#ffffff'
}

const getReplayFrameSize = (iframe: HTMLIFrameElement, doc: Document) => {
  const width =
    Number(iframe.getAttribute('width')) ||
    iframe.clientWidth ||
    doc.documentElement.clientWidth ||
    DEFAULT_REPLAY_VIEWPORT.width
  const height =
    Number(iframe.getAttribute('height')) ||
    iframe.clientHeight ||
    doc.documentElement.clientHeight ||
    DEFAULT_REPLAY_VIEWPORT.height

  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  }
}

const getReplayScrollPosition = (iframe: HTMLIFrameElement, doc: Document) => ({
  x: Math.max(
    0,
    Math.round(
      iframe.contentWindow?.scrollX ||
        doc.documentElement.scrollLeft ||
        doc.body?.scrollLeft ||
        0,
    ),
  ),
  y: Math.max(
    0,
    Math.round(
      iframe.contentWindow?.scrollY ||
        doc.documentElement.scrollTop ||
        doc.body?.scrollTop ||
        0,
    ),
  ),
})

const waitForReplayScreenshotAssets = async (doc: Document) => {
  const fontPromise =
    doc.fonts?.ready.then(() => undefined).catch(() => undefined) ||
    Promise.resolve()
  const imagePromise = Promise.all(
    Array.from(doc.images, (image) => {
      if (image.complete) return Promise.resolve()

      return new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true })
        image.addEventListener('error', () => resolve(), { once: true })
      })
    }),
  ).then(() => undefined)
  const timeoutPromise = new Promise<void>((resolve) =>
    window.setTimeout(resolve, SCREENSHOT_ASSET_WAIT_MS),
  )

  await Promise.race([
    Promise.all([fontPromise, imagePromise]).then(() => undefined),
    timeoutPromise,
  ])
  await new Promise<void>((resolve) =>
    window.requestAnimationFrame(() => resolve()),
  )
}

const getReplayStylesheetText = (doc: Document) => {
  const rules: string[] = []

  Array.from(doc.styleSheets).forEach((sheet) => {
    try {
      Array.from(sheet.cssRules).forEach((rule) => rules.push(rule.cssText))
    } catch {
      return
    }
  })

  return rules.join('\n')
}

const inlineReplayElementStyle = (
  source: Element,
  target: Element,
  view: Window,
) => {
  const targetStyle = getElementStyle(target)
  if (!targetStyle) return

  const computed = view.getComputedStyle(source)
  for (let index = 0; index < computed.length; index += 1) {
    const property = computed.item(index)
    if (!property) continue

    targetStyle.setProperty(
      property,
      computed.getPropertyValue(property),
      computed.getPropertyPriority(property),
    )
  }
}

const copyReplayElementState = (source: Element, target: Element) => {
  if (isElementTag(source, 'input') && isElementTag(target, 'input')) {
    const sourceInput = source as HTMLInputElement
    const targetInput = target as HTMLInputElement

    targetInput.value = sourceInput.value
    targetInput.setAttribute('value', sourceInput.value)

    if (sourceInput.checked) {
      targetInput.setAttribute('checked', '')
    } else {
      targetInput.removeAttribute('checked')
    }
  } else if (
    isElementTag(source, 'textarea') &&
    isElementTag(target, 'textarea')
  ) {
    const sourceTextArea = source as HTMLTextAreaElement
    const targetTextArea = target as HTMLTextAreaElement

    targetTextArea.value = sourceTextArea.value
    targetTextArea.textContent = sourceTextArea.value
  } else if (isElementTag(source, 'select') && isElementTag(target, 'select')) {
    const sourceSelect = source as HTMLSelectElement
    const targetSelect = target as HTMLSelectElement

    Array.from(sourceSelect.options).forEach((option, index) => {
      const targetOption = targetSelect.options[index]
      if (!targetOption) return

      targetOption.selected = option.selected
      if (option.selected) {
        targetOption.setAttribute('selected', '')
      } else {
        targetOption.removeAttribute('selected')
      }
    })
  }
}

const replaceReplayCanvas = (
  source: Element,
  target: Element,
  doc: Document,
) => {
  if (!isElementTag(source, 'canvas') || !isElementTag(target, 'canvas')) {
    return
  }

  try {
    const sourceCanvas = source as HTMLCanvasElement
    const targetCanvas = target as HTMLCanvasElement
    const image = doc.createElement('img')
    image.src = sourceCanvas.toDataURL('image/png')
    image.width = sourceCanvas.width
    image.height = sourceCanvas.height
    image.style.cssText = targetCanvas.style.cssText
    targetCanvas.replaceWith(image)
  } catch {
    return
  }
}

const buildReplayScreenshotDocument = (
  doc: Document,
  backgroundColour: string,
) => {
  const view = doc.defaultView
  if (!view) throw new Error('Replay frame is unavailable')

  const cloneRoot = doc.documentElement.cloneNode(true) as HTMLElement
  cloneRoot.setAttribute('xmlns', XHTML_XMLNS)

  const sourceElements = [
    doc.documentElement,
    ...Array.from(doc.documentElement.querySelectorAll('*')),
  ]
  const cloneElements = [
    cloneRoot,
    ...Array.from(cloneRoot.querySelectorAll('*')),
  ]

  sourceElements.forEach((source, index) => {
    const target = cloneElements[index]
    if (!target) return

    inlineReplayElementStyle(source, target, view)
    copyReplayElementState(source, target)
    replaceReplayCanvas(source, target, doc)
  })

  let cloneHead = cloneRoot.querySelector('head')
  if (!cloneHead) {
    cloneHead = doc.createElement('head')
    cloneRoot.insertBefore(cloneHead, cloneRoot.firstChild)
  }

  const base = doc.createElement('base')
  base.href = doc.baseURI || window.location.href
  cloneHead.prepend(base)

  const stylesheetText = getReplayStylesheetText(doc)
  if (stylesheetText) {
    const style = doc.createElement('style')
    style.textContent = stylesheetText
    cloneHead.appendChild(style)
  }

  getElementStyle(cloneRoot)?.setProperty(
    'background-color',
    backgroundColour,
    'important',
  )
  const cloneBody = cloneRoot.querySelector('body')
  if (cloneBody) {
    getElementStyle(cloneBody)?.setProperty(
      'background-color',
      backgroundColour,
      'important',
    )
  }

  return cloneRoot
}

const buildReplayScreenshotSvg = (
  iframe: HTMLIFrameElement,
  doc: Document,
  width: number,
  height: number,
  backgroundColour: string,
) => {
  const cloneRoot = buildReplayScreenshotDocument(doc, backgroundColour)
  const scroll = getReplayScrollPosition(iframe, doc)
  const contentWidth = Math.max(
    width + scroll.x,
    doc.documentElement.scrollWidth,
    doc.body?.scrollWidth || 0,
  )
  const contentHeight = Math.max(
    height + scroll.y,
    doc.documentElement.scrollHeight,
    doc.body?.scrollHeight || 0,
  )
  const serialized = new XMLSerializer().serializeToString(cloneRoot)
  const fill = escapeSvgAttribute(backgroundColour)

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="${fill}"/>`,
    `<foreignObject x="${-scroll.x}" y="${-scroll.y}" width="${contentWidth}" height="${contentHeight}">`,
    serialized,
    '</foreignObject></svg>',
  ].join('')
}

const formatReplayStartDate = (
  timestamp: number,
  language: string,
  timeFormat: '12-hour' | '24-hour',
  timezone: string,
) => {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null

  return new Date(timestamp).toLocaleDateString(language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: timeFormat === '12-hour' ? 'h12' : 'h23',
    timeZone: timezone,
  })
}

const getPageflowEventLabel = (type: PageflowEventType, t: TFunction) =>
  String(
    t(`project.sessionReplay.timelineEvents.${type}`, {
      defaultValue: PAGEFLOW_EVENT_LABEL_DEFAULTS[type],
    }),
  )

const getPageflowEventDetail = (event: PageflowEvent, t: TFunction) => {
  if (event.type === 'sale' || event.type === 'refund') {
    const sign = event.type === 'refund' ? '-' : '+'
    const amount = `${sign}${formatPageflowAmount(
      event.amount || 0,
      event.currency,
    )}`
    return event.value ? `${amount} · ${event.value}` : amount
  }

  return event.value || String(t('common.notSet', { defaultValue: 'Not set' }))
}

const buildPageflowMarkers = (
  pages: PageflowEvent[] | undefined,
  replayStartTimestamp: number,
  duration: number,
  t: TFunction,
): PageflowMarker[] => {
  if (
    !pages?.length ||
    !Number.isFinite(replayStartTimestamp) ||
    replayStartTimestamp <= 0 ||
    duration <= 0
  ) {
    return []
  }

  return pages
    .flatMap((event, index) => {
      const timestamp = getPageflowTimestamp(event.created)
      const offset = timestamp - replayStartTimestamp

      if (
        !Number.isFinite(offset) ||
        offset < -PAGEFLOW_SYNC_TOLERANCE_MS ||
        offset > duration + PAGEFLOW_SYNC_TOLERANCE_MS
      ) {
        return []
      }

      const safeOffset = Math.min(duration, Math.max(0, offset))

      return {
        id: `${event.type}-${event.created}-${index}`,
        type: event.type,
        offset: safeOffset,
        percent: (safeOffset / duration) * 100,
        label: getPageflowEventLabel(event.type, t),
        detail: getPageflowEventDetail(event, t),
      }
    })
    .sort((a, b) => a.offset - b.offset)
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
  { Icon: ElementType; iconClass: string }
> = {
  navigation: {
    Icon: PlayIcon,
    iconClass: 'text-sky-600 dark:text-sky-400',
  },
  snapshot: {
    Icon: PlayIcon,
    iconClass: 'text-slate-600 dark:text-slate-300',
  },
  click: {
    Icon: CursorClickIcon,
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  scroll: {
    Icon: CaretRightIcon,
    iconClass: 'text-gray-600 dark:text-gray-300',
  },
  input: {
    Icon: TextTIcon,
    iconClass: 'text-indigo-600 dark:text-slate-300',
  },
  resize: {
    Icon: CaretRightIcon,
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  mutation: {
    Icon: ListBulletsIcon,
    iconClass: 'text-gray-500 dark:text-gray-400',
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

const getReplayViewportFromEvent = (
  event: ReplayEvent,
): ReplayViewport | null => {
  const width = Number(event.data?.width)
  const height = Number(event.data?.height)

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null
  }

  return { width, height }
}

const buildReplayViewportChanges = (
  events: ReplayEvent[],
): ReplayViewportChange[] => {
  const firstTimestamp = getTimestamp(events[0])
  const changes: ReplayViewportChange[] = []

  events.forEach((event) => {
    const isViewportEvent =
      event.type === EVENT_META ||
      (event.type === EVENT_INCREMENTAL &&
        event.data?.source === SOURCE_VIEWPORT_RESIZE)

    if (!isViewportEvent) return

    const viewport = getReplayViewportFromEvent(event)
    if (!viewport) return

    changes.push({
      ...viewport,
      offset: Math.max(0, getTimestamp(event) - firstTimestamp),
    })
  })

  return changes.length ? changes : [{ ...DEFAULT_REPLAY_VIEWPORT, offset: 0 }]
}

const getReplayViewportAt = (
  changes: ReplayViewportChange[],
  offset: number,
) => {
  let viewport = changes[0] || { ...DEFAULT_REPLAY_VIEWPORT, offset: 0 }

  for (const change of changes) {
    if (change.offset > offset) break
    viewport = change
  }

  return viewport
}

const getContainScale = (
  containerWidth: number,
  containerHeight: number,
  contentWidth: number,
  contentHeight: number,
) => {
  if (
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    contentWidth <= 0 ||
    contentHeight <= 0
  ) {
    return 1
  }

  return Math.max(
    0.01,
    Math.min(containerWidth / contentWidth, containerHeight / contentHeight),
  )
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
        <Button
          variant='ghost'
          focus={false}
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
              weight='medium'
              className='shrink-0 pt-0.5 tabular-nums'
            >
              {formatReplayTime(step.offset)}
            </Text>
          </span>
        </Button>
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
    focus={false}
    className={cn(
      'rounded-full border-white/0 p-2.5 text-slate-100 hover:border-white/0 hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-0 dark:text-slate-100 dark:hover:border-white/0 dark:hover:bg-white/15',
      className,
    )}
  />
)

const PageflowMarkerTooltip = ({ marker }: { marker: PageflowMarker }) => {
  const Icon = PAGEFLOW_ICON_BY_TYPE[marker.type]

  return (
    <div className='min-w-0'>
      <div className='flex min-w-0 items-center gap-1.5'>
        <Icon
          className={cn(
            'size-4 shrink-0',
            PAGEFLOW_ICON_COLOR_BY_TYPE[marker.type],
          )}
          weight='duotone'
          aria-hidden
        />
        <Text
          as='span'
          size='sm'
          weight='semibold'
          colour='primary'
          className='dark min-w-0 leading-4'
        >
          {marker.label}
        </Text>
      </div>
      <Text
        as='div'
        size='xs'
        colour='secondary'
        className='dark mt-1 max-w-64 leading-4 wrap-anywhere'
      >
        {marker.detail}
      </Text>
    </div>
  )
}

const PageflowMarkerButton = ({
  marker,
  onHover,
  onSeek,
}: {
  marker: PageflowMarker
  onHover: () => void
  onSeek: (offset: number, shouldPlay?: boolean) => void
}) => {
  const label = `${marker.label}: ${marker.detail}`

  return (
    <Tooltip
      asChild
      ariaLabel={label}
      delay={80}
      disableHoverableContent
      contentClassName='max-w-72 px-2.5 py-2 [--default-transition-duration:150ms]'
      text={<PageflowMarkerTooltip marker={marker} />}
      tooltipNode={
        <Button
          variant='ghost'
          focus={false}
          aria-label={label}
          onMouseEnter={onHover}
          onMouseMove={(event: ReactMouseEvent<HTMLButtonElement>) => {
            event.stopPropagation()
          }}
          onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
            event.stopPropagation()
            onSeek(marker.offset, false)
          }}
          className='group pointer-events-auto absolute top-1/2 h-5 w-4 -translate-x-1/2 -translate-y-1/2 justify-center border-transparent bg-transparent p-0 text-slate-100 hover:border-transparent hover:bg-transparent focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-0 focus-visible:outline-none dark:text-slate-100 dark:hover:border-transparent dark:hover:bg-transparent'
          style={{ left: `${marker.percent}%` }}
        >
          <span
            className={cn(
              'block h-3 w-1 rounded-full opacity-95 ring-1 ring-black/20 transition-[width,height,opacity,transform] duration-150 ease-out group-hover:h-4 group-hover:w-1.5 group-hover:opacity-100 group-focus-visible:h-4 group-focus-visible:w-1.5 motion-reduce:transition-none',
              PAGEFLOW_MARKER_CLASS,
            )}
          />
        </Button>
      }
    />
  )
}

const SETTINGS_ROW_CLASS =
  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-100 transition-colors duration-150 ease-out hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'

const SessionReplayModal = ({
  isOpen,
  onClose,
  projectId,
  psid,
  replay,
  replayId,
  pages = [],
  timeFormat,
  onDeleted,
}: SessionReplayModalProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { timezone } = useViewProjectContext()
  const { fetchSessionReplay, isLoading } = useSessionReplayProxy()
  const deleteReplayProxy = useDeleteSessionReplayProxy()
  const {
    startSessionReplayExport,
    getSessionReplayExportStatus,
    getSessionReplayExportDownloadUrl,
  } = useSessionReplayExportProxy()
  const [payload, setPayload] = useState<SessionReplayResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPreparing, setIsPreparing] = useState(false)
  const [isExportStarting, setIsExportStarting] = useState(false)
  const [exportStatus, setExportStatus] =
    useState<SessionReplayExportResponse | null>(null)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [showTimeline, setShowTimeline] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null)
  const [isPlayerHovered, setIsPlayerHovered] = useState(false)
  const [isControlsFocused, setIsControlsFocused] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [settingsView, setSettingsView] = useState<'main' | 'speed'>('main')
  const [bezel, setBezel] = useState<{
    kind: 'play' | 'pause'
    key: number
  } | null>(null)
  const [playerSize, setPlayerSize] = useState<PlayerSize>({
    width: 0,
    height: 0,
  })
  const playerRoot = useRef<HTMLDivElement | null>(null)
  const previewRoot = useRef<HTMLDivElement | null>(null)
  const settingsRef = useRef<HTMLDivElement | null>(null)
  const fullscreenRoot = useRef<HTMLDivElement | null>(null)
  const replayer = useRef<Replayer | null>(null)
  const previewReplayer = useRef<Replayer | null>(null)
  const previewSeekRaf = useRef<number | null>(null)
  const exportPollTimeout = useRef<number | null>(null)
  const exportAbortController = useRef<AbortController | null>(null)
  const isModalOpenRef = useRef(isOpen)
  const playStart = useRef({ offset: 0, at: 0, speed: 1 })
  const currentTimeRef = useRef(0)
  const speedRef = useRef(1)

  const events = useMemo(
    () => (payload?.events || []) as ReplayEvent[],
    [payload?.events],
  )
  const replayStartTimestamp = getTimestamp(events[0])
  const timelineSteps = useMemo(
    () => buildTimelineSteps(events, t),
    [events, t],
  )
  const hasEvents = events.length > 0
  const viewportChanges = useMemo(
    () => buildReplayViewportChanges(events),
    [events],
  )
  const activeReplayViewport = useMemo(
    () => getReplayViewportAt(viewportChanges, currentTime),
    [currentTime, viewportChanges],
  )
  const previewReplayViewport = useMemo(
    () =>
      getReplayViewportAt(viewportChanges, hoverPreview?.offset ?? currentTime),
    [currentTime, hoverPreview?.offset, viewportChanges],
  )
  const playerScale = getContainScale(
    playerSize.width,
    playerSize.height,
    activeReplayViewport.width,
    activeReplayViewport.height,
  )
  const playerStyle = {
    '--replay-player-width': `${activeReplayViewport.width}px`,
    '--replay-player-height': `${activeReplayViewport.height}px`,
    '--replay-player-scale': playerScale,
  } as CSSProperties
  const previewScale = Math.min(
    1,
    getContainScale(
      PREVIEW_WIDTH,
      PREVIEW_HEIGHT,
      previewReplayViewport.width,
      previewReplayViewport.height,
    ),
  )
  const previewStyle = {
    '--replay-preview-width': `${previewReplayViewport.width}px`,
    '--replay-preview-height': `${previewReplayViewport.height}px`,
    '--replay-preview-scale': previewScale,
  } as CSSProperties
  const progressPercent =
    duration > 0
      ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
      : 0
  const progressStyle = {
    '--replay-progress': `${progressPercent}%`,
    '--replay-progress-scale': progressPercent / 100,
  } as CSSProperties
  const activeStep = useMemo(
    () => getNearestStep(timelineSteps, currentTime),
    [currentTime, timelineSteps],
  )
  const pageflowMarkers = useMemo(
    () => buildPageflowMarkers(pages, replayStartTimestamp, duration, t),
    [duration, pages, replayStartTimestamp, t],
  )
  const replayStartDateTimestamp =
    replayStartTimestamp || getPageflowTimestamp(pages[0]?.created)
  const replayStartDate = useMemo(() => {
    return formatReplayStartDate(
      replayStartDateTimestamp,
      language,
      timeFormat,
      timezone,
    )
  }, [language, replayStartDateTimestamp, timeFormat, timezone])
  const shouldShowPreview =
    Boolean(hoverPreview) && hasEvents && !error && duration > 0
  const shouldShowReplayLoading =
    isPreparing || isLoading || (hasEvents && !error && !isPlayerReady)
  const canControlReplay = hasEvents && !error && duration > 0 && isPlayerReady
  const isReplayExporting =
    isExportStarting ||
    exportStatus?.status === 'queued' ||
    exportStatus?.status === 'processing'
  const exportProgress = Math.max(
    0,
    Math.min(100, Math.round(exportStatus?.progress || 0)),
  )
  const shouldShowControls =
    !shouldShowReplayLoading &&
    (!isPlaying ||
      isPlayerHovered ||
      isControlsFocused ||
      settingsOpen ||
      !canControlReplay)
  const speedLabel =
    speed === 1 ? t('project.sessionReplay.normalSpeed') : `${speed}×`
  const selectedReplayId = replayId || replay?.replayId
  const exportToastId = `session-replay-export-${psid}-${selectedReplayId || 'latest'}`

  const clearExportPoll = useCallback(() => {
    if (exportPollTimeout.current) {
      window.clearTimeout(exportPollTimeout.current)
      exportPollTimeout.current = null
    }
    exportAbortController.current?.abort()
    exportAbortController.current = null
  }, [])

  useEffect(() => {
    isModalOpenRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  useEffect(() => {
    if (!isOpen || !hasEvents || !playerRoot.current) return

    const root = playerRoot.current
    const updatePlayerSize = () => {
      const rect = root.getBoundingClientRect()
      const width = Math.round(rect.width)
      const height = Math.round(rect.height)

      setPlayerSize((value) =>
        value.width === width && value.height === height
          ? value
          : { width, height },
      )
    }

    updatePlayerSize()

    const observer = new ResizeObserver(updatePlayerSize)
    observer.observe(root)

    return () => observer.disconnect()
  }, [hasEvents, isOpen])

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    setIsPreparing(true)
    setPayload(null)
    setError(null)
    setDuration(0)
    setCurrentTime(0)
    setIsPlaying(false)
    setIsPlayerReady(false)
    setHoverPreview(null)
    setIsPlayerHovered(false)
    setIsControlsFocused(false)
    setPlayerSize({ width: 0, height: 0 })

    fetchSessionReplay(projectId, psid, selectedReplayId)
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
  }, [fetchSessionReplay, isOpen, projectId, psid, selectedReplayId, t])

  useEffect(() => {
    if (!isOpen || !hasEvents || !playerRoot.current) return

    const root = playerRoot.current
    root.innerHTML = ''
    setIsPlaying(false)
    setIsPlayerReady(false)
    setCurrentTime(0)
    let instance: Replayer | null = null
    let readyFallback: number | null = null
    let readyRaf: number | null = null

    const markPlayerReady = () => {
      if (readyFallback) {
        window.clearTimeout(readyFallback)
        readyFallback = null
      }

      if (readyRaf) return
      readyRaf = window.requestAnimationFrame(() => {
        readyRaf = null
        setIsPlayerReady(true)
      })
    }

    try {
      instance = new Replayer(events as eventWithTime[], {
        root,
        speed: speedRef.current,
        insertStyleRules: ['html, body { background-color: #fff; }'],
      })
      instance.on(ReplayerEvents.FullsnapshotRebuilded, markPlayerReady)
      replayer.current = instance
      const metadata = instance.getMetaData()
      const fallbackDuration =
        events.length > 1
          ? getTimestamp(events[events.length - 1]) - getTimestamp(events[0])
          : 0
      setDuration(Math.max(0, metadata.totalTime || fallbackDuration))

      if (events.some((event) => event.type === EVENT_FULL_SNAPSHOT)) {
        readyFallback = window.setTimeout(
          markPlayerReady,
          PLAYER_READY_FALLBACK_MS,
        )
      } else {
        markPlayerReady()
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t('project.sessionReplay.playerError'),
      )
    }

    return () => {
      if (readyFallback) window.clearTimeout(readyFallback)
      if (readyRaf) window.cancelAnimationFrame(readyRaf)
      instance?.off(ReplayerEvents.FullsnapshotRebuilded, markPlayerReady)
      instance?.pause()
      if (replayer.current === instance) replayer.current = null
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

  useEffect(() => {
    if (!settingsOpen) {
      setSettingsView('main')
      return
    }

    const onPointerDown = (event: PointerEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node | null)
      ) {
        setSettingsOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSettingsOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [settingsOpen])

  useEffect(() => {
    if (!isOpen) setSettingsOpen(false)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) return

    clearExportPoll()
    setIsExportStarting(false)
    setExportStatus(null)
  }, [clearExportPoll, isOpen])

  useEffect(() => {
    return () => clearExportPoll()
  }, [clearExportPoll])

  const flashBezel = useCallback((kind: 'play' | 'pause') => {
    setBezel({ kind, key: performance.now() })
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

  const togglePlayback = useCallback(() => {
    if (!canControlReplay) return

    if (isPlaying) {
      pause()
      flashBezel('pause')
    } else {
      play()
      flashBezel('play')
    }
  }, [canControlReplay, isPlaying, pause, play, flashBezel])

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

  const handlePlayerClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      if (!canControlReplay) return
      // Clicks on the controls bar / settings menu drive their own actions.
      if ((event.target as HTMLElement).closest('[data-replay-controls]')) {
        return
      }
      // First click outside an open settings menu only dismisses it.
      if (settingsOpen) {
        setSettingsOpen(false)
        return
      }
      togglePlayback()
    },
    [canControlReplay, settingsOpen, togglePlayback],
  )

  const handlePlayerKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (!canControlReplay) return
      // Let focused controls (scrubber, buttons, menu) handle their own keys.
      if ((event.target as HTMLElement).closest('[data-replay-controls]')) {
        return
      }

      if (event.key === ' ' || event.key === 'k') {
        event.preventDefault()
        togglePlayback()
      } else if (event.key === 'ArrowLeft' || event.key === 'j') {
        event.preventDefault()
        seekTo(Math.max(0, syncPlaybackOffset() - 5000))
      } else if (event.key === 'ArrowRight' || event.key === 'l') {
        event.preventDefault()
        seekTo(Math.min(duration, syncPlaybackOffset() + 5000))
      }
    },
    [canControlReplay, duration, seekTo, syncPlaybackOffset, togglePlayback],
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
      const iframe =
        replayer.current?.iframe || playerRoot.current?.querySelector('iframe')
      const doc = iframe?.contentDocument
      if (!iframe || !doc) {
        throw new Error('Replay frame is unavailable')
      }

      await waitForReplayScreenshotAssets(doc)

      const { width, height } = getReplayFrameSize(iframe, doc)
      const backgroundColour = getReplayScreenshotBackground(doc)
      const svgMarkup = buildReplayScreenshotSvg(
        iframe,
        doc,
        width,
        height,
        backgroundColour,
      )
      const svg = new Blob([svgMarkup], {
        type: 'image/svg+xml;charset=utf-8',
      })
      const url = URL.createObjectURL(svg)
      const image = new Image()

      try {
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve()
          image.onerror = () => reject(new Error('Screenshot failed'))
          image.src = url
        })
      } finally {
        URL.revokeObjectURL(url)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Screenshot failed')
      context.fillStyle = backgroundColour
      context.fillRect(0, 0, width, height)
      context.drawImage(image, 0, 0, width, height)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png'),
      )
      if (!blob) throw new Error('Screenshot failed')

      downloadBlob(blob, `swetrix-replay-${psid}.png`)
      toast.success(t('project.sessionReplay.screenshotDownloaded'))
    } catch {
      toast.error(t('project.sessionReplay.screenshotError'))
    }
  }

  const downloadExport = useCallback(
    (exportId: string) => {
      const anchor = document.createElement('a')
      anchor.href = getSessionReplayExportDownloadUrl(projectId, exportId)
      anchor.rel = 'noopener'
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
    },
    [getSessionReplayExportDownloadUrl, projectId],
  )

  const handleExportStatus = useCallback(
    (status: SessionReplayExportResponse) => {
      if (!isModalOpenRef.current) return true

      setExportStatus(status)

      if (status.status === 'ready') {
        clearExportPoll()
        setIsExportStarting(false)
        downloadExport(status.exportId)
        toast.success(t('project.sessionReplay.exportDownloaded'), {
          id: exportToastId,
        })
        setExportStatus(null)
        return true
      }

      if (status.status === 'failed' || status.status === 'expired') {
        clearExportPoll()
        setIsExportStarting(false)
        toast.error(status.error || t('project.sessionReplay.exportFailed'), {
          id: exportToastId,
        })
        setExportStatus(null)
        return true
      }

      toast.loading(
        t('project.sessionReplay.exportPreparingProgress', {
          progress: Math.max(0, Math.min(100, Math.round(status.progress))),
        }),
        { id: exportToastId },
      )

      return false
    },
    [clearExportPoll, downloadExport, exportToastId, t],
  )

  const startExportPolling = useCallback(
    (exportId: string) => {
      clearExportPoll()

      const poll = async () => {
        if (!isModalOpenRef.current) return

        const controller = new AbortController()
        exportAbortController.current = controller

        try {
          const status = await getSessionReplayExportStatus(
            projectId,
            exportId,
            controller.signal,
          )

          if (!isModalOpenRef.current || controller.signal.aborted) return
          if (handleExportStatus(status)) return

          if (!isModalOpenRef.current) return
          exportPollTimeout.current = window.setTimeout(
            poll,
            EXPORT_POLL_INTERVAL_MS,
          )
        } catch {
          if (!isModalOpenRef.current || controller.signal.aborted) return

          clearExportPoll()
          setIsExportStarting(false)
          setExportStatus(null)
          toast.error(t('project.sessionReplay.exportFailed'), {
            id: exportToastId,
          })
        } finally {
          if (exportAbortController.current === controller) {
            exportAbortController.current = null
          }
        }
      }

      if (isModalOpenRef.current) {
        exportPollTimeout.current = window.setTimeout(
          poll,
          EXPORT_POLL_INTERVAL_MS,
        )
      }
    },
    [
      clearExportPoll,
      exportToastId,
      getSessionReplayExportStatus,
      handleExportStatus,
      projectId,
      t,
    ],
  )

  const exportReplay = useCallback(async () => {
    if (!canControlReplay || isReplayExporting) return

    clearExportPoll()
    const controller = new AbortController()
    exportAbortController.current = controller
    setIsExportStarting(true)
    setSettingsOpen(false)
    toast.loading(t('project.sessionReplay.exportPreparing'), {
      id: exportToastId,
    })

    try {
      const status = await startSessionReplayExport(
        projectId,
        psid,
        selectedReplayId,
        controller.signal,
      )

      if (!isModalOpenRef.current || controller.signal.aborted) return

      setIsExportStarting(false)

      if (!handleExportStatus(status)) {
        startExportPolling(status.exportId)
      }
    } catch (reason) {
      if (!isModalOpenRef.current || controller.signal.aborted) return

      setIsExportStarting(false)
      setExportStatus(null)
      toast.error(
        reason instanceof Error
          ? reason.message
          : t('project.sessionReplay.exportFailed'),
        { id: exportToastId },
      )
    } finally {
      if (exportAbortController.current === controller) {
        exportAbortController.current = null
      }
    }
  }, [
    canControlReplay,
    clearExportPoll,
    exportToastId,
    handleExportStatus,
    isReplayExporting,
    projectId,
    psid,
    selectedReplayId,
    startExportPolling,
    startSessionReplayExport,
    t,
  ])

  const close = () => {
    isModalOpenRef.current = false
    replayer.current?.pause()
    clearExportPoll()
    setIsPlaying(false)
    setIsExportStarting(false)
    setExportStatus(null)
    setHoverPreview(null)
    setIsPlayerHovered(false)
    setIsControlsFocused(false)
    onClose()
  }

  const deleteReplay = async () => {
    if (!selectedReplayId || deleteReplayProxy.isLoading) return

    const result = await deleteReplayProxy.deleteSessionReplay(
      projectId,
      psid,
      selectedReplayId,
    )

    if (!result) {
      toast.error(
        deleteReplayProxy.error || t('project.sessionReplay.deleteFailed'),
      )
      return
    }

    setIsDeleteConfirmOpen(false)
    toast.success(t('project.sessionReplay.deleted'))
    onDeleted?.(selectedReplayId)
    close()
  }

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
            <div className='flex min-w-0 items-center'>
              <div className='min-w-0'>
                <DialogTitle as='h2' className='truncate'>
                  <Text
                    as='span'
                    size='base'
                    weight='semibold'
                    colour='primary'
                    className='block leading-5 text-gray-950 dark:text-gray-50'
                  >
                    {t('project.sessionReplay.title')}
                  </Text>
                </DialogTitle>
                {replayStartDate ? (
                  <time
                    dateTime={new Date(replayStartDateTimestamp).toISOString()}
                    className='block'
                  >
                    <Text
                      as='span'
                      size='xs'
                      colour='secondary'
                      className='leading-4'
                    >
                      {t('project.sessionStartedAt')}: {replayStartDate}
                    </Text>
                  </time>
                ) : null}
              </div>
            </div>
            <div className='flex shrink-0 items-center gap-2'>
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
            className='replay-layout min-h-0 flex-1 bg-black'
            data-timeline={showTimeline ? 'open' : 'closed'}
          >
            <div
              className='group/player relative min-h-[320px] bg-black'
              onMouseEnter={() => setIsPlayerHovered(true)}
              onMouseLeave={() => {
                setIsPlayerHovered(false)
                setHoverPreview(null)
              }}
            >
              {shouldShowReplayLoading ? (
                <div className='absolute inset-0 z-40 flex items-center justify-center bg-black/80 px-6 text-center'>
                  <Loader
                    className='flex-col gap-3 pt-0! text-slate-100'
                    label={t('project.sessionReplay.loading')}
                    labelClassName='text-sm font-medium text-slate-100'
                    showLabel
                    spinnerAlwaysLight
                    spinnerClassName='size-5'
                  />
                </div>
              ) : null}
              {!isPreparing && error ? (
                <div className='absolute inset-0 z-20 flex items-center justify-center px-6 text-center'>
                  <div className='max-w-md'>
                    <WarningOctagonIcon
                      className='mx-auto mb-3 size-8 text-amber-400'
                      weight='duotone'
                    />
                    <Text colour='primary' weight='semibold' className='dark'>
                      {t('project.sessionReplay.loadError')}
                    </Text>
                    <Text
                      as='p'
                      size='sm'
                      colour='secondary'
                      className='dark mt-1'
                    >
                      {error}
                    </Text>
                  </div>
                </div>
              ) : null}
              {!isPreparing && !error && payload && !hasEvents ? (
                <div className='absolute inset-0 z-20 flex items-center justify-center px-6 text-center'>
                  <Text colour='primary' weight='semibold' className='dark'>
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
                style={playerStyle}
              />

              {/*
               * Transparent layer above the replay iframe so clicks and keys reach
               * React; an iframe would otherwise swallow them.
               */}
              {canControlReplay ? (
                <button
                  type='button'
                  className='absolute inset-0 z-10 cursor-pointer border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-inset'
                  aria-label={t('project.sessionReplay.title')}
                  onClick={handlePlayerClick}
                  onKeyDown={handlePlayerKeyDown}
                />
              ) : null}

              {bezel ? (
                <div
                  className='pointer-events-none absolute inset-0 z-20 flex items-center justify-center'
                  aria-hidden
                >
                  <span
                    key={bezel.key}
                    onAnimationEnd={() => setBezel(null)}
                    className='replay-bezel flex size-16 items-center justify-center rounded-full bg-black/60'
                  >
                    {bezel.kind === 'play' ? (
                      <PlayIcon weight='fill' className='size-8 text-white' />
                    ) : (
                      <PauseIcon weight='fill' className='size-8 text-white' />
                    )}
                  </span>
                </div>
              ) : null}

              {canControlReplay && !isPlaying && !bezel ? (
                <div
                  className='pointer-events-none absolute inset-0 z-20 flex items-center justify-center'
                  aria-hidden
                >
                  <span className='flex size-16 items-center justify-center rounded-full bg-black/55 ring-1 ring-white/10 transition-transform duration-150 ease-out group-hover/player:scale-105'>
                    <PlayIcon weight='fill' className='size-8 text-white' />
                  </span>
                </div>
              ) : null}

              <div
                className={cn(
                  'absolute inset-x-0 bottom-0 z-30 transition-opacity duration-200 ease-out motion-reduce:transition-none',
                  shouldShowControls
                    ? 'opacity-100'
                    : 'pointer-events-none opacity-0',
                )}
              >
                <div
                  className='pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/85 via-black/35 to-transparent'
                  aria-hidden
                />

                <div
                  className='relative'
                  data-replay-controls
                  onFocusCapture={() => setIsControlsFocused(true)}
                  onBlurCapture={(event) => {
                    if (
                      !event.currentTarget.contains(
                        event.relatedTarget as Node | null,
                      )
                    ) {
                      setIsControlsFocused(false)
                    }
                  }}
                >
                  <div className='px-3 sm:px-4'>
                    <div
                      className='group/scrubber relative flex h-4 cursor-pointer items-center'
                      onMouseMove={updateHoverPreview}
                      onMouseLeave={() => setHoverPreview(null)}
                    >
                      {pageflowMarkers.length ? (
                        <div className='pointer-events-none absolute inset-x-0 bottom-full z-30 mb-1 h-5'>
                          {pageflowMarkers.map((marker) => (
                            <PageflowMarkerButton
                              key={marker.id}
                              marker={marker}
                              onHover={() => setHoverPreview(null)}
                              onSeek={seekTo}
                            />
                          ))}
                        </div>
                      ) : null}

                      {shouldShowPreview && hoverPreview ? (
                        <div
                          className='pointer-events-none absolute bottom-full z-40 mb-3 w-56'
                          style={{
                            left: `${hoverPreview.percent * 100}%`,
                            transform:
                              hoverPreview.percent < 0.12
                                ? 'translateX(0)'
                                : hoverPreview.percent > 0.88
                                  ? 'translateX(-100%)'
                                  : 'translateX(-50%)',
                          }}
                        >
                          <div className='aspect-video overflow-hidden rounded-md bg-white shadow-xl ring-1 ring-white/20'>
                            <div
                              ref={previewRoot}
                              className='rrweb-preview-root h-full w-full'
                              style={previewStyle}
                            />
                          </div>
                          <div className='mt-1.5 flex justify-center'>
                            <Text
                              as='span'
                              size='xs'
                              weight='semibold'
                              colour='primary'
                              className='dark rounded bg-black/85 px-1.5 py-0.5 tabular-nums'
                            >
                              {formatReplayTime(hoverPreview.offset)}
                            </Text>
                          </div>
                        </div>
                      ) : null}

                      <div
                        className='relative h-[3px] w-full rounded-full bg-white/30 transition-[height] duration-100 ease-out group-hover/scrubber:h-[5px]'
                        data-playing={isPlaying ? 'true' : 'false'}
                        style={progressStyle}
                      >
                        <div
                          className='replay-progress-fill absolute inset-y-0 left-0 w-full rounded-full bg-red-600'
                          aria-hidden
                        />
                        <span
                          className='replay-progress-thumb absolute top-1/2 size-3 rounded-full bg-red-600 shadow-sm'
                          aria-hidden
                        />
                      </div>

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
                        className='replay-scrubber absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent'
                      />
                    </div>
                  </div>

                  <div className='flex items-center justify-between gap-2 px-1.5 pt-1 pb-1.5 sm:px-2'>
                    <div className='flex min-w-0 items-center gap-1'>
                      <Tooltip
                        asChild
                        text={
                          isPlaying
                            ? t('project.sessionReplay.pause')
                            : t('project.sessionReplay.play')
                        }
                        tooltipNode={
                          <PlayerIconButton
                            aria-label={
                              isPlaying
                                ? t('project.sessionReplay.pause')
                                : t('project.sessionReplay.play')
                            }
                            onClick={togglePlayback}
                            disabled={!canControlReplay}
                          >
                            {isPlaying ? (
                              <PauseIcon weight='fill' className='size-5' />
                            ) : (
                              <PlayIcon weight='fill' className='size-5' />
                            )}
                          </PlayerIconButton>
                        }
                      />
                      <Text
                        as='span'
                        size='xs'
                        colour='primary'
                        className='dark px-1 tabular-nums sm:text-sm'
                      >
                        {formatReplayTime(currentTime)} /{' '}
                        {formatReplayTime(duration)}
                      </Text>
                    </div>

                    <div className='flex items-center gap-0.5'>
                      <div className='relative' ref={settingsRef}>
                        <PlayerIconButton
                          aria-label={t('project.sessionReplay.settings')}
                          aria-haspopup='menu'
                          aria-expanded={settingsOpen}
                          onClick={() => setSettingsOpen((value) => !value)}
                          className={cn(settingsOpen && 'bg-white/15')}
                        >
                          <GearSixIcon
                            weight='fill'
                            className={cn(
                              'size-5 transition-transform duration-300 ease-out motion-reduce:transition-none',
                              settingsOpen && 'rotate-[30deg]',
                            )}
                          />
                        </PlayerIconButton>

                        {settingsOpen ? (
                          <div
                            role='menu'
                            className='absolute right-0 bottom-full z-50 mb-3 w-72 overflow-hidden rounded-xl bg-slate-950/95 p-1.5 text-slate-100 shadow-2xl ring-1 ring-white/10 backdrop-blur-md'
                          >
                            {settingsView === 'main' ? (
                              <div className='flex flex-col'>
                                <Button
                                  variant='ghost'
                                  focus={false}
                                  role='menuitem'
                                  tabIndex={0}
                                  onClick={() => setSettingsView('speed')}
                                  className={SETTINGS_ROW_CLASS}
                                >
                                  <GaugeIcon
                                    weight='duotone'
                                    className='size-5 shrink-0 text-gray-50'
                                    aria-hidden
                                  />
                                  <Text
                                    as='span'
                                    size='sm'
                                    colour='primary'
                                    className='dark flex-1'
                                  >
                                    {t('project.sessionReplay.speed')}
                                  </Text>
                                  <Text
                                    as='span'
                                    size='sm'
                                    colour='secondary'
                                    className='dark tabular-nums'
                                  >
                                    {speedLabel}
                                  </Text>
                                  <CaretRightIcon
                                    className='size-4 shrink-0 text-gray-200'
                                    aria-hidden
                                  />
                                </Button>

                                <Button
                                  variant='ghost'
                                  focus={false}
                                  role='switch'
                                  aria-checked={showTimeline}
                                  tabIndex={0}
                                  onClick={() => {
                                    setShowTimeline((value) => !value)
                                    setSettingsOpen(false)
                                  }}
                                  className={SETTINGS_ROW_CLASS}
                                >
                                  <ListBulletsIcon
                                    weight='duotone'
                                    className='size-5 shrink-0 text-gray-50'
                                    aria-hidden
                                  />
                                  <Text
                                    as='span'
                                    size='sm'
                                    colour='primary'
                                    className='dark flex-1'
                                  >
                                    {t('project.sessionReplay.timeline.title')}
                                  </Text>
                                  <Switch
                                    checked={showTimeline}
                                    visualOnly
                                    className='shrink-0'
                                  />
                                </Button>

                                <Button
                                  variant='ghost'
                                  focus={false}
                                  role='menuitem'
                                  tabIndex={canControlReplay ? 0 : -1}
                                  onClick={() => {
                                    setSettingsOpen(false)
                                    downloadScreenshot()
                                  }}
                                  disabled={!canControlReplay}
                                  className={SETTINGS_ROW_CLASS}
                                >
                                  <CameraIcon
                                    weight='duotone'
                                    className='size-5 shrink-0 text-gray-50'
                                    aria-hidden
                                  />
                                  <Text
                                    as='span'
                                    size='sm'
                                    colour='primary'
                                    className='dark flex-1'
                                  >
                                    {t('project.sessionReplay.screenshot')}
                                  </Text>
                                </Button>

                                <Button
                                  variant='ghost'
                                  focus={false}
                                  role='menuitem'
                                  tabIndex={
                                    canControlReplay && !isReplayExporting
                                      ? 0
                                      : -1
                                  }
                                  onClick={exportReplay}
                                  disabled={
                                    !canControlReplay || isReplayExporting
                                  }
                                  className={SETTINGS_ROW_CLASS}
                                >
                                  <DownloadSimpleIcon
                                    weight='duotone'
                                    className='size-5 shrink-0 text-gray-50'
                                    aria-hidden
                                  />
                                  <Text
                                    as='span'
                                    size='sm'
                                    colour='primary'
                                    className='dark flex-1'
                                  >
                                    {t('project.sessionReplay.exportMp4')}
                                  </Text>
                                  {isReplayExporting ? (
                                    <Text
                                      as='span'
                                      size='sm'
                                      colour='secondary'
                                      className='dark tabular-nums'
                                    >
                                      {isExportStarting
                                        ? t(
                                            'project.sessionReplay.exportStarting',
                                          )
                                        : `${exportProgress}%`}
                                    </Text>
                                  ) : null}
                                </Button>

                                <Button
                                  variant='ghost'
                                  focus={false}
                                  role='menuitem'
                                  tabIndex={
                                    selectedReplayId &&
                                    !deleteReplayProxy.isLoading
                                      ? 0
                                      : -1
                                  }
                                  onClick={() => {
                                    setSettingsOpen(false)
                                    setIsDeleteConfirmOpen(true)
                                  }}
                                  disabled={
                                    !selectedReplayId ||
                                    deleteReplayProxy.isLoading
                                  }
                                  className={SETTINGS_ROW_CLASS}
                                >
                                  <TrashIcon
                                    weight='duotone'
                                    className='size-5 shrink-0 text-red-300'
                                    aria-hidden
                                  />
                                  <Text
                                    as='span'
                                    size='sm'
                                    colour='primary'
                                    className='dark flex-1'
                                  >
                                    {t('project.sessionReplay.delete')}
                                  </Text>
                                </Button>
                              </div>
                            ) : (
                              <div className='flex flex-col'>
                                <Button
                                  variant='ghost'
                                  focus={false}
                                  onClick={() => setSettingsView('main')}
                                  className='flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-100 transition-colors duration-150 ease-out hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none'
                                >
                                  <CaretLeftIcon
                                    className='size-4 shrink-0'
                                    aria-hidden
                                  />
                                  <Text
                                    as='span'
                                    size='sm'
                                    weight='semibold'
                                    colour='primary'
                                    className='dark'
                                  >
                                    {t('project.sessionReplay.speed')}
                                  </Text>
                                </Button>
                                <div
                                  className='mx-2 my-1 h-px bg-white/10'
                                  aria-hidden
                                />
                                <div className='flex flex-col'>
                                  {SPEEDS.map((item) => (
                                    <Button
                                      key={item}
                                      variant='ghost'
                                      focus={false}
                                      role='menuitemradio'
                                      aria-checked={speed === item}
                                      tabIndex={0}
                                      onClick={() => {
                                        setPlaybackSpeed(item)
                                        setSettingsView('main')
                                      }}
                                      className='grid grid-cols-[20px_1fr] items-center gap-1 rounded-lg px-3 py-2 text-left text-sm text-slate-100 transition-colors duration-150 ease-out hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none'
                                    >
                                      {speed === item ? (
                                        <CheckIcon
                                          className='size-4 text-white'
                                          aria-hidden
                                        />
                                      ) : (
                                        <span aria-hidden />
                                      )}
                                      <Text
                                        as='span'
                                        size='sm'
                                        colour='primary'
                                        className='dark tabular-nums'
                                      >
                                        {item === 1
                                          ? t(
                                              'project.sessionReplay.normalSpeed',
                                            )
                                          : `${item}×`}
                                      </Text>
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>

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
                              <CornersInIcon className='size-5' />
                            ) : (
                              <CornersOutIcon className='size-5' />
                            )}
                          </PlayerIconButton>
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <aside
              className={cn(
                'replay-timeline-panel min-h-0 overflow-hidden border-t bg-white xl:border-t-0 xl:border-l dark:bg-slate-950',
                showTimeline
                  ? 'border-gray-200 dark:border-slate-800'
                  : 'border-transparent',
              )}
              aria-hidden={!showTimeline}
              inert={!showTimeline ? true : undefined}
            >
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
          </div>
        </DialogPanel>
      </div>
      <Modal
        className='z-[60]'
        type='warning'
        title={t('project.sessionReplay.deleteConfirmTitle')}
        message={t('project.sessionReplay.deleteConfirmMessage')}
        isOpened={isDeleteConfirmOpen}
        onClose={() => {
          if (!deleteReplayProxy.isLoading) {
            setIsDeleteConfirmOpen(false)
          }
        }}
        onSubmit={deleteReplay}
        closeText={t('common.cancel')}
        submitText={t('common.delete')}
        submitType='danger'
        isLoading={deleteReplayProxy.isLoading}
      />
    </Dialog>
  )
}

export default SessionReplayModal
