import {
  isInBrowser,
  isLocalhost,
  isAutomated,
  getLocale,
  getTimezone,
  getReferrer,
  getQueryString,
  getUTMCampaign,
  getUTMMedium,
  getUTMSource,
  getUTMTerm,
  getUTMContent,
  getPath,
} from './utils.js'

type RrwebEvent = Record<string, unknown>

type RrwebEmit = (event: RrwebEvent) => void

interface RrwebRecordOptions {
  emit?: RrwebEmit
  [key: string]: unknown
}

interface RrwebGlobal {
  record?: (options: RrwebRecordOptions) => (() => void) | undefined
  Replayer?: unknown
}

type RrwebModule = RrwebGlobal & {
  default?: RrwebGlobal
}

type SessionReplayPreloadOption = boolean | { rrwebUrl?: string }

declare global {
  interface Window {
    rrweb?: RrwebGlobal
    __SWETRIX_RRWEB_LOADING__?: Promise<void>
  }
}

export interface LibOptions {
  /**
   * When set to `true`, localhost events will be sent to server.
   */
  devMode?: boolean

  /**
   * When set to `true`, the tracking library won't send any data to server.
   * Useful for development purposes when this value is set based on `.env` var.
   */
  disabled?: boolean

  /**
   * By setting this flag to `true`, we will not collect ANY kind of data about the user with the DNT setting.
   */
  respectDNT?: boolean

  /** Set a custom URL of the API server (for selfhosted variants of Swetrix). */
  apiURL?: string

  /**
   * Optional profile ID for long-term user tracking.
   * If set, it will be used for all pageviews and events unless overridden per-call.
   */
  profileId?: string

  /**
   * Preload session replay recorder code. Recording only starts after calling startSessionReplay().
   */
  preloadSessionReplay?: SessionReplayPreloadOption
}

export interface TrackEventOptions {
  /** The custom event name. */
  ev: string

  /** If set to `true`, only 1 event with the same ID will be saved per user session. */
  unique?: boolean

  /** Event-related metadata object with string values. */
  meta?: {
    [key: string]: string | number | boolean | null | undefined
  }

  /** Optional profile ID for long-term user tracking. Overrides the global profileId if set. */
  profileId?: string
}

// Partial user-editable pageview payload
export interface IPageViewPayload {
  lc?: string
  tz?: string
  ref?: string
  so?: string
  me?: string
  ca?: string
  te?: string
  co?: string
  pg?: string | null

  /**
   * Raw URL query string of the landing page (without the leading `?`).
   * Used server-side to recover the traffic source from ad/social click
   * IDs (gclid, fbclid, etc.) when the browser stripped the referrer.
   */
  qs?: string

  /** Pageview-related metadata object with string values. */
  meta?: {
    [key: string]: string | number | boolean | null | undefined
  }

  /** Optional profile ID for long-term user tracking. Overrides the global profileId if set. */
  profileId?: string
}

// Partial user-editable error payload
export interface IErrorEventPayload {
  name: string
  message?: string | null
  lineno?: number | null
  colno?: number | null
  filename?: string | null
  stackTrace?: string | null
  meta?: {
    [key: string]: string | number | boolean | null | undefined
  }
}

export interface IInternalErrorEventPayload extends IErrorEventPayload {
  lc?: string
  tz?: string
  pg?: string | null
}

interface IPerfPayload {
  dns: number
  tls: number
  conn: number
  response: number
  render: number
  dom_load: number
  page_load: number
  ttfb: number
}

/**
 * Options for evaluating feature flags.
 */
export interface FeatureFlagsOptions {
  /**
   * Optional profile ID for long-term user tracking.
   * If not provided, an anonymous profile ID will be generated server-side based on IP and user agent.
   * Overrides the global profileId if set.
   */
  profileId?: string
}

/**
 * Options for evaluating experiments.
 */
export interface ExperimentOptions {
  /**
   * Optional profile ID for long-term user tracking.
   * If not provided, an anonymous profile ID will be generated server-side based on IP and user agent.
   * Overrides the global profileId if set.
   */
  profileId?: string
}

/**
 * Cached feature flags and experiments with timestamp.
 */
interface CachedData {
  flags: Record<string, boolean>
  experiments: Record<string, string>
  timestamp: number
  /** The profileId used when fetching this cached data */
  profileId?: string
}

/**
 * The object returned by `trackPageViews()`, used to stop tracking pages.
 */
export interface PageActions {
  /** Stops the tracking of pages. */
  stop: () => void
}

/**
 * The object returned by `trackErrors()`, used to stop tracking errors.
 */
export interface ErrorActions {
  /** Stops the tracking of errors. */
  stop: () => void
}

const SESSION_REPLAY_PRIVACY_VALUES = ['total', 'normal', 'none'] as const

export type SessionReplayPrivacy =
  (typeof SESSION_REPLAY_PRIVACY_VALUES)[number]

export interface SessionReplayOptions {
  privacy?: SessionReplayPrivacy
  rrweb?: RrwebRecordOptions
  flushIntervalMs?: number
  maxEventsPerChunk?: number
  sampleRate?: number
  maxDurationMs?: number
  idleTimeoutMs?: number
}

export interface SessionReplayActions {
  stop: () => Promise<void>
  flush: () => Promise<void>
}

export interface PageData {
  /** Current URL path. */
  path: string

  /** The object returned by `trackPageViews()`, used to stop tracking pages. */
  actions: PageActions
}

export interface ErrorOptions {
  /**
   * A number that indicates how many errors should be sent to the server.
   * Accepts values between 0 and 1. For example, if set to 0.5 - only ~50% of errors will be sent to Swetrix.
   * For testing, we recommend setting this value to 1. For production, you should configure it depending on your needs as each error event counts towards your plan.
   *
   * The default value for this option is 1.
   */
  sampleRate?: number

  /**
   * Callback to edit / prevent sending errors.
   *
   * @param payload - The error payload.
   * @returns The edited payload or `false` to prevent sending the error event. If `true` is returned, the payload will be sent as-is.
   */
  callback?: (payload: IInternalErrorEventPayload) => Partial<IInternalErrorEventPayload> | boolean
}

export interface PageViewsOptions {
  /**
   * If set to `true`, only unique events will be saved.
   * This param is useful when tracking single-page landing websites.
   */
  unique?: boolean

  /** Send Heartbeat requests when the website tab is not active in the browser. */
  heartbeatOnBackground?: boolean

  /**
   * Set to `true` to enable hash-based routing.
   * For example if you have pages like /#/path or want to track pages like /path#hash
   */
  hash?: boolean

  /**
   * Set to `true` to enable search-based routing.
   * For example if you have pages like /path?search
   */
  search?: boolean

  /**
   * Callback to edit / prevent sending pageviews.
   *
   * @param payload - The pageview payload.
   * @returns The edited payload or `false` to prevent sending the pageview. If `true` is returned, the payload will be sent as-is.
   */
  callback?: (payload: IPageViewPayload) => Partial<IPageViewPayload> | boolean
}

export const defaultActions = {
  stop() {},
}

export const defaultSessionReplayActions: SessionReplayActions = {
  async stop() {},
  async flush() {},
}

const DEFAULT_API_HOST = 'https://api.swetrix.com/log'
const DEFAULT_API_BASE = 'https://api.swetrix.com'
const DEFAULT_RRWEB_FILE = 'replaylibrary.min.js'
const DEFAULT_RRWEB_URL = `https://cdn.jsdelivr.net/npm/swetrix@latest/dist/${DEFAULT_RRWEB_FILE}`
const DEFAULT_SESSION_REPLAY_FLUSH_INTERVAL = 5000
const DEFAULT_SESSION_REPLAY_MAX_EVENTS = 100
const DEFAULT_SESSION_REPLAY_PRIVACY: SessionReplayPrivacy = 'total'
const SESSION_REPLAY_ACTIVITY_EVENTS = [
  'click',
  'keydown',
  'mousedown',
  'mousemove',
  'scroll',
  'touchstart',
] as const

// Default cache duration: 5 minutes
const DEFAULT_CACHE_DURATION = 5 * 60 * 1000

export class Lib {
  private pageData: PageData | null = null
  private pageViewsOptions?: PageViewsOptions | null = null
  private errorsOptions?: ErrorOptions | null = null
  private perfStatsCollected: boolean = false
  private activePage: string | null = null
  private errorListenerExists = false
  private cachedData: CachedData | null = null
  private rrwebLoader: Promise<void> | null = null
  private sessionReplayActions: SessionReplayActions | null = null
  private sessionReplayInitPromise: Promise<SessionReplayActions> | null = null

  constructor(private projectID: string, private options?: LibOptions) {
    this.trackPathChange = this.trackPathChange.bind(this)
    this.heartbeat = this.heartbeat.bind(this)
    this.captureError = this.captureError.bind(this)

    if (this.getSessionReplayPreloadOption()) {
      void this.preloadSessionReplay().catch(() => undefined)
    }
  }

  captureError(event: ErrorEvent): void {
    if (typeof this.errorsOptions?.sampleRate === 'number' && this.errorsOptions.sampleRate >= Math.random()) {
      return
    }

    this.submitError(
      {
        // The file in which error occured.
        filename: event.filename,

        // The line of code error occured on.
        lineno: event.lineno,

        // The column of code error occured on.
        colno: event.colno,

        // Name of the error, if not exists (i.e. it's a custom thrown error). The initial value of name is "Error", but just in case lets explicitly set it here too.
        name: event.error?.name || 'Error',

        // Description of the error. By default, we use message from Error object, is it does not contain the error name
        // (we want to split error name and message so we could group them together later in dashboard).
        // If message in error object does not exist - lets use a message from the Error event itself.
        message: event.error?.message || event.message,

        // Stack trace of the error, if available.
        stackTrace: event.error?.stack,
      },
      true,
    )
  }

  trackErrors(options?: ErrorOptions): ErrorActions {
    if (this.errorListenerExists || !this.canTrack()) {
      return defaultActions
    }

    this.errorsOptions = options

    window.addEventListener('error', this.captureError)
    this.errorListenerExists = true

    return {
      stop: () => {
        window.removeEventListener('error', this.captureError)
        this.errorListenerExists = false
      },
    }
  }

  submitError(payload: IErrorEventPayload, evokeCallback?: boolean): void {
    const privateData = {
      pid: this.projectID,
    }

    const errorPayload = {
      pg:
        this.activePage ||
        getPath({
          hash: this.pageViewsOptions?.hash,
          search: this.pageViewsOptions?.search,
        }),
      lc: getLocale(),
      tz: getTimezone(),
      ...payload,
    }

    if (evokeCallback && this.errorsOptions?.callback) {
      const callbackResult = this.errorsOptions.callback(errorPayload)

      if (callbackResult === false) {
        return
      }

      if (callbackResult && typeof callbackResult === 'object') {
        Object.assign(errorPayload, callbackResult)
      }
    }

    Object.assign(errorPayload, privateData)

    this.sendRequest('error', errorPayload)
  }

  async track(event: TrackEventOptions): Promise<void> {
    if (!this.canTrack()) {
      return
    }

    const data = {
      ...event,
      pid: this.projectID,
      pg:
        this.activePage ||
        getPath({
          hash: this.pageViewsOptions?.hash,
          search: this.pageViewsOptions?.search,
        }),
      lc: getLocale(),
      tz: getTimezone(),
      ref: getReferrer(),
      so: getUTMSource(),
      me: getUTMMedium(),
      ca: getUTMCampaign(),
      te: getUTMTerm(),
      co: getUTMContent(),
      qs: getQueryString(),
      profileId: event.profileId ?? this.options?.profileId,
    }
    await this.sendRequest('custom', data)
  }

  trackPageViews(options?: PageViewsOptions): PageActions {
    if (!this.canTrack()) {
      return defaultActions
    }

    if (this.pageData) {
      return this.pageData.actions
    }

    this.pageViewsOptions = options
    let interval: ReturnType<typeof setInterval>

    if (!options?.unique) {
      interval = setInterval(this.trackPathChange, 2000)
    }

    setTimeout(this.heartbeat, 3000)
    const hbInterval = setInterval(this.heartbeat, 28000)

    const path = getPath({
      hash: options?.hash,
      search: options?.search,
    })

    this.pageData = {
      path,
      actions: {
        stop: () => {
          clearInterval(interval)
          clearInterval(hbInterval)
        },
      },
    }

    this.trackPage(path, options?.unique)
    return this.pageData.actions
  }

  getPerformanceStats(): IPerfPayload | {} {
    if (!this.canTrack() || this.perfStatsCollected || !window.performance?.getEntriesByType) {
      return {}
    }

    const perf = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

    if (!perf) {
      return {}
    }

    this.perfStatsCollected = true

    return {
      // Network
      dns: perf.domainLookupEnd - perf.domainLookupStart, // DNS Resolution
      tls: perf.secureConnectionStart ? perf.requestStart - perf.secureConnectionStart : 0, // TLS Setup; checking if secureConnectionStart is not 0 (it's 0 for non-https websites)
      conn: perf.secureConnectionStart
        ? perf.secureConnectionStart - perf.connectStart
        : perf.connectEnd - perf.connectStart, // Connection time
      response: perf.responseEnd - perf.responseStart, // Response Time (Download)

      // Frontend
      render: perf.domComplete - perf.domContentLoadedEventEnd, // Browser rendering the HTML time
      dom_load: perf.domContentLoadedEventEnd - perf.responseEnd, // DOM loading timing
      page_load: perf.loadEventStart, // Page load time

      // Backend
      ttfb: perf.responseStart - perf.requestStart,
    }
  }

  /**
   * Fetches all feature flags for the project.
   * Results are cached for 5 minutes by default and share a cache with experiments.
   *
   * @param options - Options for evaluating feature flags (`profileId` only).
   * @param forceRefresh - If true, bypasses the cache and fetches fresh data.
   * @returns A promise that resolves to a record of flag keys to boolean values.
   */
  async getFeatureFlags(options?: FeatureFlagsOptions, forceRefresh?: boolean): Promise<Record<string, boolean>> {
    if (!isInBrowser()) {
      return {}
    }

    const requestedProfileId = options?.profileId ?? this.options?.profileId

    // Check cache first - must match profileId and not be expired
    if (!forceRefresh && this.cachedData) {
      const now = Date.now()
      const isSameProfile = this.cachedData.profileId === requestedProfileId
      if (isSameProfile && now - this.cachedData.timestamp < DEFAULT_CACHE_DURATION) {
        return this.cachedData.flags
      }
    }

    try {
      await this.fetchFlagsAndExperiments(options)
      return this.cachedData?.flags || {}
    } catch (error) {
      console.warn('[Swetrix] Error fetching feature flags:', error)
      return this.cachedData?.flags || {}
    }
  }

  /**
   * Internal method to fetch both feature flags and experiments from the API.
   */
  private async fetchFlagsAndExperiments(options?: FeatureFlagsOptions | ExperimentOptions): Promise<void> {
    const apiBase = this.getApiBase()
    const body: { pid: string; profileId?: string } = {
      pid: this.projectID,
    }

    // Use profileId from options, or fall back to global profileId
    const profileId = options?.profileId ?? this.options?.profileId
    if (profileId) {
      body.profileId = profileId
    }

    const response = await fetch(`${apiBase}/feature-flag/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      console.warn('[Swetrix] Failed to fetch feature flags and experiments:', response.status)
      return
    }

    const data = (await response.json()) as {
      flags: Record<string, boolean>
      experiments?: Record<string, string>
    }

    // Use profileId from options, or fall back to global profileId
    const cachedProfileId = options?.profileId ?? this.options?.profileId

    // Update cache with both flags and experiments
    this.cachedData = {
      flags: data.flags || {},
      experiments: data.experiments || {},
      timestamp: Date.now(),
      profileId: cachedProfileId,
    }
  }

  /**
   * Gets the value of a single feature flag.
   *
   * @param key - The feature flag key.
   * @param options - Options for evaluating the feature flag (`profileId` only).
   * @param defaultValue - Optional default value to return if the flag is not found. Defaults to false.
   * @returns A promise that resolves to the boolean value of the flag.
   */
  async getFeatureFlag(key: string, options?: FeatureFlagsOptions, defaultValue: boolean = false): Promise<boolean> {
    const flags = await this.getFeatureFlags(options)
    return flags[key] ?? defaultValue
  }

  /**
   * Clears the cached feature flags and experiments, forcing a fresh fetch on the next call.
   */
  clearFeatureFlagsCache(): void {
    this.cachedData = null
  }

  /**
   * Fetches variant assignments for running A/B test experiments returned by feature flag evaluation.
   * Results are cached for 5 minutes by default (shared cache with feature flags).
   *
   * @param options - Options for evaluating experiments (`profileId` only).
   * @param forceRefresh - If true, bypasses the cache and fetches fresh data.
   * @returns A promise that resolves to a record of experiment IDs to variant keys.
   *
   * @example
   * ```typescript
   * const experiments = await getExperiments({ profileId: 'user-123' })
   * // experiments = { 'exp-123': 'variant-a', 'exp-456': 'control' }
   * ```
   */
  async getExperiments(options?: ExperimentOptions, forceRefresh?: boolean): Promise<Record<string, string>> {
    if (!isInBrowser()) {
      return {}
    }

    const requestedProfileId = options?.profileId ?? this.options?.profileId

    // Check cache first - must match profileId and not be expired
    if (!forceRefresh && this.cachedData) {
      const now = Date.now()
      const isSameProfile = this.cachedData.profileId === requestedProfileId
      if (isSameProfile && now - this.cachedData.timestamp < DEFAULT_CACHE_DURATION) {
        return this.cachedData.experiments
      }
    }

    try {
      await this.fetchFlagsAndExperiments(options)
      return this.cachedData?.experiments || {}
    } catch (error) {
      console.warn('[Swetrix] Error fetching experiments:', error)
      return this.cachedData?.experiments || {}
    }
  }

  /**
   * Gets the variant key for a specific A/B test experiment.
   *
   * @param experimentId - The experiment ID.
   * @param options - Options for evaluating the experiment (`profileId` only).
   * @param defaultVariant - Optional default variant key to return if the experiment is not found. Defaults to null.
   * @returns A promise that resolves to the variant key assigned to this user, or defaultVariant if not found.
   *
   * @example
   * ```typescript
   * const variant = await getExperiment('checkout-redesign', { profileId: 'user-123' })
   *
   * // Optional fallback variant:
   * const variantWithFallback = await getExperiment('checkout-redesign', undefined, 'control')
   *
   * if (variant === 'new-checkout') {
   *   // Show new checkout flow
   * } else {
   *   // Show control (original) checkout
   * }
   * ```
   */
  async getExperiment(
    experimentId: string,
    options?: ExperimentOptions,
    defaultVariant: string | null = null,
  ): Promise<string | null> {
    const experiments = await this.getExperiments(options)
    return experiments[experimentId] ?? defaultVariant
  }

  /**
   * Clears the cached experiments (alias for clearFeatureFlagsCache since they share the same cache).
   */
  clearExperimentsCache(): void {
    this.cachedData = null
  }

  /**
   * Gets the anonymous profile ID for the current visitor.
   * If profileId was set via init options, returns that.
   * Otherwise, requests server to generate one from IP/UA hash.
   *
   * This ID can be used for revenue attribution with payment providers.
   *
   * @returns A promise that resolves to the profile ID string, or null on error.
   *
   * @example
   * ```typescript
   * const profileId = await swetrix.getProfileId()
   *
   * // Pass to Paddle Checkout for revenue attribution
   * Paddle.Checkout.open({
   *   items: [{ priceId: 'pri_01234567890', quantity: 1 }],
   *   customData: {
   *     swetrix_profile_id: profileId,
   *     swetrix_session_id: await swetrix.getSessionId()
   *   }
   * })
   * ```
   */
  async getProfileId(): Promise<string | null> {
    // If profileId is already set in options, return it
    if (this.options?.profileId) {
      return this.options.profileId
    }

    if (!isInBrowser()) {
      return null
    }

    try {
      const apiBase = this.getApiBase()
      const response = await fetch(`${apiBase}/log/profile-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pid: this.projectID }),
      })

      if (!response.ok) {
        return null
      }

      const data = (await response.json()) as { profileId: string | null }
      return data.profileId
    } catch {
      return null
    }
  }

  /**
   * Gets the current session ID for the visitor.
   * Session IDs are generated server-side based on IP and user agent.
   *
   * This ID can be used for revenue attribution with payment providers.
   *
   * @returns A promise that resolves to the session ID string, or null on error.
   *
   * @example
   * ```typescript
   * const sessionId = await swetrix.getSessionId()
   *
   * // Pass to Paddle Checkout for revenue attribution
   * Paddle.Checkout.open({
   *   items: [{ priceId: 'pri_01234567890', quantity: 1 }],
   *   customData: {
   *     swetrix_profile_id: await swetrix.getProfileId(),
   *     swetrix_session_id: sessionId
   *   }
   * })
   * ```
   */
  async getSessionId(): Promise<string | null> {
    if (!isInBrowser()) {
      return null
    }

    try {
      const apiBase = this.getApiBase()
      const response = await fetch(`${apiBase}/log/session-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pid: this.projectID }),
      })

      if (!response.ok) {
        return null
      }

      const data = (await response.json()) as { sessionId: string | null }
      return data.sessionId
    } catch {
      return null
    }
  }

  async startSessionReplay(
    options: SessionReplayOptions = {},
  ): Promise<SessionReplayActions> {
    if (this.sessionReplayActions) {
      return this.sessionReplayActions
    }

    if (this.sessionReplayInitPromise) {
      return this.sessionReplayInitPromise
    }

    const initPromise = this.initialiseSessionReplay(options)
    this.sessionReplayInitPromise = initPromise

    try {
      return await initPromise
    } finally {
      if (this.sessionReplayInitPromise === initPromise) {
        this.sessionReplayInitPromise = null
      }
    }
  }

  private async initialiseSessionReplay(
    options: SessionReplayOptions,
  ): Promise<SessionReplayActions> {
    if (this.sessionReplayActions) {
      return this.sessionReplayActions
    }

    if (!this.canTrack()) {
      return defaultSessionReplayActions
    }

    if (!this.shouldSampleSessionReplay(options.sampleRate)) {
      return defaultSessionReplayActions
    }

    try {
      await this.preloadSessionReplay()
    } catch {
      return defaultSessionReplayActions
    }

    const rrweb = window.rrweb
    if (!rrweb?.record) {
      return defaultSessionReplayActions
    }

    const privacy = this.getSessionReplayPrivacy(options.privacy)
    const replayId = this.createReplayId()
    const started = await this.sendSessionReplayStart(replayId, privacy)

    if (!started) {
      return defaultSessionReplayActions
    }

    const flushIntervalMs =
      typeof options.flushIntervalMs === 'number' && options.flushIntervalMs > 0
        ? options.flushIntervalMs
        : DEFAULT_SESSION_REPLAY_FLUSH_INTERVAL
    const maxEventsPerChunk =
      typeof options.maxEventsPerChunk === 'number' &&
      options.maxEventsPerChunk > 0
        ? Math.floor(options.maxEventsPerChunk)
        : DEFAULT_SESSION_REPLAY_MAX_EVENTS
    const maxDurationMs =
      typeof options.maxDurationMs === 'number' && options.maxDurationMs > 0
        ? options.maxDurationMs
        : null
    const idleTimeoutMs =
      typeof options.idleTimeoutMs === 'number' && options.idleTimeoutMs > 0
        ? options.idleTimeoutMs
        : null

    let chunkIndex = 0
    let stopped = false
    let events: RrwebEvent[] = []
    let flushing = Promise.resolve()
    let maxDurationTimer: ReturnType<typeof setTimeout> | undefined
    let idleTimer: ReturnType<typeof setTimeout> | undefined

    const flush = async (useBeacon = false) => {
      if (!events.length) return

      const chunk = events
      events = []
      const currentChunkIndex = chunkIndex++

      flushing = flushing
        .catch(() => undefined)
        .then(() =>
          this.sendSessionReplayChunk(
            replayId,
            privacy,
            currentChunkIndex,
            chunk,
            useBeacon,
          ),
        )

      await flushing
    }

    const userEmit = options.rrweb?.emit
    const recordOptions = this.getSessionReplayRecordOptions(
      privacy,
      options.rrweb,
      (event) => {
        try {
          userEmit?.(event)
        } catch {}

        events.push(event)
        if (events.length >= maxEventsPerChunk) {
          void flush()
        }
      },
    )

    const stopRecording = rrweb.record(recordOptions)
    const timer = setInterval(() => void flush(), flushIntervalMs)
    const flushOnPageExit = () => void flush(true)
    const flushOnHidden = () => {
      if (document.visibilityState === 'hidden') {
        void flush(true)
      }
    }
    const clearIdleTimer = () => {
      if (idleTimer) {
        clearTimeout(idleTimer)
        idleTimer = undefined
      }
    }
    const stopSessionReplay = async () => {
      if (stopped) return
      stopped = true
      clearInterval(timer)
      if (maxDurationTimer) {
        clearTimeout(maxDurationTimer)
      }
      clearIdleTimer()
      window.removeEventListener('pagehide', flushOnPageExit)
      document.removeEventListener('visibilitychange', flushOnHidden)
      SESSION_REPLAY_ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer)
      })
      stopRecording?.()
      await flush()
      this.sessionReplayActions = null
      this.sessionReplayInitPromise = null
    }
    const resetIdleTimer = () => {
      if (!idleTimeoutMs || stopped) return
      clearIdleTimer()
      idleTimer = setTimeout(() => void stopSessionReplay(), idleTimeoutMs)
    }

    window.addEventListener('pagehide', flushOnPageExit)
    document.addEventListener('visibilitychange', flushOnHidden)

    if (maxDurationMs) {
      maxDurationTimer = setTimeout(
        () => void stopSessionReplay(),
        maxDurationMs,
      )
    }

    if (idleTimeoutMs) {
      SESSION_REPLAY_ACTIVITY_EVENTS.forEach((eventName) => {
        window.addEventListener(eventName, resetIdleTimer, { passive: true })
      })
      resetIdleTimer()
    }

    this.sessionReplayActions = {
      stop: stopSessionReplay,
      flush: async () => {
        await flush()
      },
    }

    return this.sessionReplayActions
  }

  private shouldSampleSessionReplay(sampleRate?: number): boolean {
    if (typeof sampleRate !== 'number') {
      return true
    }

    if (sampleRate <= 0) {
      return false
    }

    if (sampleRate >= 1) {
      return true
    }

    return Math.random() < sampleRate
  }

  private getSessionReplayPrivacy(privacy: unknown): SessionReplayPrivacy {
    return SESSION_REPLAY_PRIVACY_VALUES.includes(
      privacy as SessionReplayPrivacy,
    )
      ? (privacy as SessionReplayPrivacy)
      : DEFAULT_SESSION_REPLAY_PRIVACY
  }

  /**
   * Gets the API base URL (without /log suffix).
   */
  private getApiBase(): string {
    if (this.options?.apiURL) {
      // Remove trailing /log if present
      return this.options.apiURL.replace(/\/log\/?$/, '')
    }
    return DEFAULT_API_BASE
  }

  private heartbeat(): void {
    if (!this.pageViewsOptions?.heartbeatOnBackground && document.visibilityState === 'hidden') {
      return
    }

    const data: { pid: string; profileId?: string } = {
      pid: this.projectID,
    }

    if (this.options?.profileId) {
      data.profileId = this.options.profileId
    }

    this.sendRequest('hb', data)
  }

  // Tracking path changes. If path changes -> calling this.trackPage method
  private trackPathChange(): void {
    if (!this.pageData) return
    const newPath = getPath({
      hash: this.pageViewsOptions?.hash,
      search: this.pageViewsOptions?.search,
    })
    const { path } = this.pageData

    if (path !== newPath) {
      this.trackPage(newPath, false)
    }
  }

  private trackPage(pg: string, unique: boolean = false): void {
    if (!this.pageData) return
    this.pageData.path = pg

    const perf = this.getPerformanceStats()

    this.activePage = pg
    this.submitPageView({ pg }, unique, perf, true)
  }

  submitPageView(
    payload: Partial<IPageViewPayload>,
    unique: boolean,
    perf: IPerfPayload | {},
    evokeCallback?: boolean,
  ): void {
    const privateData = {
      pid: this.projectID,
      perf,
      unique,
    }

    const pvPayload = {
      lc: getLocale(),
      tz: getTimezone(),
      ref: getReferrer(),
      so: getUTMSource(),
      me: getUTMMedium(),
      ca: getUTMCampaign(),
      te: getUTMTerm(),
      co: getUTMContent(),
      qs: getQueryString(),
      profileId: this.options?.profileId,
      ...payload,
    }

    if (evokeCallback && this.pageViewsOptions?.callback) {
      const callbackResult = this.pageViewsOptions.callback(pvPayload as IPageViewPayload)

      if (callbackResult === false) {
        return
      }

      if (callbackResult && typeof callbackResult === 'object') {
        Object.assign(pvPayload, callbackResult)
      }
    }

    Object.assign(pvPayload, privateData)

    this.sendRequest('', pvPayload)
  }

  private canTrack(): boolean {
    if (
      this.options?.disabled ||
      !isInBrowser() ||
      (this.options?.respectDNT && window.navigator?.doNotTrack === '1') ||
      (!this.options?.devMode && isLocalhost()) ||
      isAutomated()
    ) {
      return false
    }

    return true
  }

  private getSessionReplayUrl(): string {
    const replayOption = this.getSessionReplayPreloadOption()
    if (
      replayOption &&
      typeof replayOption === 'object' &&
      replayOption.rrwebUrl
    ) {
      return replayOption.rrwebUrl
    }

    return this.getDefaultSessionReplayUrl()
  }

  private getSessionReplayPreloadOption(): SessionReplayPreloadOption | undefined {
    return this.options?.preloadSessionReplay
  }

  private getDefaultSessionReplayUrl(): string {
    if (!isInBrowser()) {
      return DEFAULT_RRWEB_URL
    }

    const trackerScript = this.getTrackerScript()

    if (trackerScript?.src) {
      const { hostname, pathname } = new URL(trackerScript.src)
      if (
        hostname === 'swetrix.org' &&
        /^\/swetrix(\.min)?\.js$/i.test(pathname)
      ) {
        return DEFAULT_RRWEB_URL
      }

      return new URL(DEFAULT_RRWEB_FILE, trackerScript.src).toString()
    }

    return DEFAULT_RRWEB_URL
  }

  private getTrackerScript(): HTMLScriptElement | undefined {
    const trackerScript = Array.from(document.scripts).find((script) => {
      if (!script.src) {
        return false
      }

      try {
        const { pathname } = new URL(script.src)
        return /(^|\/)swetrix(\.min)?\.js$/i.test(pathname)
      } catch {
        return false
      }
    })

    return trackerScript
  }

  private preloadSessionReplay(): Promise<void> {
    if (!isInBrowser()) {
      return Promise.resolve()
    }

    if (window.rrweb?.record) {
      return Promise.resolve()
    }

    if (this.rrwebLoader) {
      return this.rrwebLoader
    }

    if (window.__SWETRIX_RRWEB_LOADING__) {
      this.rrwebLoader = window.__SWETRIX_RRWEB_LOADING__
      void this.rrwebLoader.catch(() => {
        if (window.__SWETRIX_RRWEB_LOADING__ === this.rrwebLoader) {
          delete window.__SWETRIX_RRWEB_LOADING__
        }
        this.rrwebLoader = null
      })
      return this.rrwebLoader
    }

    this.rrwebLoader = this.loadSessionReplayRecorder()

    window.__SWETRIX_RRWEB_LOADING__ = this.rrwebLoader
    const loader = this.rrwebLoader
    void loader.catch(() => {
      if (window.__SWETRIX_RRWEB_LOADING__ === loader) {
        delete window.__SWETRIX_RRWEB_LOADING__
      }
      if (this.rrwebLoader === loader) {
        this.rrwebLoader = null
      }
    })

    return this.rrwebLoader
  }

  private async loadSessionReplayRecorder(): Promise<void> {
    const replayOption = this.getSessionReplayPreloadOption()
    const hasCustomReplayUrl =
      replayOption && typeof replayOption === 'object' && replayOption.rrwebUrl

    if (hasCustomReplayUrl || this.getTrackerScript()) {
      await this.loadSessionReplayScript(this.getSessionReplayUrl())
      return
    }

    if (await this.loadSessionReplayPackage()) {
      return
    }

    await this.loadSessionReplayScript(this.getDefaultSessionReplayUrl())
  }

  private async loadSessionReplayPackage(): Promise<boolean> {
    try {
      const rrwebModule = (await import('rrweb')) as RrwebModule
      const rrweb = rrwebModule.record ? rrwebModule : rrwebModule.default

      if (!rrweb?.record) {
        return false
      }

      window.rrweb = rrweb
      return true
    } catch {
      return false
    }
  }

  private loadSessionReplayScript(url: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.async = true
      script.src = url
      script.crossOrigin = 'anonymous'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load rrweb'))
      document.head.appendChild(script)
    })
  }

  private getSessionReplayRecordOptions(
    privacy: unknown,
    userOptions: RrwebRecordOptions | undefined,
    emit: RrwebEmit,
  ): RrwebRecordOptions {
    const options: RrwebRecordOptions = {
      ...userOptions,
      emit,
    }

    const maskInputOptions =
      typeof options.maskInputOptions === 'object' &&
      options.maskInputOptions !== null
        ? (options.maskInputOptions as Record<string, unknown>)
        : {}

    const resolvedPrivacy = this.getSessionReplayPrivacy(privacy)

    if (resolvedPrivacy === 'total') {
      return {
        ...options,
        maskAllInputs: true,
        maskTextSelector: '*',
        blockSelector: this.mergeSelectors(
          options.blockSelector,
          'img, picture, video, audio, canvas, svg',
        ),
        recordCanvas: false,
        inlineImages: false,
        emit,
      }
    }

    if (resolvedPrivacy === 'normal') {
      return {
        ...options,
        maskAllInputs: true,
        emit,
      }
    }

    return {
      ...options,
      maskInputOptions: {
        ...maskInputOptions,
        password: true,
      },
      emit,
    }
  }

  private mergeSelectors(existing: unknown, required: string): string {
    if (typeof existing === 'string' && existing.trim()) {
      return `${existing}, ${required}`
    }

    return required
  }

  private createReplayId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID()
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }

  private async sendSessionReplayStart(
    replayId: string,
    privacy: SessionReplayPrivacy,
  ): Promise<boolean> {
    try {
      const apiBase = this.getApiBase()
      const response = await fetch(`${apiBase}/log/session-replay/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pid: this.projectID,
          replayId,
          privacy,
          pg:
            this.activePage ||
            getPath({
              hash: this.pageViewsOptions?.hash,
              search: this.pageViewsOptions?.search,
            }),
          lc: getLocale(),
          tz: getTimezone(),
          profileId: this.options?.profileId,
        }),
      })

      return response.ok
    } catch {
      return false
    }
  }

  private async sendSessionReplayChunk(
    replayId: string,
    privacy: SessionReplayPrivacy,
    chunkIndex: number,
    events: RrwebEvent[],
    useBeacon: boolean,
  ): Promise<void> {
    const apiBase = this.getApiBase()
    const url = `${apiBase}/log/session-replay/chunk`
    const payload = JSON.stringify({
      pid: this.projectID,
      replayId,
      privacy,
      chunkIndex,
      events,
    })

    if (useBeacon && typeof navigator.sendBeacon === 'function') {
      const sent = navigator.sendBeacon(
        url,
        new Blob([payload], { type: 'application/json' }),
      )
      if (sent) return
    }

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        keepalive: useBeacon,
        body: payload,
      })
    } catch {}
  }

  private async sendRequest(path: string, body: object): Promise<void> {
    const host = this.options?.apiURL || DEFAULT_API_HOST
    await fetch(`${host}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  }
}
