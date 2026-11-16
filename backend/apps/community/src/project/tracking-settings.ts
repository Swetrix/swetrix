const defaults = {
  pageviews: true,
  outboundLinks: false,
  errors: false,
  sessionReplay: false,
}

export type TrackingSettings = typeof defaults

export function readTrackingSettings(
  raw: unknown,
  canTrackSessionReplay = true,
): TrackingSettings {
  let settings = raw
  if (typeof settings === 'string') {
    try {
      settings = JSON.parse(settings)
    } catch {
      settings = null
    }
  }

  const saved = settings as Partial<TrackingSettings> | null
  return {
    pageviews: saved?.pageviews !== false,
    outboundLinks: saved?.outboundLinks === true,
    errors: saved?.errors === true,
    sessionReplay: canTrackSessionReplay && saved?.sessionReplay === true,
  }
}

export function isValidTrackingSettings(
  settings: unknown,
): settings is Partial<TrackingSettings> {
  return (
    settings !== null &&
    typeof settings === 'object' &&
    !Array.isArray(settings) &&
    Object.entries(settings).every(
      ([key, value]) =>
        Object.hasOwn(defaults, key) && typeof value === 'boolean',
    )
  )
}
