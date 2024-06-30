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
    [key: string]: string
  }
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

  /** Previous page user was on */
  prev?: string

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
    [key: string]: string
  }
}

export interface TrackErrorOptions {
  /**
   * Error name (e.g. ParseError).
   */
  name: string

  /**
   * Error message (e.g. Malformed input).
   */
  message: string | null | undefined

  /**
   * On what line in your code did the error occur (e.g. 1520)
   */
  lineno: number | null | undefined

  /**
   * On what column in your code did the error occur (e.g. 26)
   */
  colno: number | null | undefined

  /**
   * In what file did the error occur (e.g. https://example.com/broken.js)
   */
  filename: string | null | undefined
}

const DEFAULT_API_HOST = 'https://api.swetrix.com/log'

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
   * This function is used to send custom events (implements https://docs.swetrix.com/events-api#post-loghb).
   *
   * @param ip IP address of the visitor
   * @param userAgent User agent of the visitor
   * @param event TrackEventOptions
   * @returns void
   */
  public track(ip: string, userAgent: string, event: TrackEventOptions): void {
    if (!this.canTrack()) {
      return
    }

    const data = {
      pid: this.projectID,
      ...event,
    }
    this.sendRequest('custom', ip, userAgent, data)
  }

  /**
   * This function is used to send pageview events (implements https://docs.swetrix.com/events-api#post-loghb).
   *
   * @param ip IP address of the visitor
   * @param userAgent User agent of the visitor
   * @param pageview TrackPageViewOptions
   * @returns void
   */
  public trackPageView(ip: string, userAgent: string, pageview?: TrackPageViewOptions) {
    if (!this.canTrack()) {
      return
    }

    const data = {
      pid: this.projectID,
      ...(pageview || {}),
    }

    this.sendRequest('', ip, userAgent, data)
  }

  /**
   * This function is used to track an error event.
   * It's useful if you want to track specific errors in your application.
   *
   * @param ip IP address of the visitor
   * @param userAgent User agent of the visitor
   * @param error TrackErrorOptions | Pick<TrackPageViewOptions, 'tz' | 'lc' | 'pg'>
   * @returns void
   */
  public trackError(
    ip: string,
    userAgent: string,
    error?: TrackErrorOptions | Pick<TrackPageViewOptions, 'tz' | 'lc' | 'pg'>,
  ) {
    if (!this.canTrack()) {
      return
    }

    const data = {
      pid: this.projectID,
      ...(error || {}),
    }

    this.sendRequest('error', ip, userAgent, data)
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
   * @returns void
   */
  public heartbeat(ip: string, userAgent: string): void {
    if (!this.canTrack()) {
      return
    }

    const data = {
      pid: this.projectID,
    }
    this.sendRequest('hb', ip, userAgent, data)
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
