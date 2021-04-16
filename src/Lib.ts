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

}

export interface PageViewsOptions {
  
}

const defaultOptions: LibOptions = {
  debug: false,
  disabled: false,
  respectDNT: false,
}

export class Lib {
  constructor(private pid: string, private options?: LibOptions) {
    
  }

  // Tracks a custom event
  track(event: TrackEventOptions) {

  }

  // Tracks page views
  trackPageViews(options?: PageViewsOptions) {

  }


}