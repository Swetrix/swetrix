import { spawn } from 'child_process'
import { createHash, randomUUID } from 'crypto'
import { createReadStream } from 'fs'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  StreamableFile,
} from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import type { Response } from 'express'

import { redis } from '../common/constants'
import { hash } from '../common/utils'
import { AnalyticsService } from './analytics.service'
import { SessionReplayS3Service } from './session-replay-s3.service'

export const SESSION_REPLAY_EXPORT_QUEUE = 'session-replay-export'

type SessionReplayExportStatus =
  | 'queued'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'expired'

export interface SessionReplayExportResponse {
  exportId: string
  status: SessionReplayExportStatus
  progress: number
  filename: string
  expiresAt: string
  error?: string
}

export type SessionReplayExportJobData =
  | {
      type: 'export'
      exportId: string
      pid: string
      psid: string
      replayId?: string
    }
  | {
      type: 'cleanup'
      exportId: string
      expiresAt: string
    }

export interface SessionReplayExportState extends SessionReplayExportResponse {
  pid: string
  psid: string
  replayId?: string
  objectKey?: string
  createdAt: string
  updatedAt: string
}

type RrvideoEvent = Record<string, unknown> & {
  type: number
  timestamp: number
  data: Record<string, unknown>
}

const DEFAULT_MAX_DURATION_MS = 30 * 60 * 1000
const DEFAULT_MAX_EVENTS = 100000
const DEFAULT_MAX_INPUT_BYTES = 150 * 1024 * 1024
const DEFAULT_MAX_OUTPUT_BYTES = 500 * 1024 * 1024
const DEFAULT_TTL_SECONDS = 24 * 60 * 60
const DEFAULT_RENDER_TIMEOUT_MS = 60 * 60 * 1000
const DEFAULT_VIEWPORT = { width: 1280, height: 720 }
const TMP_DIR = path.resolve(os.tmpdir(), 'swetrix-session-replay-exports')
const EXPORT_RENDERER_VERSION = 3
const RRWEB_EVENT_TYPE_FULL_SNAPSHOT = 2
const RRWEB_EVENT_TYPE_INCREMENTAL_SNAPSHOT = 3
const RRWEB_EVENT_TYPE_META = 4
const RRWEB_INCREMENTAL_SOURCE_VIEWPORT_RESIZE = 4

const getPositiveEnvNumber = (key: string, fallback: number) => {
  const value = Number(process.env[key])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

const getExportStateKey = (exportId: string) =>
  `session-replay:export:${exportId}`

@Injectable()
export class SessionReplayExportService {
  private readonly logger = new Logger(SessionReplayExportService.name)

  private readonly maxDurationMs = getPositiveEnvNumber(
    'SESSION_REPLAY_EXPORT_MAX_DURATION_MS',
    DEFAULT_MAX_DURATION_MS,
  )

  private readonly maxEvents = getPositiveEnvNumber(
    'SESSION_REPLAY_EXPORT_MAX_EVENTS',
    DEFAULT_MAX_EVENTS,
  )

  private readonly maxInputBytes = getPositiveEnvNumber(
    'SESSION_REPLAY_EXPORT_MAX_INPUT_BYTES',
    DEFAULT_MAX_INPUT_BYTES,
  )

  private readonly maxOutputBytes = getPositiveEnvNumber(
    'SESSION_REPLAY_EXPORT_MAX_OUTPUT_BYTES',
    DEFAULT_MAX_OUTPUT_BYTES,
  )

  private readonly ttlSeconds = getPositiveEnvNumber(
    'SESSION_REPLAY_EXPORT_TTL_SECONDS',
    DEFAULT_TTL_SECONDS,
  )

  private readonly renderTimeoutMs = getPositiveEnvNumber(
    'SESSION_REPLAY_EXPORT_RENDER_TIMEOUT_MS',
    DEFAULT_RENDER_TIMEOUT_MS,
  )

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly sessionReplayStorage: SessionReplayS3Service,
    @InjectQueue(SESSION_REPLAY_EXPORT_QUEUE)
    private readonly exportQueue: Queue<SessionReplayExportJobData>,
  ) {}

  async startExport(
    pid: string,
    psid: string,
    replayId?: string,
  ): Promise<SessionReplayExportResponse> {
    if (!this.sessionReplayStorage.isConfigured()) {
      throw new ServiceUnavailableException(
        'Session replay storage is not configured',
      )
    }

    const replay = await this.analyticsService.getSessionReplaySummary(
      pid,
      psid,
      replayId,
    )

    if (!replay?.hasReplay) {
      throw new BadRequestException('Replay is no longer available')
    }

    this.validateReplayMetadata(replay.eventCount, replay.replayDuration)

    const resolvedReplayId = replay.replayId || replayId
    const exportReplayId = resolvedReplayId || 'session'
    const exportId = hash(
      `${EXPORT_RENDERER_VERSION}:${pid}:${psid}:${exportReplayId}:${replay.eventCount}:${replay.replayDuration}`,
    )
    const existing = await this.getState(exportId)

    if (existing && !this.shouldStartNewExport(existing)) {
      return this.toResponse(existing)
    }

    if (existing?.objectKey) {
      await this.sessionReplayStorage
        .deleteObject(existing.objectKey)
        .catch((reason) =>
          this.logger.warn(
            `Failed to delete stale session replay export ${exportId}: ${
              reason instanceof Error ? reason.message : String(reason)
            }`,
          ),
        )
    }

    const now = new Date()
    const state: SessionReplayExportState = {
      exportId,
      pid,
      psid,
      replayId: resolvedReplayId,
      status: 'queued',
      progress: 0,
      filename: this.getFilename(psid),
      expiresAt: new Date(now.getTime() + this.ttlSeconds * 1000).toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }

    await this.saveState(state)

    try {
      await this.exportQueue.add(
        'export-session-replay',
        {
          type: 'export',
          exportId,
          pid,
          psid,
          replayId: resolvedReplayId,
        },
        {
          jobId: exportId,
          attempts: 1,
          removeOnComplete: true,
          removeOnFail: true,
        },
      )
    } catch (reason) {
      await this.markFailed(state, reason)
      throw new ServiceUnavailableException('Failed to start export')
    }

    return this.toResponse(state)
  }

  async getExport(exportId: string): Promise<SessionReplayExportResponse> {
    const state = await this.getState(exportId)
    if (!state) {
      throw new NotFoundException('Export not found')
    }

    if (this.isExpired(state) && state.status !== 'expired') {
      await this.expireState(state)
      return this.toResponse({
        ...state,
        status: 'expired',
        objectKey: undefined,
      })
    }

    return this.toResponse(state)
  }

  async downloadExport(
    exportId: string,
    response: Response,
  ): Promise<StreamableFile> {
    const state = await this.getState(exportId)

    if (!state || this.isExpired(state) || state.status === 'expired') {
      throw new NotFoundException('Export not found')
    }

    if (state.status !== 'ready' || !state.objectKey) {
      throw new BadRequestException('Export is not ready')
    }

    const object = await this.sessionReplayStorage.getObjectStream(
      state.objectKey,
    )

    if (!object) {
      await this.markFailed(state, new Error('Export file is missing'))
      throw new NotFoundException('Export file not found')
    }

    response.setHeader('Content-Type', object.contentType || 'video/mp4')
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${state.filename}"`,
    )
    response.setHeader('Cache-Control', 'private, no-store')
    if (object.contentLength) {
      response.setHeader('Content-Length', object.contentLength)
    }

    return new StreamableFile(object.body)
  }

  async assertExportAccess(
    exportId: string,
  ): Promise<SessionReplayExportState> {
    const state = await this.getState(exportId)
    if (!state) {
      throw new NotFoundException('Export not found')
    }
    return state
  }

  async processExportJob(
    data: Extract<SessionReplayExportJobData, { type: 'export' }>,
  ) {
    const existing = await this.getState(data.exportId)
    const state =
      existing ||
      ({
        exportId: data.exportId,
        pid: data.pid,
        psid: data.psid,
        replayId: data.replayId,
        status: 'queued',
        progress: 0,
        filename: this.getFilename(data.psid),
        expiresAt: new Date(Date.now() + this.ttlSeconds * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } satisfies SessionReplayExportState)

    let workDir: string | null = null

    try {
      await this.updateState(state, { status: 'processing', progress: 5 })

      const { replay, events } = await this.analyticsService.getSessionReplay(
        data.pid,
        data.psid,
        data.replayId,
      )

      if (!replay?.hasReplay || !events.length) {
        throw new Error('Replay is no longer available')
      }

      this.validateReplayMetadata(replay.eventCount, replay.replayDuration)
      const exportEvents = this.prepareEventsForRrvideo(events)

      const durationMs = this.getReplayDurationMs(
        exportEvents,
        replay.replayDuration,
      )
      this.validateReplayDuration(durationMs)

      const serializedEvents = JSON.stringify(exportEvents)
      const inputBytes = Buffer.byteLength(serializedEvents)

      if (inputBytes > this.maxInputBytes) {
        throw new Error('Replay is too large to export')
      }

      workDir = path.join(TMP_DIR, `${data.exportId}-${randomUUID()}`)
      await fs.mkdir(workDir, { recursive: true, mode: 0o700 })

      const inputPath = path.join(workDir, 'events.json')
      const configPath = path.join(workDir, 'rrvideo.config.json')
      const webmPath = path.join(workDir, 'replay.webm')
      const mp4Path = path.join(workDir, 'replay.mp4')

      await fs.writeFile(inputPath, serializedEvents, { mode: 0o600 })
      await fs.writeFile(
        configPath,
        JSON.stringify(this.getRrvideoConfig(exportEvents)),
        { mode: 0o600 },
      )

      await this.updateState(state, { status: 'processing', progress: 20 })

      await this.runCommand(
        this.getRrvideoBin(),
        ['--input', inputPath, '--output', webmPath, '--config', configPath],
        {
          cwd: workDir,
          rejectOutput: /Error initializing replayer|Failed to transform/i,
        },
      )

      await this.updateState(state, { status: 'processing', progress: 70 })

      await this.runCommand(
        this.getFfmpegBin(),
        [
          '-y',
          '-i',
          webmPath,
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          '-movflags',
          '+faststart',
          mp4Path,
        ],
        { cwd: workDir },
      )

      const outputStat = await fs.stat(mp4Path)
      if (outputStat.size > this.maxOutputBytes) {
        throw new Error('Replay export is too large to download')
      }

      await this.updateState(state, { status: 'processing', progress: 90 })

      const objectKey = this.getObjectKey(data.pid, data.psid, data.exportId)
      const outputHash = await this.hashFile(mp4Path)
      await this.sessionReplayStorage.putObject(
        objectKey,
        createReadStream(mp4Path),
        'video/mp4',
        {
          contentLength: outputStat.size,
          payloadHash: outputHash,
        },
      )

      await this.updateState(state, {
        status: 'ready',
        progress: 100,
        objectKey,
        error: undefined,
      })

      try {
        await this.exportQueue.add(
          'cleanup-session-replay-export',
          {
            type: 'cleanup',
            exportId: data.exportId,
            expiresAt: state.expiresAt,
          },
          {
            jobId: `${data.exportId}:cleanup:${hash(state.expiresAt)}`,
            delay: this.ttlSeconds * 1000,
            attempts: 3,
            removeOnComplete: true,
            removeOnFail: true,
          },
        )
      } catch (reason) {
        this.logger.warn(
          `Failed to schedule session replay export cleanup ${data.exportId}: ${
            reason instanceof Error ? reason.message : String(reason)
          }`,
        )
      }
    } catch (reason) {
      await this.markFailed(state, reason)
      throw reason
    } finally {
      if (workDir) {
        await fs.rm(workDir, { recursive: true, force: true }).catch(() => null)
      }
    }
  }

  async cleanupExportJob(
    data: Extract<SessionReplayExportJobData, { type: 'cleanup' }>,
  ) {
    const state = await this.getState(data.exportId)
    if (!state) return

    if (state.expiresAt !== data.expiresAt) return

    if (state.objectKey) {
      try {
        await this.sessionReplayStorage.deleteObject(state.objectKey)
      } catch (reason) {
        this.logger.warn(
          `Failed to delete session replay export ${data.exportId}: ${
            reason instanceof Error ? reason.message : String(reason)
          }`,
        )
        throw reason
      }
    }

    await this.expireState(state)
  }

  private validateReplayMetadata(eventCount: number, durationSeconds: number) {
    if (eventCount > this.maxEvents) {
      throw new PayloadTooLargeException('Replay has too many events to export')
    }

    this.validateReplayDuration(durationSeconds * 1000)
  }

  private validateReplayDuration(durationMs: number) {
    if (durationMs > this.maxDurationMs) {
      throw new PayloadTooLargeException('Replay is too long to export')
    }
  }

  private prepareEventsForRrvideo(events: Record<string, unknown>[]) {
    const normalised: Array<{ event: RrvideoEvent; index: number }> = []

    events.forEach((event, index) => {
      const normalisedEvent = this.normaliseReplayEvent(event)
      if (normalisedEvent) {
        normalised.push({ event: normalisedEvent, index })
      }
    })

    normalised.sort(
      (a, b) => a.event.timestamp - b.event.timestamp || a.index - b.index,
    )

    if (!normalised.length) {
      throw new Error('Replay is no longer available')
    }

    const prepared = normalised.map(({ event }) => event)
    if (
      !prepared.some((event) => event.type === RRWEB_EVENT_TYPE_FULL_SNAPSHOT)
    ) {
      throw new Error('Replay is missing a full snapshot')
    }

    const viewport = this.getReplayViewport(prepared)
    const href = this.getReplayHref(prepared)
    let hasMeta = false
    const withMeta = prepared.map((event) => {
      if (event.type !== RRWEB_EVENT_TYPE_META) return event

      hasMeta = true
      return {
        ...event,
        data: {
          ...this.getEventData(event),
          href,
          width: viewport.width,
          height: viewport.height,
        },
      }
    })

    if (!hasMeta) {
      withMeta.unshift({
        type: RRWEB_EVENT_TYPE_META,
        timestamp: withMeta[0].timestamp,
        data: {
          href,
          width: viewport.width,
          height: viewport.height,
        },
      })
    }

    return withMeta
  }

  private normaliseReplayEvent(
    event: Record<string, unknown>,
  ): RrvideoEvent | null {
    const timestamp = Number(event.timestamp)
    const type = this.normaliseEventType(event.type)

    if (!Number.isFinite(timestamp) || type === null) {
      return null
    }

    return {
      ...event,
      type,
      timestamp,
      data: this.getEventData(event),
    }
  }

  private normaliseEventType(value: unknown) {
    const numeric = Number(value)
    if (Number.isInteger(numeric)) return numeric

    if (typeof value !== 'string') return null

    const eventTypes: Record<string, number> = {
      DomContentLoaded: 0,
      Load: 1,
      FullSnapshot: RRWEB_EVENT_TYPE_FULL_SNAPSHOT,
      IncrementalSnapshot: RRWEB_EVENT_TYPE_INCREMENTAL_SNAPSHOT,
      Meta: RRWEB_EVENT_TYPE_META,
      Custom: 5,
      Plugin: 6,
      Asset: 7,
    }

    return eventTypes[value] ?? null
  }

  private getEventData(event: Record<string, unknown>) {
    return event.data && typeof event.data === 'object'
      ? (event.data as Record<string, unknown>)
      : {}
  }

  private getReplayDurationMs(
    events: Record<string, unknown>[],
    fallbackDurationSeconds: number,
  ) {
    let minTimestamp = Infinity
    let maxTimestamp = -Infinity

    for (const event of events) {
      const timestamp = Number(event.timestamp)
      if (!Number.isFinite(timestamp)) continue

      minTimestamp = Math.min(minTimestamp, timestamp)
      maxTimestamp = Math.max(maxTimestamp, timestamp)
    }

    if (!Number.isFinite(minTimestamp) || !Number.isFinite(maxTimestamp)) {
      return fallbackDurationSeconds * 1000
    }

    return Math.max(fallbackDurationSeconds * 1000, maxTimestamp - minTimestamp)
  }

  private getRrvideoConfig(events: Record<string, unknown>[]) {
    const viewport = this.getReplayViewport(events)

    return {
      width: viewport.width,
      height: viewport.height,
      speed: 1,
      skipInactive: false,
      mouseTail: true,
    }
  }

  private getReplayViewport(events: Record<string, unknown>[]) {
    let maxWidth = 0
    let maxHeight = 0

    for (const event of events) {
      const data = this.getEventData(event)
      const isViewportEvent =
        Number(event.type) === RRWEB_EVENT_TYPE_META ||
        (Number(event.type) === RRWEB_EVENT_TYPE_INCREMENTAL_SNAPSHOT &&
          Number(data.source) === RRWEB_INCREMENTAL_SOURCE_VIEWPORT_RESIZE)

      if (!isViewportEvent) continue

      const viewport = this.getViewportCandidate(data)
      if (!viewport) continue

      maxWidth = Math.max(maxWidth, viewport.width)
      maxHeight = Math.max(maxHeight, viewport.height)
    }

    if (!maxWidth || !maxHeight) {
      return DEFAULT_VIEWPORT
    }

    return this.clampViewport({ width: maxWidth, height: maxHeight })
  }

  private getViewportCandidate(data: Record<string, unknown>) {
    const width = Number(data.width)
    const height = Number(data.height)

    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      return null
    }

    return {
      width: Math.round(width),
      height: Math.round(height),
    }
  }

  private clampViewport(viewport: { width: number; height: number }) {
    return {
      width: Math.min(1920, Math.max(320, viewport.width)),
      height: Math.min(1080, Math.max(240, viewport.height)),
    }
  }

  private getReplayHref(events: Record<string, unknown>[]) {
    for (const event of events) {
      if (Number(event.type) !== RRWEB_EVENT_TYPE_META) continue

      const href = this.getEventData(event).href
      if (typeof href === 'string' && href) {
        return this.getSafeReplayHref(href)
      }
    }

    return 'about:blank'
  }

  private getSafeReplayHref(href: string) {
    try {
      const url = new URL(href)
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        return url.toString()
      }
    } catch {
      return 'about:blank'
    }

    return 'about:blank'
  }

  private async hashFile(filePath: string) {
    const digest = createHash('sha256')
    await new Promise<void>((resolve, reject) => {
      const stream = createReadStream(filePath)
      stream.on('data', (chunk) => digest.update(chunk))
      stream.on('error', reject)
      stream.on('end', resolve)
    })

    return digest.digest('hex')
  }

  private async runCommand(
    command: string,
    args: string[],
    options: { cwd?: string; rejectOutput?: RegExp } = {},
  ) {
    await new Promise<void>((resolve, reject) => {
      let settled = false
      let output = ''
      const child = spawn(command, args, {
        cwd: options.cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      const timeout = setTimeout(() => {
        if (settled) return
        settled = true
        child.kill('SIGKILL')
        reject(new Error(`${path.basename(command)} timed out`))
      }, this.renderTimeoutMs)

      const captureOutput = (chunk: Buffer) => {
        output = `${output}${chunk.toString()}`
        if (output.length > 8000) {
          output = output.slice(-8000)
        }
      }

      child.stdout.on('data', captureOutput)
      child.stderr.on('data', captureOutput)

      child.on('error', (reason) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        reject(reason)
      })

      child.on('close', (code) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)

        if (code === 0) {
          if (options.rejectOutput?.test(output)) {
            reject(
              new Error(
                `${path.basename(command)} reported a renderer error: ${output}`,
              ),
            )
            return
          }

          resolve()
          return
        }

        reject(
          new Error(
            `${path.basename(command)} failed with status ${code}: ${output}`,
          ),
        )
      })
    })
  }

  private getRrvideoBin() {
    return (
      process.env.RRVIDEO_BIN ||
      path.join(
        process.cwd(),
        'node_modules',
        '.bin',
        process.platform === 'win32' ? 'rrvideo.cmd' : 'rrvideo',
      )
    )
  }

  private getFfmpegBin() {
    return process.env.FFMPEG_BIN || 'ffmpeg'
  }

  private getObjectKey(pid: string, psid: string, exportId: string) {
    return ['session-replay-exports', pid, psid, `${exportId}.mp4`].join('/')
  }

  private getFilename(psid: string) {
    const safePsid = psid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)
    return `swetrix-replay-${safePsid || 'session'}.mp4`
  }

  private async getState(
    exportId: string,
  ): Promise<SessionReplayExportState | null> {
    const raw = await redis.get(getExportStateKey(exportId))
    if (!raw) return null

    try {
      return JSON.parse(raw) as SessionReplayExportState
    } catch {
      return null
    }
  }

  private async saveState(state: SessionReplayExportState) {
    await redis.set(
      getExportStateKey(state.exportId),
      JSON.stringify(state),
      'EX',
      this.ttlSeconds + 24 * 60 * 60,
    )
  }

  private async updateState(
    state: SessionReplayExportState,
    update: Partial<SessionReplayExportState>,
  ) {
    const next = {
      ...state,
      ...update,
      updatedAt: new Date().toISOString(),
    }
    Object.assign(state, next)
    await this.saveState(next)
    return next
  }

  private async markFailed(state: SessionReplayExportState, reason: unknown) {
    this.logger.error(
      `Session replay export ${state.exportId} failed: ${this.getDetailedError(
        reason,
      )}`,
    )

    await this.updateState(state, {
      status: 'failed',
      progress: 100,
      error: this.getPublicError(reason),
      objectKey: undefined,
    })
  }

  private async expireState(state: SessionReplayExportState) {
    await this.updateState(state, {
      status: 'expired',
      progress: 100,
      objectKey: undefined,
      error: undefined,
    })
  }

  private isExpired(state: SessionReplayExportState) {
    return Date.parse(state.expiresAt) <= Date.now()
  }

  private shouldStartNewExport(state: SessionReplayExportState) {
    return (
      this.isExpired(state) ||
      state.status === 'expired' ||
      state.status === 'failed'
    )
  }

  private getPublicError(reason: unknown) {
    const message = this.getDetailedError(reason)

    if (message.includes('Replay is no longer available')) {
      return 'Replay is no longer available'
    }

    if (
      message.includes('too large') ||
      message.includes('too long') ||
      message.includes('too many events')
    ) {
      return 'Replay is too large to export'
    }

    return 'Could not export replay to MP4'
  }

  private getDetailedError(reason: unknown) {
    return reason instanceof Error
      ? reason.stack || reason.message
      : String(reason)
  }

  private toResponse(
    state: SessionReplayExportState,
  ): SessionReplayExportResponse {
    return {
      exportId: state.exportId,
      status: state.status,
      progress: state.progress,
      filename: state.filename,
      expiresAt: state.expiresAt,
      ...(state.error ? { error: state.error } : {}),
    }
  }
}
