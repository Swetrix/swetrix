import fetch from 'node-fetch'
import { isInBrowser } from './utils'

export interface LibOptions {
  /**
   * When set to `true`, all tracking logs will be printed to console.
   */
  devMode?: boolean

  /**
   * When set to `true`, the tracking library won't send any data to server.
   * Useful for development purposes when this value is set based on `.env` var.
   */
  disabled?: boolean

  /**
   * Set a custom URL of the API server (for selfhosted variants of Swetrix).
   */
  apiURL?: string

  /**
   * If set to `true`, only unique events will be saved.
   * This param is useful when tracking single-page landing websites.
   */
  unique?: boolean

  /**
   * Optional profile ID for long-term user tracking.
   * If set, it will be used for all pageviews and events unless overridden per-call.
   */
  profileId?: string
}

export interface TrackEventOptions {
  /**
   * An event identifier you want to track. This has to be a string, which:
   * 1. Contains only English letters (a-Z A-Z), numbers (0-9), underscores (_) and dots (.).
   * 2. Is fewer than 64 characters.
   * 3. Starts with an English letter.
   */
  ev: string

  /** If set to true, only 1 custom event will be saved per session */
  unique?: boolean

  /** A page that user sent data from (e.g. /home) */
  page?: string

  /** A locale of the user (e.g. en-US or uk-UA) */
  lc?: string

  /** A referrer URL (e.g. https://example.com/) */
  ref?: string

  /** A source of the event (e.g. ref, source or utm_source GET parameter) */
  so?: string

  /** A medium of the event (e.g. utm_medium GET parameter) */
  me?: string

  /** A campaign of the event (e.g. utm_campaign GET parameter) */
  ca?: string

  /** Event-related metadata object with string values. */
  meta?: {
    [key: string]: string | number | boolean | null | undefined
  }

  /** Optional profile ID for long-term user tracking. Overrides the global profileId if set. */
  profileId?: string
}

export interface PerformanceMetrics {
  /* DNS Resolution time */
  dns?: number

  /* TLS handshake time */
  tls?: number

  /* Connection time */
  conn?: number

  /* Response Time (Download) */
  response?: number

  /* Browser rendering the HTML page time */
  render?: number

  /* DOM loading timing */
  dom_load?: number

  /* Page load timing */
  page_load?: number

  /* Time to first byte */
  ttfb?: number
}

export interface TrackPageViewOptions {
  /**
   * Visitor's timezone (used as a backup in case IP geolocation fails). I.e. if it's set to Europe/Kiev and IP geolocation fails, we will set the country of this entry to Ukraine)
   */
  tz?: string

  /** A page to record the pageview event for (e.g. /home). All our scripts send the pg string with a slash (/) at the beginning, it's not a requirement but it's best to do the same so the data would be consistent when used together with our official scripts */
  pg?: string

  /** A locale of the user (e.g. en-US or uk-UA) */
  lc?: string

  /** A referrer URL (e.g. https://example.com/) */
  ref?: string

  /** A source of the pageview (e.g. ref, source or utm_source GET parameter) */
  so?: string

  /** A medium of the pageview (e.g. utm_medium GET parameter) */
  me?: string

  /** A campaign of the pageview (e.g. utm_campaign GET parameter) */
  ca?: string

  /** If set to true, only unique visits will be saved */
  unique?: boolean

  /** An object with performance metrics related to the page load. See Performance metrics for more details */
  perf?: PerformanceMetrics

  /** Pageview-related metadata object with string values. */
  meta?: {
    [key: string]: string | number | boolean | null | undefined
  }

  /** Optional profile ID for long-term user tracking. Overrides the global profileId if set. */
  profileId?: string
}

export interface TrackErrorOptions {
  /**
   * Error name (e.g. ParseError).
   */
  name: string

  /**
   * Error message (e.g. Malformed input).
   */
  message?: string | null

  /**
   * On what line in your code did the error occur (e.g. 1520)
   */
  lineno?: number | null

  /**
   * On what column in your code did the error occur (e.g. 26)
   */
  colno?: number | null

  /**
   * In what file did the error occur (e.g. https://example.com/broken.js)
   */
  filename?: string | null

  /**
   * Stack trace of the error.
   */
  stackTrace?: string | null

  /**
   * Visitor's timezone (used as a backup in case IP geolocation fails).
   */
  tz?: string

  /** A locale of the user (e.g. en-US or uk-UA) */
  lc?: string

  /** A page to record the error event for (e.g. /home) */
  pg?: string

  /** Error-related metadata object with string values. */
  meta?: {
    [key: string]: string | number | boolean | null | undefined
  }
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

const DEFAULT_API_HOST = 'https://api.swetrix.com/log'
const DEFAULT_API_BASE = 'https://api.swetrix.com'

/**
 * Server-side implementation of Swetrix tracking library.
 *
 * @param projectID Your project ID (you can find it in the project settings)
 * @param options LibOptions
 */
export class Swetrix {
  constructor(private projectID: string, private options?: LibOptions) {
    this.heartbeat = this.heartbeat.bind(this)
  }

  /**
   * This function is used to send custom events (implements https://docs.swetrix.com/events-api#post-logcustom).
   *
   * @param ip IP address of the visitor
   * @param userAgent User agent of the visitor
   * @param event TrackEventOptions
   * @returns Promise<void>
   */
  public async track(ip: string, userAgent: string, event: TrackEventOptions): Promise<void> {
    if (!this.canTrack()) {
      return
    }

    const data = {
      pid: this.projectID,
      profileId: event.profileId ?? this.options?.profileId,
      ...event,
    }
    await this.sendRequest('custom', ip, userAgent, data)
  }

  /**
   * This function is used to send pageview events (implements https://docs.swetrix.com/events-api#post-log).
   *
   * @param ip IP address of the visitor
   * @param userAgent User agent of the visitor
   * @param pageview TrackPageViewOptions
   * @returns Promise<void>
   */
  public async trackPageView(ip: string, userAgent: string, pageview?: TrackPageViewOptions): Promise<void> {
    if (!this.canTrack()) {
      return
    }

    const data = {
      pid: this.projectID,
      profileId: pageview?.profileId ?? this.options?.profileId,
      ...(pageview || {}),
    }

    await this.sendRequest('', ip, userAgent, data)
  }

  /**
   * This function is used to track an error event.
   * It's useful if you want to track specific errors in your application.
   *
   * @param ip IP address of the visitor
   * @param userAgent User agent of the visitor
   * @param error TrackErrorOptions
   * @returns Promise<void>
   */
  public async trackError(ip: string, userAgent: string, error?: TrackErrorOptions): Promise<void> {
    if (!this.canTrack()) {
      return
    }

    const data = {
      pid: this.projectID,
      ...(error || {}),
    }

    await this.sendRequest('error', ip, userAgent, data)
  }

  /**
   * This function is used to send heartbeat events (implements https://docs.swetrix.com/events-api#post-loghb).
   * Heartbeat events are used to determine if the user session is still active.
   * This allows you to see the 'Live Visitors' counter in the Dashboard panel.
   * It's recommended to send heartbeat events every 30 seconds.
   * We also extend the session lifetime after receiving a pageview or custom event.
   *
   * @param ip IP address of the visitor
   * @param userAgent User agent of the visitor
   * @returns Promise<void>
   */
  public async heartbeat(ip: string, userAgent: string): Promise<void> {
    if (!this.canTrack()) {
      return
    }

    const data: { pid: string; profileId?: string } = {
      pid: this.projectID,
    }

    if (this.options?.profileId) {
      data.profileId = this.options.profileId
    }

    await this.sendRequest('hb', ip, userAgent, data)
  }

  /**
   * Fetches all feature flags for the project.
   *
   * @param ip IP address of the visitor
   * @param userAgent User agent of the visitor
   * @param options Options for evaluating feature flags (profileId).
   * @returns A promise that resolves to a record of flag keys to boolean values.
   *
   * @example
   * ```typescript
   * const flags = await swetrix.getFeatureFlags('192.155.52.12', 'Mozilla/5.0...', {
   *   profileId: 'user-123'
   * })
   *
   * if (flags['new-checkout']) {
   *   // Show new checkout flow
   * }
   * ```
   */
  public async getFeatureFlags(
    ip: string,
    userAgent: string,
    options?: FeatureFlagsOptions,
  ): Promise<Record<string, boolean>> {
    try {
      const data = await this.fetchFlagsAndExperiments(ip, userAgent, options)
      return data.flags
    } catch (error) {
      this.debug(`Error fetching feature flags: ${error}`, true)
      return {}
    }
  }

  /**
   * Gets the value of a single feature flag.
   *
   * @param key The feature flag key.
   * @param ip IP address of the visitor
   * @param userAgent User agent of the visitor
   * @param options Options for evaluating the feature flag (profileId).
   * @param defaultValue Default value to return if the flag is not found. Defaults to false.
   * @returns A promise that resolves to the boolean value of the flag.
   *
   * @example
   * ```typescript
   * const isEnabled = await swetrix.getFeatureFlag('dark-mode', '192.155.52.12', 'Mozilla/5.0...', { profileId: 'user-123' })
   *
   * if (isEnabled) {
   *   // Enable dark mode
   * }
   * ```
   */
  public async getFeatureFlag(
    key: string,
    ip: string,
    userAgent: string,
    options?: FeatureFlagsOptions,
    defaultValue: boolean = false,
  ): Promise<boolean> {
    const flags = await this.getFeatureFlags(ip, userAgent, options)
    return flags[key] ?? defaultValue
  }

  /**
   * Fetches all A/B test experiments for the project.
   *
   * @param ip IP address of the visitor
   * @param userAgent User agent of the visitor
   * @param options Options for evaluating experiments.
   * @returns A promise that resolves to a record of experiment IDs to variant keys.
   *
   * @example
   * ```typescript
   * const experiments = await swetrix.getExperiments('192.155.52.12', 'Mozilla/5.0...')
   * // experiments = { 'exp-123': 'variant-a', 'exp-456': 'control' }
   *
   * // Use the assigned variant
   * const checkoutVariant = experiments['checkout-experiment-id']
   * if (checkoutVariant === 'new-checkout') {
   *   showNewCheckout()
   * } else {
   *   showOriginalCheckout()
   * }
   * ```
   */
  public async getExperiments(
    ip: string,
    userAgent: string,
    options?: ExperimentOptions,
  ): Promise<Record<string, string>> {
    try {
      const data = await this.fetchFlagsAndExperiments(ip, userAgent, options)
      return data.experiments
    } catch (error) {
      this.debug(`Error fetching experiments: ${error}`, true)
      return {}
    }
  }

  /**
   * Gets the variant key for a specific A/B test experiment.
   *
   * @param experimentId The experiment ID.
   * @param ip IP address of the visitor
   * @param userAgent User agent of the visitor
   * @param options Options for evaluating the experiment.
   * @param defaultVariant Default variant key to return if the experiment is not found. Defaults to null.
   * @returns A promise that resolves to the variant key assigned to this user, or defaultVariant if not found.
   *
   * @example
   * ```typescript
   * const variant = await swetrix.getExperiment('checkout-redesign-experiment-id', '192.155.52.12', 'Mozilla/5.0...')
   *
   * if (variant === 'new-checkout') {
   *   // Show new checkout flow
   *   showNewCheckout()
   * } else if (variant === 'control') {
   *   // Show original checkout (control group)
   *   showOriginalCheckout()
   * } else {
   *   // Experiment not running or user not included
   *   showOriginalCheckout()
   * }
   * ```
   */
  public async getExperiment(
    experimentId: string,
    ip: string,
    userAgent: string,
    options?: ExperimentOptions,
    defaultVariant: string | null = null,
  ): Promise<string | null> {
    const experiments = await this.getExperiments(ip, userAgent, options)
    return experiments[experimentId] ?? defaultVariant
  }

  /**
   * Gets the anonymous profile ID for a visitor.
   * If profileId was set via constructor options, returns that.
   * Otherwise, requests server to generate one from IP/UA hash.
   *
   * This ID can be used for revenue attribution with payment providers like Paddle.
   *
   * @param ip IP address of the visitor
   * @param userAgent User agent of the visitor
   * @returns A promise that resolves to the profile ID string, or null on error.
   *
   * @example
   * ```typescript
   * const profileId = await swetrix.getProfileId('192.155.52.12', 'Mozilla/5.0...')
   *
   * // Pass to Paddle Checkout for revenue attribution
   * // customData: { swetrix_profile_id: profileId }
   * ```
   */
  public async getProfileId(ip: string, userAgent: string): Promise<string | null> {
    // If profileId is already set in options, return it
    if (this.options?.profileId) {
      return this.options.profileId
    }

    try {
      const apiBase = this.getApiBase()
      const response = await fetch(`${apiBase}/log/profile-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-IP-Address': ip,
          'User-Agent': userAgent,
        },
        body: JSON.stringify({ pid: this.projectID }),
      })

      if (!response.ok) {
        return null
      }

      const data = (await response.json()) as { profileId: string | null }
      return data.profileId
    } catch (error) {
      this.debug(`Error fetching profile ID: ${error}`, true)
      return null
    }
  }

  /**
   * Gets the current session ID for the visitor.
   * Session IDs are generated server-side based on IP and user agent.
   *
   * This ID can be used for revenue attribution with payment providers like Paddle.
   *
   * @param ip IP address of the visitor
   * @param userAgent User agent of the visitor
   * @returns A promise that resolves to the session ID string, or null on error.
   *
   * @example
   * ```typescript
   * const sessionId = await swetrix.getSessionId('192.155.52.12', 'Mozilla/5.0...')
   *
   * // Pass to Paddle Checkout for revenue attribution
   * // customData: { swetrix_session_id: sessionId }
   * ```
   */
  public async getSessionId(ip: string, userAgent: string): Promise<string | null> {
    try {
      const apiBase = this.getApiBase()
      const response = await fetch(`${apiBase}/log/session-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-IP-Address': ip,
          'User-Agent': userAgent,
        },
        body: JSON.stringify({ pid: this.projectID }),
      })

      if (!response.ok) {
        return null
      }

      const data = (await response.json()) as { sessionId: string | null }
      return data.sessionId
    } catch (error) {
      this.debug(`Error fetching session ID: ${error}`, true)
      return null
    }
  }

  private async fetchFlagsAndExperiments(
    ip: string,
    userAgent: string,
    options?: FeatureFlagsOptions | ExperimentOptions,
  ): Promise<{ flags: Record<string, boolean>; experiments: Record<string, string> }> {
    const apiBase = this.getApiBase()
    const body: { pid: string; profileId?: string } = {
      pid: this.projectID,
    }

    const profileId = options?.profileId ?? this.options?.profileId
    if (profileId) {
      body.profileId = profileId
    }

    const response = await fetch(`${apiBase}/feature-flag/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-IP-Address': ip,
        'User-Agent': userAgent,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      this.debug(`Failed to fetch feature flags and experiments: ${response.status}`, true)
      return { flags: {}, experiments: {} }
    }

    const data = (await response.json()) as {
      flags: Record<string, boolean>
      experiments?: Record<string, string>
    }

    return {
      flags: data.flags || {},
      experiments: data.experiments || {},
    }
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

  private debug(message: string, force?: boolean): void {
    if (this.options?.devMode || force) {
      console.log('[Swetrix]', message)
    }
  }

  private canTrack(): boolean {
    if (this.options?.disabled) {
      this.debug("Tracking disabled: the 'disabled' setting is set to true.")
      return false
    }

    if (isInBrowser()) {
      this.debug('Tracking disabled: script runs in browser environment.')
      return false
    }

    return true
  }

  private async sendRequest(path: string, ip: string, userAgent: string, body: object): Promise<void> {
    const link = this.options?.apiURL || DEFAULT_API_HOST
    const postData = JSON.stringify(body)

    const headers = {
      'Content-Type': 'application/json',
      'X-Client-IP-Address': ip,
      'User-Agent': userAgent,
    }

    try {
      const response = await fetch(`${link}/${path}`, {
        method: 'POST',
        headers,
        body: postData,
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }
    } catch (reason) {
      this.debug(`Error while sending request: ${reason}`, true)
      this.debug(`Request link: ${link}`, true)
      this.debug(`Request path: /${path}`, true)
      this.debug(`Request body: ${JSON.stringify(body, null, 2)}`, true)
    }
  }
}
