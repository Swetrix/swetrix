import {
  isInBrowser, isLocalhost, isAutomated, getLocale, getTimezone, getReferrer,
  getUTMCampaign, getUTMMedium, getUTMSource, getPath,
} from './utils'

export interface LibOptions {
  // When set to `true`, all tracking logs will be
  // printed to console and localhost events will be sent to server.
  debug?: boolean

  // When set to `true`, the tracking library won't send any data to server.
  // Useful for development purposes when this value is set based on `.env` var.
  disabled?: boolean

  // By setting this flag to `true`, we will not collect ANY kind of data about the user
  // with the DNT setting.
  respectDNT?: boolean
}

export interface TrackEventOptions {
  // The event name
  ev: string

  // If true, only 1 event with the same ID will be saved per user session
  unique?: boolean
}

export interface PageData {
  // Current URL path
  path: string

  // Object with actions related to tracking page views which are abailable to end user
  actions: object
}

export interface PageViewsOptions {
  // If true, only unique events will be saved
  // This param is useful when tracking single-page landing websites
  unique?: boolean

  // A list of Regular Expressions or string pathes to ignore
  ignore?: Array<any>

  // Do not send Heartbeat requests to the server
  noHeartbeat?: boolean

  // Send Heartbeat requests when the website tab is not active in the browser
  heartbeatOnBackground?: boolean
}

const host = 'https://api.swetrix.com/log'

export class Lib {
  private pageData: PageData | null = null
  private pageViewsOptions: PageViewsOptions | null | undefined = null

  constructor(private projectID: string, private options?: LibOptions) {
    this.trackPathChange = this.trackPathChange.bind(this)
    this.heartbeat = this.heartbeat.bind(this)
  }

  track(event: TrackEventOptions) {
    if (!this.canTrack()) {
      return
    }

    const data = {
      pid: this.projectID,
      ...event,
    }
    this.sendRequest('custom', data)
  }

  trackPageViews(options?: PageViewsOptions) {
    if (!this.canTrack()) {
      return
    }

    if (this.pageData) {
      return this.pageData.actions
    }

    this.pageViewsOptions = options
    let hbInterval: NodeJS.Timeout, interval: NodeJS.Timeout
    if (!options?.unique) {
      interval = setInterval(this.trackPathChange, 2000)
    }

    if (!options?.noHeartbeat) {
      setTimeout(this.heartbeat, 3000)
      hbInterval = setInterval(this.heartbeat, 28000)
    }

    const path = getPath()

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

  private heartbeat() {
    if (!this.pageViewsOptions?.heartbeatOnBackground && document.visibilityState === 'hidden') {
      return
    }

    const data = {
      pid: this.projectID,
    }

    this.sendRequest('hb', data)
  }

  private checkIgnore(path: string): boolean {
    const ignore = this.pageViewsOptions?.ignore

    if (Array.isArray(ignore)) {
      for (let i = 0; i < ignore.length; ++i) {
        if (ignore[i] === path) return true
        if (ignore[i] instanceof RegExp && ignore[i].test(path)) return true
      }
    }
    return false
  }

  // Tracking path changes. If path changes -> calling this.trackPage method
  private trackPathChange() {
    if (!this.pageData) return
    const newPath = getPath()
    const { path } = this.pageData

    if (path !== newPath) {
      this.trackPage(newPath, false)
    }
  }

  private trackPage(pg: string, unique: boolean = false) {
    if (!this.pageData) return
    this.pageData.path = pg

    if (this.checkIgnore(pg)) return

    const data = {
      pid: this.projectID,
      lc: getLocale(),
      tz: getTimezone(),
      ref: getReferrer(),
      so: getUTMSource(),
      me: getUTMMedium(),
      ca: getUTMCampaign(),
      unique,
      pg,
    }

    this.sendRequest('', data)
  }

  private debug(message: string) {
    if (this.options?.debug) {
      console.log('[Swetrix]', message)
    }
  }

  private canTrack() {
    if (!isInBrowser()) {
      this.debug('Tracking disabled: script does not run in browser environment.')
      return false
    }

    if (this.options?.respectDNT && window.navigator?.doNotTrack === '1') {
      this.debug('Tracking disabled: respecting user\'s \'Do Not Track\' preference.')
      return false
    }

    if (!this.options?.debug && isLocalhost()) {
      return false
    }

    if (isAutomated()) {
      this.debug('Tracking disabled: navigation is automated by WebDriver.')
      return false
    }

    return true
  }

  private sendRequest(path: string, body: object) {
    return fetch(`${host}/${path}`, {
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  }
}
