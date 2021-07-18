import {
  isInBrowser,
  isLocalhost,
  isAutomated,
  getLocale,
  getTimezone,
  getRefferer,
  getUTMCampaign,
  getUTMMedium,
  getUTMSource,
  getPath,
} from './utils'

/**
 * A map of key / value pairs.
 */
interface Map<T> {
  [key: string]: T
}

export interface LibOptions {
  // When set to `true`, all libraries logs (including possible errors) will be
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
  // Unique ID for the event
  id: string

  // Parameters for the event, e.g. { ref: 'duckduckgo', plan: 'gold+' }
  params?: Map<string>
}

export interface PageData {
  // Current URL path
  path: string

  // Object with actions related to tracking page views which are abailable to end user
  actions: object
}

export interface PageViewsOptions {
  
}

const host = 'http://localhost:5005/log'

export class Lib {
  private pageData: PageData | null = null

  constructor(private projectID: string, private options?: LibOptions) {
    
  }

  // Tracks a custom event
  track(event: TrackEventOptions) {
    if (!this.canTrack()) {
      return
    }

    const data = {
      pid: this.projectID,
      ev: event.id,
      params: event.params,
    }
    this.submitData(data)
  }

  // Tracks page views
  trackPageViews(options?: PageViewsOptions) {
    if (!this.canTrack()) {
      return
    }
    if (this.pageData) {
      return this.pageData.actions
    }

    const interval = setInterval(this.trackPathChange, 1000)
    const path = getPath()

    this.pageData = {
      path,
      actions: {
        stop: () => clearInterval(interval)
      }
    }

    this.trackPage(path)
  }

  // Tracking path changes. If path changes -> calling this.trackPage method
  private trackPathChange() {
    if (!this.pageData) return
    const newPath = getPath()
    const { path } = this.pageData

    if (path !== newPath) {
      this.trackPage(newPath)
    }
  }

  private trackPage(pg: string) {
    if (!this.pageData) return
    this.pageData.path = pg

    const data = {
      pid: this.projectID,
      ev: 'pageviews',
      lc: getLocale(),
      tz: getTimezone(),
      ref: getRefferer(),
      so: getUTMSource(),
      me: getUTMMedium(),
      ca: getUTMCampaign(),
      pg,
    }

    this.submitData(data)
  }

  private debug(message: string) {
    if (this.options?.debug) {
      console.log('[Analytics]', message)
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

  private submitData(body: object) {
    return fetch(host, {
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  }
}