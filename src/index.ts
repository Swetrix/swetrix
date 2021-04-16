import { Lib, LibOptions, TrackEventOptions, PageViewsOptions } from './Lib'

export let LIB_INSTANCE: Lib | null = null

// Initialise the tracking library instance (other methods won't work if the library
// is not initialised)
export function init (pid: string, options?: LibOptions): Lib {
  if (!LIB_INSTANCE) {
    LIB_INSTANCE = new Lib(pid, options)
  }

  return LIB_INSTANCE
}

// Tracks custom events
export function track (event: TrackEventOptions): void {
  if (!LIB_INSTANCE) return

  LIB_INSTANCE.track(event)
}

export function trackViews (options?: PageViewsOptions): void {
  if (!LIB_INSTANCE) return 

  LIB_INSTANCE.trackPageViews(options)
}